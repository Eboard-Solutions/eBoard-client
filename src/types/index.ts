// src/types/index.ts
// Central type definitions – works perfectly with Vite + React + TypeScript

export type UserRole = 'super_admin' | 'admin' | 'board_member' | 'guest';

export type MeetingStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DocumentAccessLevel = 'public' | 'board_only' | 'admin_only' | 'private';
export type PollStatus = 'draft' | 'active' | 'closed';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type NotificationType =
  | 'meeting'
  | 'vote'
  | 'task'
  | 'document'
  | 'announcement'
  | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  position?: string;
  department?: string;
  phone?: string;
  termStartDate?: string;
  termEndDate?: string;
  committees?: string[];
}

export interface Meeting {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location?: string;
  isRecurring: boolean;
  status: MeetingStatus;
  agenda: AgendaItem[];
  attendees: string[];
  minutesId?: string;
  createdBy: string;
  createdAt: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  owner: string;
  duration: number;
  description?: string;
  attachments: string[];
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  meetingId?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface Document {
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
  accessLevel: DocumentAccessLevel;
}

export interface Poll {
  id: string;
  meetingId?: string;
  question: string;
  description?: string;
  options: PollOption[];
  anonymous: boolean;
  multipleChoice: boolean;
  requireQuorum: boolean;
  quorumPercentage?: number;
  status: PollStatus;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Budget {
  id: string;
  fiscalYear: string;
  category: string;
  allocated: number;
  spent: number;
  status: 'draft' | 'approved' | 'active';
  approvedBy?: string;
  approvedAt?: string;
}

export interface Expense {
  id: string;
  budgetId: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  date: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  targetAudience: 'all' | 'board_only' | 'admin_only' | string[];
  publishedBy: string;
  publishedAt: string;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface DashboardStats {
  upcomingMeetings: Meeting[];
  openTasks: Task[];
  activePolls: Poll[];
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    percentage: number;
  };
  recentDocuments: Document[];
  attendanceTrend: { month: string; attendance: number }[];
}

// THIS LINE IS THE KEY – forces Vite to treat the module as having runtime exports
export default {} as const;

// Optional: re-export everything explicitly (helps IDEs and some edge cases)
export type {
  User,
  UserRole,
  Meeting,
  MeetingStatus,
  AgendaItem,
  Task,
  TaskStatus,
  TaskPriority,
  Document,
  DocumentAccessLevel,
  Poll,
  PollOption,
  Budget,
  Expense,
  ExpenseStatus,
  Announcement,
  Notification,
  NotificationType,
  DashboardStats,
};