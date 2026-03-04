// src/types/index.ts
// Central type definitions – Re-exports all types from specialized files

// ════════════════════════════════════════════════════════════════════════════════
// RE-EXPORT ENUMS (exclude types that also exist in api.types to avoid conflicts)
// ════════════════════════════════════════════════════════════════════════════════
export {
  SystemRole,
  RoleType,
  Frequency,
  AttendanceStatus,
} from './enums';

// ════════════════════════════════════════════════════════════════════════════════
// RE-EXPORT API TYPES (canonical source for all type aliases)
// ════════════════════════════════════════════════════════════════════════════════
export * from './api.types';

// ════════════════════════════════════════════════════════════════════════════════
// LEGACY TYPE ALIASES (for backward compatibility with existing components)
// ════════════════════════════════════════════════════════════════════════════════

// Map old role types to new ones
export type LegacyUserRole = 'super_admin' | 'admin' | 'board_member' | 'guest';

// These types are preserved for backward compatibility with existing mock data
export type LegacyMeetingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type LegacyTaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type LegacyTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LegacyDocumentAccessLevel = 'public' | 'board_only' | 'admin_only' | 'private';
export type LegacyPollStatus = 'draft' | 'active' | 'closed';
export type LegacyExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type NotificationType =
  | 'meeting'
  | 'vote'
  | 'task'
  | 'document'
  | 'announcement'
  | 'system';

// ════════════════════════════════════════════════════════════════════════════════
// LEGACY INTERFACES (for backward compatibility with existing mock data)
// ════════════════════════════════════════════════════════════════════════════════

export interface LegacyUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: LegacyUserRole;
  position?: string;
  department?: string;
  phone?: string;
  termStartDate?: string;
  termEndDate?: string;
  committees?: string[];
}

export interface LegacyAgendaItem {
  id: string;
  title: string;
  owner: string;
  duration: number;
  description?: string;
  attachments: string[];
  order: number;
}

export interface LegacyMeeting {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location?: string;
  isRecurring: boolean;
  status: LegacyMeetingStatus;
  agenda: LegacyAgendaItem[];
  attendees: string[];
  minutesId?: string;
  createdBy: string;
  createdAt: string;
}

export interface LegacyTask {
  id: string;
  title: string;
  description?: string;
  status: LegacyTaskStatus;
  priority: LegacyTaskPriority;
  assigneeId: string;
  dueDate: string;
  meetingId?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface LegacyDocument {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  folderId?: string;
  tags: string[];
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  accessLevel: LegacyDocumentAccessLevel;
}

export interface LegacyPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface LegacyPoll {
  id: string;
  meetingId?: string;
  question: string;
  description?: string;
  options: LegacyPollOption[];
  anonymous: boolean;
  multipleChoice: boolean;
  requireQuorum: boolean;
  quorumPercentage?: number;
  status: LegacyPollStatus;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}

export interface LegacyBudget {
  id: string;
  fiscalYear: string;
  category: string;
  allocated: number;
  spent: number;
  status: 'draft' | 'approved' | 'active';
  approvedBy?: string;
  approvedAt?: string;
}

export interface LegacyExpense {
  id: string;
  budgetId: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  date: string;
  receiptUrl?: string;
  status: LegacyExpenseStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface LegacyAnnouncement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  targetAudience: 'all' | 'board_only' | 'admin_only' | string[];
  publishedBy: string;
  publishedAt: string;
  expiresAt?: string;
}

export interface LegacyNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface LegacyDashboardStats {
  upcomingMeetings: LegacyMeeting[];
  openTasks: LegacyTask[];
  activePolls: LegacyPoll[];
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    percentage: number;
  };
  recentDocuments: LegacyDocument[];
  attendanceTrend: { month: string; attendance: number }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// TYPE ALIASES FOR BACKWARD COMPATIBILITY
// These allow existing code to continue working without changes
// ════════════════════════════════════════════════════════════════════════════════
export type User = LegacyUser;
export type AgendaItem = LegacyAgendaItem;
export type Task = LegacyTask;
export type Document = LegacyDocument;
export type Poll = LegacyPoll;
export type PollOption = LegacyPollOption;
export type Budget = LegacyBudget;
export type Expense = LegacyExpense;
export type Announcement = LegacyAnnouncement;
export type Notification = LegacyNotification;
export type DashboardStats = LegacyDashboardStats;

// THIS LINE IS THE KEY – forces Vite to treat the module as having runtime exports
export default {} as const;