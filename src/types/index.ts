// src/types/index.ts
// Central type definitions – works perfectly with Vite + React + TypeScript

// ============================================================================
// Member Status Types
// ============================================================================

export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'pending_invite';

export type Permission = 
  | 'view_members'
  | 'edit_members'
  | 'delete_members'
  | 'manage_roles'
  | 'view_meetings'
  | 'create_meetings'
  | 'edit_meetings'
  | 'delete_meetings'
  | 'view_documents'
  | 'upload_documents'
  | 'delete_documents'
  | 'view_finance'
  | 'manage_finance'
  | 'view_announcements'
  | 'publish_announcements'
  | 'view_reports'
  | 'manage_settings'
  | 'view_audit_log';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  isCritical: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'role_changed' | 'member_removed' | 'status_updated' | 'member_created' | 'department_changed' | 'bulk_action';
  targetUserId?: string;
  targetUserName?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'board_member' | 'guest';

// ============================================================================
// Meeting State Machine Types
// ============================================================================

export type MeetingState = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'IN_PROGRESS' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'MINUTES_GENERATED' 
  | 'MINUTES_APPROVED' 
  | 'ARCHIVED';

export type AgendaItemStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED';

// Decision & Voting Types
export type DecisionType = 'RESOLUTION' | 'MOTION' | 'INFORMAL';
export type ApprovalMethod = 'VOTE' | 'CONSENSUS' | 'UNANIMOUS';
export type VoteStatus = 'PENDING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'ABSTAINED';
export type ActionItemStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

// Meeting Participation
export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT' | 'LATE' | 'LEFT_EARLY';

// Minutes Status
export type MinutesStatus = 'DRAFT' | 'GENERATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'ARCHIVED';

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

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
  // New fields for enhanced member management
  status?: MemberStatus;
  lastLogin?: string;
  createdAt?: string;
  twoFactorEnabled?: boolean;
  loginHistory?: UserActivity[];
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

// Minutes related types
export interface Minutes {
  id: string;
  meetingId: string;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  attendance: AttendanceRecord[];
  approvalOfPreviousMinutes?: string;
  agendaSummaries: AgendaSummary[];
  decisions: Decision[];
  actionItems: ActionItem[];
  nextMeetingDetails?: NextMeetingDetails;
  attachments: string[];
  preparedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  userId: string;
  present: boolean;
  role?: string;
}

export interface AgendaSummary {
  id: string;
  topic: string;
  discussion: string;
  decision?: string;
  presenter?: string;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  approvedBy?: string;
  date?: string;
}

export interface ActionItem {
  id: string;
  action: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface NextMeetingDetails {
  date?: string;
  time?: string;
  location?: string;
  agenda?: string;
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

// ============================================================================
// Live Meeting Module Types
// ============================================================================

export interface MeetingVote {
  id: string;
  decisionId: string;
  odlId: string;
  voterName: string;
  vote: 'YES' | 'NO' | 'ABSTAIN';
  votedAt: string;
  isLocked: boolean;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  agendaItemId?: string;
  decisionText: string;
  decisionType: DecisionType;
  description?: string;
  approvalMethod: ApprovalMethod;
  majorityRule: number;
  quorumRequired: number;
  quorumPresent: number;
  votes: MeetingVote[];
  yesVotes: number;
  noVotes: number;
  abstentions: number;
  result?: 'APPROVED' | 'REJECTED' | 'PENDING';
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  createdBy: string;
  createdAt: string;
  finalizedAt?: string;
  actionItemIds: string[];
}

export interface MeetingSession {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  state: MeetingState;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  location?: string;
  virtualLink?: string;
  quorumRequired: number;
  quorumPresent: number;
  chairpersonId: string;
  secretaryId: string;
  participants: Participant[];
  agendaItems: AgendaItemSession[];
  activeAgendaItemId?: string;
  decisions: Decision[];
  votes: MeetingVote[];
  actionItems: MeetingActionItem[];
  liveNotes: LiveNote[];
  minutesId?: string;
  minutes?: MeetingMinutes;
  aiSummary?: string;
  aiDraftResolution?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface Participant {
  id: string;
  odlId: string;
  name: string;
  email: string;
  role: 'CHAIR' | 'SECRETARY' | 'MEMBER' | 'OBSERVER' | 'GUEST';
  attendanceStatus: AttendanceStatus;
  joinedAt?: string;
  leftAt?: string;
  isPresent: boolean;
  canVote: boolean;
  hasVoted: boolean;
}

export interface AgendaItemSession {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  duration: number;
  order: number;
  status: AgendaItemStatus;
  startedAt?: string;
  endedAt?: string;
  actualDuration?: number;
  notes: string[];
  decisionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  decisionId?: string;
  agendaItemId?: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  dueDate: string;
  status: ActionItemStatus;
  priority: TaskPriority;
  notes?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  closedAt?: string;
}

export interface LiveNote {
  id: string;
  meetingId: string;
  agendaItemId?: string;
  content: string;
  summary?: string;
  version: number;
  previousVersionId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isAutoSaved: boolean;
  timestamp?: string;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendance: AttendanceRecordEnhanced[];
  agendaSummaries: AgendaSummaryEnhanced[];
  decisions: Decision[];
  actionItems: MeetingActionItem[];
  nextMeetingDetails?: NextMeetingDetails;
  attachments: string[];
  status: MinutesStatus;
  version: number;
  preparedBy: string;
  preparedByName: string;
  preparedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  isLocked: boolean;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecordEnhanced {
  odlId: string;
  name: string;
  email: string;
  role: string;
  status: AttendanceStatus;
  joinedAt?: string;
  leftAt?: string;
}

export interface AgendaSummaryEnhanced {
  id: string;
  agendaItemId: string;
  topic: string;
  discussion: string;
  decision?: string;
  presenterId: string;
  presenterName: string;
  duration: number;
  actualDuration?: number;
}

export interface AuditLog {
  id: string;
  meetingId: string;
  action: string;
  entityType: 'MEETING' | 'AGENDA_ITEM' | 'DECISION' | 'VOTE' | 'ACTION_ITEM' | 'NOTE' | 'MINUTES' | 'PARTICIPANT';
  entityId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export type MeetingEventType = 
  | 'MEETING_STATE_CHANGED'
  | 'AGENDA_ITEM_ACTIVATED'
  | 'AGENDA_ITEM_COMPLETED'
  | 'AGENDA_ITEM_SKIPPED'
  | 'DECISION_CREATED'
  | 'DECISION_UPDATED'
  | 'DECISION_LOCKED'
  | 'VOTE_CAST'
  | 'ACTION_ITEM_CREATED'
  | 'ACTION_ITEM_UPDATED'
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'MINUTES_GENERATED'
  | 'MINUTES_APPROVED';

export interface MeetingEvent {
  type: MeetingEventType;
  meetingId: string;
  data: Record<string, unknown>;
  timestamp: string;
  actorId: string;
  actorName: string;
}

export interface AISummarizeRequest {
  meetingId: string;
  agendaItemId?: string;
  content: string[];
}

export interface AISummarizeResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface AIDraftResolutionRequest {
  decisionText: string;
  discussion: string;
}

export interface AIDraftResolutionResponse {
  draftResolution: string;
  suggestedWording: string[];
}

export interface AIGenerateMinutesRequest {
  meetingId: string;
}

export interface AIGenerateMinutesResponse {
  draft: MeetingMinutes;
  confidence: number;
}

// THIS LINE IS THE KEY – forces Vite to treat the module as having runtime exports
export default {};
