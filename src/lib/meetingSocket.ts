// Live-meeting socket + WebRTC helper.
//
// Talks to the server's MeetingRtcGateway via socket.io and runs a simple
// peer-to-peer mesh of RTCPeerConnections — one per remote participant.
// Mesh topology is fine for small board meetings (≤ ~6 attendees); past
// that we'd want an SFU, but that's a separate effort.
//
// What it does:
//   1. Open a socket connection.
//   2. Emit `join-room` and remember the participants returned by the
//      server.
//   3. For each existing participant, create an RTCPeerConnection and
//      send a WebRTC offer through the socket. For each new participant
//      that joins after us, wait for their offer and answer it.
//   4. Wire incoming media tracks into a per-userId stream map so the
//      React layer can render <video> elements for each.
//   5. Surface chat messages, mute/video state, raise-hand state.
//   6. On leave / unmount: stop tracks, close peers, leave the room.

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface Participant {
  userId: string;
  peerId?: string;
  socketId?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenShareEnabled?: boolean;
  isHandRaised?: boolean;
  sessionRole?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: number;
}

export interface UseMeetingSocketArgs {
  url: string;
  sessionId: string | null;
  userId: string;
  organisationId: string;
  peerId: string;
  /** Local stream from getUserMedia, attached to every outgoing peer. */
  localStream: MediaStream | null;
  /** Don't connect until ready (e.g. before the user clicks Join). */
  enabled: boolean;
}

export interface UseMeetingSocketReturn {
  connected: boolean;
  participants: Participant[];
  remoteStreams: Map<string, MediaStream>;
  chatMessages: ChatMessage[];
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  toggleScreenShare: (enabled: boolean) => void;
  raiseHand: (raised: boolean) => void;
  sendChat: (message: string) => void;
  leave: () => void;
}

// Per-userId state we keep outside React so it persists across renders
// without churn. `peerConnections` keys by remote socketId because the
// signalling protocol routes by socket. `remoteStreams` keys by userId
// because that's what the UI actually wants to display.
interface PeerEntry {
  pc: RTCPeerConnection;
  userId: string;
}

export function useMeetingSocket(args: UseMeetingSocketArgs): UseMeetingSocketReturn {
  const { url, sessionId, userId, organisationId, peerId, localStream, enabled } = args;

  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(() => new Map());

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map()); // by socketId
  const localStreamRef = useRef<MediaStream | null>(localStream);

  // Keep the latest local stream in a ref so socket callbacks (which close
  // over the initial value) always grab the current tracks.
  useEffect(() => {
    localStreamRef.current = localStream;
    // If a peer connection already exists and the stream changes (e.g.
    // user toggles camera), replace the outgoing tracks.
    if (!localStream) return;
    for (const { pc } of peersRef.current.values()) {
      const senders = pc.getSenders();
      for (const track of localStream.getTracks()) {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track).catch(() => undefined);
        else        pc.addTrack(track, localStream);
      }
    }
  }, [localStream]);

  const createPeerConnection = useCallback((remoteSocketId: string, remoteUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    // Attach our outgoing tracks.
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    // ICE candidates → signal across.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          targetSocketId: remoteSocketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Remote tracks arrive here. Group by remote userId so multiple
    // tracks (audio + video) end up on the same MediaStream — otherwise
    // each track gets its own <video> and the audio/video won't sync.
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        const existing = next.get(remoteUserId);
        if (existing) {
          // Don't add the same track twice; replace by kind.
          existing.getTracks()
            .filter((t) => t.kind === event.track.kind)
            .forEach((t) => existing.removeTrack(t));
          existing.addTrack(event.track);
        } else {
          const ms = new MediaStream([event.track]);
          next.set(remoteUserId, ms);
        }
        return next;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // Best-effort cleanup; the participant-left handler will repeat
        // it if the disconnect was peer-initiated.
        peersRef.current.delete(remoteSocketId);
      }
    };

    peersRef.current.set(remoteSocketId, { pc, userId: remoteUserId });
    return pc;
  }, []);

  // Bring up the socket whenever we're enabled and have a session id.
  useEffect(() => {
    if (!enabled || !sessionId || !userId || !organisationId) return;

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { sessionId, userId, organisationId, peerId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room-participants', async (payload: { participants: Participant[] }) => {
      // Server returns everyone currently in the room — including us, in
      // some implementations. Filter ourselves out for the UI list, and
      // initiate WebRTC to the others as the polite peer (we're newest).
      const others = (payload.participants ?? []).filter((p) => p.userId !== userId);
      setParticipants(others);

      for (const p of others) {
        if (!p.socketId) continue;
        if (peersRef.current.has(p.socketId)) continue;
        const pc = createPeerConnection(p.socketId, p.userId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', {
            targetUserId: p.userId,
            targetSocketId: p.socketId,
            offer,
          });
        } catch (err) {
          console.error('Failed to initiate offer:', err);
        }
      }
    });

    socket.on('participant-joined', (data: { userId: string; peerId: string; socketId: string }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, peerId: data.peerId, socketId: data.socketId, audioEnabled: true, videoEnabled: true }];
      });
      // The newcomer initiates the offer (they joined last). We just
      // create the peer connection placeholder on demand below when the
      // offer lands. Nothing else to do here.
    });

    socket.on('webrtc-offer', async (data: { fromUserId: string; fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      try {
        let entry = peersRef.current.get(data.fromSocketId);
        if (!entry) {
          const pc = createPeerConnection(data.fromSocketId, data.fromUserId);
          entry = { pc, userId: data.fromUserId };
        }
        await entry.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          targetSocketId: data.fromSocketId,
          answer,
        });
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    });

    socket.on('webrtc-answer', async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const entry = peersRef.current.get(data.fromSocketId);
      if (!entry) return;
      try {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) {
        console.error('Failed to handle answer:', err);
      }
    });

    socket.on('ice-candidate', async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const entry = peersRef.current.get(data.fromSocketId);
      if (!entry) return;
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        // Failures here are usually harmless (candidate arrived before
        // remote description) — log but don't surface.
        console.debug('ICE candidate add failed:', err);
      }
    });

    socket.on('participant-left', (data: { userId: string; socketId: string }) => {
      const entry = peersRef.current.get(data.socketId);
      if (entry) {
        try { entry.pc.close(); } catch { /* noop */ }
        peersRef.current.delete(data.socketId);
      }
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
      setRemoteStreams((prev) => {
        if (!prev.has(data.userId)) return prev;
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on('participant-audio-toggled', (data: { userId: string; audioEnable: boolean }) => {
      setParticipants((prev) => prev.map((p) => (p.userId === data.userId ? { ...p, audioEnabled: data.audioEnable } : p)));
    });

    socket.on('participant-video-toggled', (data: { userId: string; videoEnabled: boolean }) => {
      setParticipants((prev) => prev.map((p) => (p.userId === data.userId ? { ...p, videoEnabled: data.videoEnabled } : p)));
    });

    socket.on('participant-screen-share-toggled', (data: { userId: string; screenShareEnabled: boolean }) => {
      setParticipants((prev) => prev.map((p) => (p.userId === data.userId ? { ...p, screenShareEnabled: data.screenShareEnabled } : p)));
    });

    socket.on('participant-hand-raised', (data: { userId: string; isHandRaised: boolean }) => {
      setParticipants((prev) => prev.map((p) => (p.userId === data.userId ? { ...p, isHandRaised: data.isHandRaised } : p)));
    });

    socket.on('chat-message', (data: { userId: string; message: string; timestamp: number }) => {
      setChatMessages((prev) => [
        ...prev,
        { id: `${data.userId}-${data.timestamp}-${Math.random().toString(36).slice(2, 7)}`, ...data },
      ]);
    });

    return () => {
      // Tear down peers + socket on unmount.
      for (const { pc } of peersRef.current.values()) {
        try { pc.close(); } catch { /* noop */ }
      }
      peersRef.current.clear();
      socket.emit('leave-room', { sessionId, userId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, sessionId, userId, organisationId, peerId, url, createPeerConnection]);

  const toggleAudio = useCallback((audioEnable: boolean) => {
    const stream = localStreamRef.current;
    if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = audioEnable));
    socketRef.current?.emit('toggle-audio', { audioEnable });
  }, []);

  const toggleVideo = useCallback((videoEnabled: boolean) => {
    const stream = localStreamRef.current;
    if (stream) stream.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
    socketRef.current?.emit('toggle-video', { videoEnabled });
  }, []);

  const toggleScreenShare = useCallback((screenShareEnabled: boolean) => {
    socketRef.current?.emit('toggle-screen-share', { screenShareEnabled });
  }, []);

  const raiseHand = useCallback((isHandRaised: boolean) => {
    socketRef.current?.emit('raise-hand', { isHandRaised });
  }, []);

  const sendChat = useCallback((message: string) => {
    if (!message.trim()) return;
    socketRef.current?.emit('chat-message', { message: message.trim(), timestamp: Date.now() });
  }, []);

  const leave = useCallback(() => {
    socketRef.current?.emit('leave-room', { sessionId, userId });
    for (const { pc } of peersRef.current.values()) {
      try { pc.close(); } catch { /* noop */ }
    }
    peersRef.current.clear();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
  }, [sessionId, userId]);

  return {
    connected,
    participants,
    remoteStreams,
    chatMessages,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    raiseHand,
    sendChat,
    leave,
  };
}
