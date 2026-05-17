'use client';

// LiveMeeting page — a working real-time video room backed by the existing
// MeetingRtcGateway on the server. P2P WebRTC mesh (good for small board
// meetings), socket.io for signalling + chat, REST for session lifecycle.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Hand,
  MessageSquare, Users, Send, Loader2, ArrowLeft, AlertTriangle,
  Sparkles, Wifi, X, Maximize2, Minimize2, CircleDot,
  ScreenShare, ScreenShareOff, Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import apiClient from '@/api/client';
import { authService } from '@/api/services';
import {
  useMeetingSocket,
  type Participant,
  type ChatMessage,
} from '@/lib/meetingSocket';

// Backend exposes the meeting-session REST surface under /meetings/...
// (controller path `meetings`). Keep these literal so we don't depend on
// changes to the global endpoint config.
const SESSIONS = {
  ACTIVE: (meetingId: string) => `/meetings/${meetingId}/session`,
  CREATE: '/meetings/sessions',
  START:  (sessionId: string) => `/meetings/sessions/${sessionId}/start`,
  END:    (sessionId: string) => `/meetings/sessions/${sessionId}/end`,
};

interface SessionInfo {
  id: string;
  meetingId: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
}

interface EmojiReaction {
  id: string;
  emoji: string;
  userId: string;
  timestamp: number;
}

// Popular emoji reactions for meetings
const EMOJI_REACTIONS = [
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laughing' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '🙌', label: 'Hands Up' },
  { emoji: '👏', label: 'Clapping' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '💡', label: 'Idea' },
];

function unwrapData<T>(raw: unknown): T | null {
  if (!raw) return null;
  const r = raw as Record<string, unknown>;
  if (r.data && typeof r.data === 'object') {
    const inner = (r.data as Record<string, unknown>).data;
    if (inner && typeof inner === 'object') return inner as T;
    return r.data as T;
  }
  return raw as T;
}

// Backend entity uses `sessionId` / `sessionStatus`; this page (and the
// signalling hook) expect `id` / `status`. Normalise on read so the rest of
// the component can stay shape-agnostic. Without this, every `session.id`
// reference was undefined, which is what produced the "Server did not return
// a session id" error from `handleStartSession`.
function normaliseSession(raw: unknown): SessionInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const id = (s.id ?? s.sessionId) as string | undefined;
  if (!id) return null;
  const startedAt = s.startedAt instanceof Date ? s.startedAt.toISOString() : (s.startedAt as string | undefined);
  const endedAt   = s.endedAt   instanceof Date ? s.endedAt.toISOString()   : (s.endedAt   as string | undefined);
  return {
    id,
    meetingId: (s.meetingId as string) ?? '',
    status: (s.status ?? s.sessionStatus) as string | undefined,
    startedAt,
    endedAt,
  };
}

// Stable, short random id for our `peerId` — the server stores it but we
// don't currently use it for routing. Used to disambiguate sockets per
// user when the same user opens two tabs.
function makePeerId(): string {
  return `peer-${Math.random().toString(36).slice(2, 10)}`;
}

// Socket.io connects to the bare backend origin (no /api/v1 prefix). The
// gateway is mounted at the server root.
function socketBaseUrl(): string {
  // Vite injects VITE_API_URL at build time. Strip a trailing slash so
  // socket.io appends its namespace cleanly.
  const raw = import.meta.env.VITE_API_URL ?? '';
  return raw.replace(/\/+$/, '');
}

export default function LiveMeeting() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/meetings/live/:id');
  const meetingId = params?.id ?? '';

  const me = useMemo(() => authService.getUser(), []);
  const userId = me?.userId ?? '';
  const organisationId = (me as { organisationId?: string } | null)?.organisationId ?? '';
  const peerId = useMemo(makePeerId, []);
  const myDisplayName = me
    ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.email || 'You'
    : 'You';
  const myInitials = (me?.firstName?.[0] ?? '') + (me?.lastName?.[0] ?? '') || 'U';

  // ── Session lifecycle ────────────────────────────────────────────────
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const fetchActiveSession = useCallback(async () => {
    if (!meetingId) return;
    setSessionLoading(true);
    setSessionError(null);
    try {
      const res = await apiClient.get(SESSIONS.ACTIVE(meetingId));
      const data = normaliseSession(unwrapData<unknown>(res.data));
      setSession(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setSession(null); // legitimately no active session yet
      } else {
        const msg = (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ?? (err as Error)?.message ?? 'Failed to fetch session';
        setSessionError(msg);
      }
    } finally {
      setSessionLoading(false);
    }
  }, [meetingId]);

  useEffect(() => { fetchActiveSession(); }, [fetchActiveSession]);

  const [creatingSession, setCreatingSession] = useState(false);
  const handleStartSession = async () => {
    if (creatingSession) return;
    setCreatingSession(true);
    try {
      const create = await apiClient.post(SESSIONS.CREATE, { meetingId });
      const created = normaliseSession(unwrapData<unknown>(create.data));
      if (!created?.id) throw new Error('Server did not return a session id');
      try { await apiClient.post(SESSIONS.START(created.id), {}); } catch { /* tolerate already-started */ }
      setSession({ ...created, status: 'active' });
      toast.success('Meeting session started');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? (err as Error)?.message ?? 'Could not start session';
      toast.error(msg);
    } finally {
      setCreatingSession(false);
    }
  };

  // ── Pre-join: get user media first so they can preview themselves ───
  const [stage, setStage] = useState<'prejoin' | 'in-meeting'>('prejoin');

  // Real-time "session started" discovery for participants who beat the host
  // to the room. Poll the active-session endpoint every 4s while we're past
  // the loading phase, no session is live yet, and the user hasn't joined.
  // Stops as soon as a session appears, an error is shown, or the user joins.
  useEffect(() => {
    if (sessionLoading || session || sessionError) return;
    if (stage !== 'prejoin') return;
    const id = window.setInterval(fetchActiveSession, 4000);
    return () => window.clearInterval(id);
  }, [sessionLoading, session, sessionError, stage, fetchActiveSession]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [showEmojiReactions, setShowEmojiReactions] = useState(false);
  const [recentReactions, setRecentReactions] = useState<EmojiReaction[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // We screen-share by swapping the outgoing video track for a display-capture
  // track. The hook re-syncs senders whenever `localStream` identity changes,
  // so screen-share is just "build a new MediaStream and setLocalStream".
  // Keep the *camera* stream around so we can restore it when the user stops.
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Open camera+mic once on mount. The user can disable either side
  // before joining; we keep the tracks but flip `enabled`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setLocalStream(stream);
        setVideoEnabled(true);
        setMediaError(null);
      } catch (err) {
        const msg = (err as Error)?.message ?? 'Could not access camera or microphone';
        setMediaError(msg);
        setVideoEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tear down camera/screen on unmount via refs. The original implementation
  // used `localStream` with `[]` deps, which captured the *initial* null and
  // never stopped anything when the user navigated away via the back button —
  // leaving the camera light on after leaving the page.
  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
  }, []);

  // Wire the stream into the local <video> preview whenever it exists.
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, stage]);

  // ── Socket / WebRTC ─────────────────────────────────────────────────
  const meeting = useMeetingSocket({
    url: socketBaseUrl(),
    sessionId: session?.id ?? null,
    userId,
    organisationId,
    peerId,
    localStream,
    enabled: stage === 'in-meeting' && !!session?.id,
  });

  const handleJoin = () => {
    if (!session?.id) {
      toast.error('No active session — please ask the host to start one.');
      return;
    }
    setStage('in-meeting');
  };

  const handleLeave = useCallback(() => {
    meeting.leave();
    // Stop both possible streams — `localStream` may currently be the
    // screen-share composite, so the camera tracks live in the ref instead.
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    navigate('/meetings');
  }, [meeting, navigate]);

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    meeting.toggleAudio(next);
  };

  const handleToggleVideo = useCallback(async () => {
    const next = !videoEnabled;
    
    if (next) {
      // Turning video ON - request camera access
      try {
        const stream = cameraStreamRef.current;
        
        // Check if we already have a stream with video tracks
        if (stream) {
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            // Enable existing video tracks
            videoTracks.forEach((track) => {
              track.enabled = true;
            });
            setVideoEnabled(true);
            setMediaError(null);
            meeting.toggleVideo(true);
            toast.success('Camera enabled');
            return;
          }
        }

        // Need to request camera permission or restart camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user' },
        });

        // Replace or combine with existing stream
        if (cameraStreamRef.current) {
          // Stop old video tracks
          cameraStreamRef.current.getVideoTracks().forEach((t) => t.stop());
          // Replace video tracks
          const videoTracks = newStream.getVideoTracks();
          const audioTracks = cameraStreamRef.current.getAudioTracks();
          
          // Create new stream with both audio and new video
          const combinedStream = new MediaStream([
            ...audioTracks,
            ...videoTracks,
          ]);
          cameraStreamRef.current = combinedStream;
          setLocalStream(combinedStream);
        } else {
          cameraStreamRef.current = newStream;
          setLocalStream(newStream);
        }

        setVideoEnabled(true);
        setMediaError(null);
        meeting.toggleVideo(true);
        toast.success('Camera enabled');
      } catch (err) {
        const error = err as Error;
        if (error.name === 'NotAllowedError') {
          toast.error('Camera permission denied. Please enable it in your browser settings.');
          setMediaError('Camera permission denied');
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera device found on your system.');
          setMediaError('No camera device found');
        } else {
          toast.error(`Camera error: ${error.message}`);
          setMediaError(error.message);
        }
        setVideoEnabled(false);
      }
    } else {
      // Turning video OFF - stop video tracks
      if (cameraStreamRef.current) {
        const videoTracks = cameraStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = false;
          track.stop();
        });

        // Keep audio tracks alive, remove video from stream
        const audioTracks = cameraStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioOnlyStream = new MediaStream(audioTracks);
          cameraStreamRef.current = audioOnlyStream;
          setLocalStream(audioOnlyStream);
        } else {
          cameraStreamRef.current = null;
          setLocalStream(null);
        }
      }

      setVideoEnabled(false);
      meeting.toggleVideo(false);
      toast.info('Camera disabled');
    }
  }, [videoEnabled, meeting]);
  const handleRaiseHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    meeting.raiseHand(next);
  };
  const handleSendChat = () => {
    if (!chatDraft.trim()) return;
    meeting.sendChat(chatDraft);
    setChatDraft('');
  };

  const handleEmojiReaction = (emoji: string) => {
    const reaction: EmojiReaction = {
      id: `${peerId}-${Date.now()}`,
      emoji,
      userId,
      timestamp: Date.now(),
    };
    setRecentReactions((prev) => {
      const updated = [reaction, ...prev];
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setRecentReactions((r) => r.filter((x) => x.id !== reaction.id));
      }, 3000);
      return updated.slice(0, 10);
    });
    // Broadcast to other participants
    meeting.sendChat(`${emoji}`);
    setShowEmojiReactions(false);
  };

  // Screen share: capture the display, build a stream that combines the
  // existing mic audio with the screen video, and swap it in as the local
  // stream. The meetingSocket hook watches `localStream` and `replaceTrack`s
  // every peer's video sender automatically. The browser-provided "Stop
  // sharing" button fires `onended` on the screen video track — listen for
  // that so the UI restores camera when the user stops via Chrome's chrome.
  const stopScreenShareInternal = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    meeting.toggleScreenShare(false);
    const cam = cameraStreamRef.current;
    if (cam) {
      // Re-apply the user's current video preference to the restored camera.
      cam.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));
      setLocalStream(cam);
    }
  }, [meeting, videoEnabled]);

  const handleToggleScreenShare = async () => {
    if (screenSharing) { stopScreenShareInternal(); return; }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenVideo = display.getVideoTracks()[0];
      if (!screenVideo) throw new Error('No video track from display capture');
      // Restore camera when the user clicks the browser's stop-sharing chip.
      screenVideo.onended = () => stopScreenShareInternal();
      screenStreamRef.current = display;

      // Build a composite stream: mic audio from the camera stream + screen video.
      const composite = new MediaStream();
      const cam = cameraStreamRef.current;
      cam?.getAudioTracks().forEach((t) => composite.addTrack(t));
      composite.addTrack(screenVideo);

      setScreenSharing(true);
      meeting.toggleScreenShare(true);
      setLocalStream(composite);
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Could not start screen sharing';
      // User cancelling the picker throws NotAllowedError — don't toast for that.
      if ((err as Error)?.name !== 'NotAllowedError') toast.error(msg);
    }
  };

  // ── Render: error / loading / no-session screens ────────────────────
  if (!meetingId) {
    return (
      <CenteredCard
        tone="error"
        title="Meeting not found"
        message="No meeting id was provided in the URL."
        action={<Button onClick={() => navigate('/meetings')}><ArrowLeft className="h-4 w-4 mr-2" />Back to meetings</Button>}
      />
    );
  }
  if (sessionLoading) {
    return (
      <CenteredCard
        tone="neutral"
        title="Connecting…"
        message="Looking for an active session for this meeting."
        action={<Loader2 className="h-6 w-6 animate-spin text-indigo-500" />}
      />
    );
  }
  if (sessionError) {
    return (
      <CenteredCard
        tone="error"
        title="Couldn't load session"
        message={sessionError}
        action={
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={fetchActiveSession}>Retry</Button>
            <Button onClick={() => navigate('/meetings')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </div>
        }
      />
    );
  }
  if (!session) {
    // Only admins/secretaries can create a session (backend restricts the
    // POST /meetings/sessions endpoint to those roles). Board members
    // landing here before the host has started see a wait state instead of
    // a button that would 403 — and the polling effect above will flip the
    // page to pre-join automatically the moment the host clicks Start.
    const roleRaw = (me?.role ?? '').toString().toLowerCase().replace(/[_\s-]/g, '');
    const canStartSession =
      roleRaw === 'orgadmin' || roleRaw === 'secretary' || roleRaw === 'superadmin';

    return (
      <CenteredCard
        tone="neutral"
        title={canStartSession ? 'No active session' : 'Waiting for host'}
        message={
          canStartSession
            ? "There's no live session for this meeting yet. Start it when you're ready."
            : 'The host hasn’t started this meeting yet. You’ll be moved in automatically as soon as they do.'
        }
        action={
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/meetings')}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
            {canStartSession ? (
              <Button onClick={handleStartSession} disabled={creatingSession}>
                {creatingSession ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {creatingSession ? 'Starting…' : 'Start live session'}
              </Button>
            ) : (
              <Button disabled variant="secondary" className="cursor-default">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Waiting…
              </Button>
            )}
          </div>
        }
      />
    );
  }

  // ── Pre-join screen ─────────────────────────────────────────────────
  if (stage === 'prejoin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-2xl dark:shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Camera preview */}
            <div className="relative aspect-video md:aspect-auto bg-black flex items-center justify-center">
              {localStream && videoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)]"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <Avatar className="h-24 w-24 ring-4 ring-white/10">
                    <AvatarFallback className="bg-indigo-600 text-white text-2xl font-bold">{myInitials}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm">{videoEnabled ? 'Preparing camera…' : 'Camera off'}</p>
                </div>
              )}
              {mediaError && (
                <div className="absolute inset-x-4 bottom-4 rounded-xl bg-rose-500/90 px-3 py-2 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{mediaError}</span>
                </div>
              )}
              {/* Bottom toggle bar over the preview */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-center gap-3">
                <CircleButton
                  active={audioEnabled}
                  onClick={() => setAudioEnabled((v) => !v)}
                  IconOn={Mic}
                  IconOff={MicOff}
                  label={audioEnabled ? 'Mute' : 'Unmute'}
                />
                <CircleButton
                  active={videoEnabled}
                  onClick={() => setVideoEnabled((v) => !v)}
                  IconOn={VideoIcon}
                  IconOff={VideoOff}
                  label={videoEnabled ? 'Camera off' : 'Camera on'}
                />
              </div>
            </div>

            {/* Join panel */}
            <div className="p-8 flex flex-col gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-300">Ready to join?</p>
                <h1 className="text-3xl font-bold tracking-tight mt-1">Live meeting room</h1>
                <p className="text-sm text-white/60 mt-2">
                  You'll join as <span className="font-semibold text-white">{myDisplayName}</span>. Make sure your camera and microphone look right before connecting.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Microphone</span>
                  <span className={`text-xs font-semibold ${audioEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {audioEnabled ? 'Ready' : 'Muted'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Camera</span>
                  <span className={`text-xs font-semibold ${videoEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {videoEnabled ? 'Ready' : 'Off'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Session</span>
                  <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                    <CircleDot className="h-3 w-3 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <Button
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-base"
                  onClick={handleJoin}
                  disabled={!localStream}
                >
                  Join meeting
                </Button>
                <Button
                  variant="ghost"
                  className="text-white/60 hover:bg-white/5 hover:text-white"
                  onClick={() => navigate('/meetings')}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── In-meeting layout ───────────────────────────────────────────────
  // Build the tile list: local always first, then remote streams ordered
  // by join time (participants list).
  const remoteTiles = meeting.participants.map((p) => ({
    userId: p.userId,
    stream: meeting.remoteStreams.get(p.userId) ?? null,
    audioEnabled: p.audioEnabled ?? true,
    videoEnabled: p.videoEnabled ?? true,
    handRaised: p.isHandRaised ?? false,
    name: p.userId.slice(0, 6),
  }));
  const tileCount = remoteTiles.length + 1;
  const gridClass =
    tileCount <= 1 ? 'grid-cols-1'
    : tileCount <= 2 ? 'grid-cols-1 md:grid-cols-2'
    : tileCount <= 4 ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} style={fullscreen ? undefined : undefined}>
      <div className="flex flex-col h-screen text-slate-900 dark:text-white bg-slate-50 dark:bg-black">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-white/80 dark:from-black/80 to-white/40 dark:to-black/40 backdrop-blur border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <VideoIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight truncate">Live meeting room</p>
              <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className={`h-1.5 w-1.5 rounded-full ${meeting.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {meeting.connected ? 'Connected' : 'Connecting…'}
                <span>·</span>
                <Wifi className="h-3 w-3" />
                {meeting.participants.length + 1} {meeting.participants.length === 0 ? 'participant' : 'participants'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white rounded-xl"
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Body: video grid + side panel */}
        <div className="flex flex-1 min-h-0 bg-gradient-to-br from-slate-100 dark:from-slate-900 to-slate-50 dark:to-black">
          <main className="flex-1 p-3 sm:p-4 overflow-auto relative">
            <div className={`grid gap-3 ${gridClass}`} style={{ minHeight: 'calc(100% - 1px)' }}>
              {/* Local tile */}
              <VideoTile
                stream={localStream}
                muted
                mirrored
                name={`${myDisplayName} (you)`}
                initials={myInitials}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                handRaised={handRaised}
              />
              {/* Remote tiles */}
              {remoteTiles.map((tile) => (
                <VideoTile
                  key={tile.userId}
                  stream={tile.stream}
                  name={tile.name}
                  initials={tile.name.slice(0, 2).toUpperCase()}
                  audioEnabled={tile.audioEnabled}
                  videoEnabled={tile.videoEnabled}
                  handRaised={tile.handRaised}
                />
              ))}
            </div>
            <FloatingReactions reactions={recentReactions} />
          </main>

          {(showChat || showParticipants) && (
            <SidePanel
              tab={showChat ? 'chat' : 'people'}
              onClose={() => { setShowChat(false); setShowParticipants(false); }}
              onSwitchTab={(t) => {
                setShowChat(t === 'chat');
                setShowParticipants(t === 'people');
              }}
              participants={meeting.participants}
              myDisplayName={myDisplayName}
              chatMessages={meeting.chatMessages}
              myUserId={userId}
              chatDraft={chatDraft}
              onChatDraftChange={setChatDraft}
              onSendChat={handleSendChat}
            />
          )}
        </div>

        {/* Control bar */}
        <footer className="px-3 sm:px-6 py-4 bg-gradient-to-t from-white/90 dark:from-black/90 to-white/70 dark:to-black/70 backdrop-blur border-t border-slate-200 dark:border-white/10 relative">
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <CircleButton active={audioEnabled} onClick={handleToggleAudio} IconOn={Mic}      IconOff={MicOff}      label={audioEnabled ? 'Mute' : 'Unmute'} />
            <CircleButton active={videoEnabled} onClick={handleToggleVideo} IconOn={VideoIcon} IconOff={VideoOff}    label={videoEnabled ? 'Stop video' : 'Start video'} />
            <CircleButton
              active={!screenSharing}
              onClick={handleToggleScreenShare}
              IconOn={ScreenShare}
              IconOff={ScreenShareOff}
              label={screenSharing ? 'Stop sharing' : 'Share screen'}
              activeBg={screenSharing ? 'bg-emerald-600 hover:bg-emerald-700' : undefined}
            />
            <CircleButton
              active={!handRaised}
              onClick={handleRaiseHand}
              IconOn={Hand}
              IconOff={Hand}
              label={handRaised ? 'Lower hand' : 'Raise hand'}
              activeBg={handRaised ? 'bg-amber-500 hover:bg-amber-600' : undefined}
            />
            <CircleButton
              active={!showChat}
              onClick={() => { setShowChat((v) => !v); setShowParticipants(false); }}
              IconOn={MessageSquare}
              IconOff={MessageSquare}
              label="Chat"
              activeBg={showChat ? 'bg-indigo-600 hover:bg-indigo-700' : undefined}
            />
            <CircleButton
              active={!showParticipants}
              onClick={() => { setShowParticipants((v) => !v); setShowChat(false); }}
              IconOn={Users}
              IconOff={Users}
              label="Participants"
              activeBg={showParticipants ? 'bg-indigo-600 hover:bg-indigo-700' : undefined}
            />
            <div className="relative">
              <CircleButton
                active={showEmojiReactions}
                onClick={() => setShowEmojiReactions((v) => !v)}
                IconOn={Smile}
                IconOff={Smile}
                label="Reactions"
                activeBg={showEmojiReactions ? 'bg-indigo-600 hover:bg-indigo-700' : undefined}
              />
              {showEmojiReactions && (
                <EmojiReactionPicker
                  onSelect={handleEmojiReaction}
                  onClose={() => setShowEmojiReactions(false)}
                />
              )}
            </div>
            <Button
              variant="ghost"
              className="h-12 px-5 rounded-full bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white gap-2 font-semibold shadow-lg"
              onClick={handleLeave}
            >
              <PhoneOff className="h-4 w-4" />
              Leave
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function VideoTile({ stream, muted, mirrored, name, initials, audioEnabled, videoEnabled, handRaised }: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  name: string;
  initials: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  handRaised: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  const showVideo = stream && videoEnabled;
  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-white/10 aspect-video shadow-lg hover:shadow-xl transition-shadow">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`absolute inset-0 w-full h-full object-cover ${mirrored ? '[transform:scaleX(-1)]' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-300 dark:from-slate-800 to-slate-400 dark:to-slate-900">
          <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-slate-700">
            <AvatarFallback className="bg-indigo-500 text-white text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      )}
      {/* Status overlay */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 dark:bg-black/70 backdrop-blur px-2.5 py-1.5 rounded-lg">
        {!audioEnabled && <MicOff className="h-4 w-4 text-red-400" />}
        {!videoEnabled && <VideoOff className="h-4 w-4 text-red-400" />}
        {handRaised && <Hand className="h-4 w-4 text-amber-400" />}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-xs font-semibold text-white truncate">{name}</span>
        {audioEnabled && <Mic className="h-3.5 w-3.5 text-emerald-400" />}
      </div>
    </div>
  );
}

function CircleButton({ active, onClick, IconOn, IconOff, label, activeBg }: {
  active: boolean;
  onClick: () => void;
  IconOn: React.ElementType;
  IconOff: React.ElementType;
  label: string;
  activeBg?: string;
}) {
  const Icon = active ? IconOn : IconOff;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 ${[
        activeBg ?? (active 
          ? 'bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700' 
          : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white'),
      ]}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function SidePanel({
  tab, onClose, onSwitchTab,
  participants, myDisplayName,
  chatMessages, myUserId,
  chatDraft, onChatDraftChange, onSendChat,
}: {
  tab: 'chat' | 'people';
  onClose: () => void;
  onSwitchTab: (t: 'chat' | 'people') => void;
  participants: Participant[];
  myDisplayName: string;
  chatMessages: ChatMessage[];
  myUserId: string;
  chatDraft: string;
  onChatDraftChange: (v: string) => void;
  onSendChat: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages.length]);

  return (
    <aside className="w-full max-w-sm shrink-0 bg-white/90 dark:bg-slate-900/90 border-l border-slate-200 dark:border-white/10 flex flex-col shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-100 dark:from-slate-800 to-transparent">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSwitchTab('chat')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === 'chat' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Chat
            {chatMessages.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-indigo-500 text-white rounded-full px-1.5 py-0.5">{chatMessages.length}</span>
            )}
          </button>
          <button
            onClick={() => onSwitchTab('people')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === 'people' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
          >
            People <span className="ml-1.5 text-[10px] text-white/60">{participants.length + 1}</span>
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {tab === 'chat' ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">No messages yet. Start the conversation.</p>
            ) : (
              chatMessages.map((m) => {
                const mine = m.userId === myUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${mine ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white'}`}>
                      {!mine && (
                        <p className="text-[10px] font-semibold text-white/60 mb-0.5">{m.userId.slice(0, 8)}</p>
                      )}
                      <p className="leading-snug whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-3 border-t border-white/10 flex gap-2">
            <Input
              value={chatDraft}
              onChange={(e) => onChatDraftChange(e.target.value)}
              placeholder="Type a message…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendChat(); } }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-xs h-9 rounded-lg"
            />
            <Button onClick={onSendChat} disabled={!chatDraft.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 w-9 p-0 rounded-lg">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {/* Self */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/5">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-bold">
                {myDisplayName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-semibold text-white truncate flex-1">{myDisplayName} <span className="text-white/40 font-normal">(you)</span></p>
          </div>
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-slate-700 text-white text-[10px] font-bold">
                  {p.userId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs font-medium text-white truncate flex-1">{p.userId.slice(0, 12)}</p>
              <div className="flex items-center gap-1">
                {p.isHandRaised && <Hand className="h-3 w-3 text-amber-400" />}
                {!p.audioEnabled && <MicOff className="h-3 w-3 text-rose-400" />}
                {!p.videoEnabled && <VideoOff className="h-3 w-3 text-rose-400" />}
              </div>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="text-xs text-white/40 text-center py-8">No-one else has joined yet.</p>
          )}
        </div>
      )}
    </aside>
  );
}

function CenteredCard({ tone, title, message, action }: {
  tone: 'error' | 'neutral';
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6 text-slate-900 dark:text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-xl p-8 text-center space-y-5 shadow-2xl">
        <div className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${tone === 'error' ? 'bg-red-500/20 dark:bg-red-500/20 text-red-600 dark:text-red-300' : 'bg-indigo-500/20 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'}`}>
          {tone === 'error' ? <AlertTriangle className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
        </div>
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-slate-600 dark:text-white/60 mt-2 leading-relaxed">{message}</p>
        </div>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

// Emoji Reactions Popover
function EmojiReactionPicker({ onSelect, onClose }: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-16 right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="grid grid-cols-4 gap-1.5 p-2">
        {EMOJI_REACTIONS.map((r) => (
          <button
            key={r.emoji}
            onClick={() => {
              onSelect(r.emoji);
              onClose();
            }}
            title={r.label}
            className="text-2xl p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors hover:scale-125 transform"
          >
            {r.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// Floating Reactions Display
function FloatingReactions({ reactions }: { reactions: EmojiReaction[] }) {
  return (
    <div className="fixed bottom-32 right-4 space-y-1 pointer-events-none">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="text-3xl animate-bounce"
          style={{
            animation: 'bounce 1s ease-in-out forwards, fadeOut 3s ease-out forwards',
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
