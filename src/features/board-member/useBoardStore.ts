// src/features/board-member/useBoardStore.ts
// React hooks wrapping the localStorage store.
// BACKEND MIGRATION: Replace each hook body with a useQuery / useMutation call.
// Function signatures stay identical — pages need zero changes.

import { useState, useCallback, useEffect } from 'react';
import {
  meetingStore, documentStore, resolutionStore, taskStore,
  pollStore, announcementStore, messageStore, notificationStore,
  profileStore, complianceStore, getAnalytics, uid, CURRENT_USER,
} from './store';
import type {
  Meeting, Document, Resolution, Task, Poll, Announcement,
  MessageThread, Notification, UserProfile, ComplianceItem,
} from './types';

// ─── Generic reactive hook ────────────────────────────────────────────────────

function useStore<T>(loader: () => T, deps: any[] = []): [T, () => void] {
  const [data, setData] = useState<T>(loader);
  const refresh = useCallback(() => setData(loader()), []);
  // Re-load when deps change
  useEffect(() => { setData(loader()); }, deps);
  return [data, refresh];
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export function useMeetings() {
  const [meetings, refresh] = useStore(() => meetingStore.getAll());
  return {
    meetings,
    refresh,
    rsvp: (id: string, status: Meeting['myRsvp']) => { meetingStore.rsvp(id, status); refresh(); },
    updateMeeting: (id: string, data: Partial<Meeting>) => { meetingStore.update(id, data); refresh(); },
    deleteMeeting: (id: string) => { meetingStore.delete(id); refresh(); },
  };
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useDocuments() {
  const [documents, refresh] = useStore(() => documentStore.getAll());
  return {
    documents,
    refresh,
    viewDocument: (id: string) => { documentStore.incrementView(id); refresh(); },
    downloadDocument: (id: string) => { documentStore.incrementDownload(id); refresh(); },
    addAnnotation: (id: string, text: string) => { documentStore.addAnnotation(id, text); refresh(); },
    deleteAnnotation: (docId: string, annotationId: string) => { documentStore.deleteAnnotation(docId, annotationId); refresh(); },
    deleteDocument: (id: string) => { documentStore.delete(id); refresh(); },
    updateDocument: (id: string, data: Partial<Document>) => { documentStore.update(id, data); refresh(); },
  };
}

// ─── Resolutions ──────────────────────────────────────────────────────────────

export function useResolutions() {
  const [resolutions, refresh] = useStore(() => resolutionStore.getAll());
  return {
    resolutions,
    refresh,
    castVote: (resolutionId: string, vote: 'FOR' | 'AGAINST' | 'ABSTAIN', comment?: string) => {
      resolutionStore.castVote(resolutionId, vote, comment);
      refresh();
    },
  };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function useTasks() {
  const [tasks, refresh] = useStore(() => taskStore.getMine());
  return {
    tasks,
    refresh,
    updateTask:      (id: string, data: Partial<Task>) => { taskStore.update(id, data); refresh(); },
    updateProgress:  (id: string, progress: number, status?: Task['status']) => { taskStore.updateProgress(id, progress, status); refresh(); },
    addDeliverable:  (taskId: string, title: string) => { taskStore.addDeliverable(taskId, title); refresh(); },
    deleteTask:      (id: string) => { taskStore.delete(id); refresh(); },
  };
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export function usePolls() {
  const [polls, refresh] = useStore(() => pollStore.getAll());
  return {
    polls,
    refresh,
    respond:    (pollId: string, optionIds: string[]) => { pollStore.respond(pollId, optionIds); refresh(); },
    deletePoll: (id: string) => { pollStore.delete(id); refresh(); },
  };
}

// ─── Announcements ────────────────────────────────────────────────────────────

export function useAnnouncements() {
  const [announcements, refresh] = useStore(() => announcementStore.getAll());
  return {
    announcements,
    refresh,
    markRead:    (id: string) => { announcementStore.markRead(id); refresh(); },
    markAllRead: ()           => { announcementStore.markAllRead(); refresh(); },
    deleteAnnouncement: (id: string) => { announcementStore.delete(id); refresh(); },
  };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function useMessages() {
  const [threads, refresh] = useStore(() => messageStore.getThreads());
  return {
    threads,
    refresh,
    getThread:    (id: string) => messageStore.getThread(id),
    sendMessage:  (threadId: string, content: string) => { const m = messageStore.sendMessage(threadId, content); refresh(); return m; },
    deleteMessage:(threadId: string, messageId: string) => { messageStore.deleteMessage(threadId, messageId); refresh(); },
    markRead:     (threadId: string) => { messageStore.markThreadRead(threadId); refresh(); },
    createThread: (subject: string, participantIds: string[], participantNames: string[], firstMessage: string) => {
      const thread: MessageThread = {
        threadId: uid(), subject, participants: [CURRENT_USER.userId, ...participantIds],
        participantNames: [CURRENT_USER.name, ...participantNames], messages: [], isGroup: participantIds.length > 1,
        organisationId: 'org-001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      messageStore.createThread(thread);
      messageStore.sendMessage(thread.threadId, firstMessage);
      refresh();
      return thread.threadId;
    },
  };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, refresh] = useStore(() => notificationStore.getAll());
  return {
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    refresh,
    markRead:    (id: string) => { notificationStore.markRead(id); refresh(); },
    markAllRead: ()           => { notificationStore.markAllRead(); refresh(); },
    deleteNotification: (id: string) => { notificationStore.delete(id); refresh(); },
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function useProfile() {
  const [profile, refresh] = useStore(() => profileStore.get());
  return {
    profile,
    refresh,
    updateProfile: (data: Partial<UserProfile>) => { profileStore.update(data); refresh(); },
  };
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export function useCompliance() {
  const [items, refresh] = useStore(() => complianceStore.getAll());
  return {
    items,
    refresh,
    acknowledge: (id: string) => { complianceStore.acknowledge(id); refresh(); },
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useAnalytics() {
  return getAnalytics();
}