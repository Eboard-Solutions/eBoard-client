// src/features/board-member/index.ts

// ── Dashboard ─────────────────────────────────────────────────────────────────
export { default as BoardMemberDashboard } from './BoardMemberDashboard';

// ── Feature pages (all named exports from pages.tsx) ─────────────────────────
export {
  MeetingsPage,
  DocumentsPage,
  ResolutionsPage,
  TasksPage,
  PollsPage,
  AnnouncementsPage,
  MessagesPage,
  NotificationsPage,
  CompliancePage,
  AnalyticsPage,
  ArchivesPage,
  ProfilePage,
} from './pages';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  Meeting,
  AgendaItem,
  Attendee,
  Document,
  Annotation,
  Resolution,
  Vote,
  Task,
  Deliverable,
  Poll,
  PollOption,
  AuditEntry,
  Announcement,
  Message,
  MessageThread,
  Notification,
  UserProfile,
  ComplianceItem,
  AnalyticsData,
} from './types';