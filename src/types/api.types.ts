// src/types/api.types.ts
// API response and request types based on the backend API specification

// ────────────────────────────────────────────────
// GENERIC API RESPONSE WRAPPER
// ────────────────────────────────────────────────
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ────────────────────────────────────────────────
// AUTH TYPES
// ────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
  orgCode?: string;
}

export interface OrgAdminLoginCredentials {
  email: string;
  password: string;
}

export interface SuperAdminLoginCredentials {
  email: string;
  password: string;
}

export interface RegisterOrgAdminData {
  firstName: string;
  lastName: string;
  email: string;
  organisationName: string;
  phoneNumber: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hasOrganisation: boolean;
  organisationStatus: OrganisationStatus | null;
  orgCode: string | null;
}

export interface AuthTokens {
  at: string; // access token
  rt: string; // refresh token
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
  orgCode?: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface ActivateAccountData {
  token: string;
  password: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
}

// ────────────────────────────────────────────────
// USER / MEMBER TYPES
// ────────────────────────────────────────────────
export type UserRole = 
  | 'SuperAdmin' 
  | 'OrgAdmin' 
  | 'BoardMember' 
  | 'Admin' 
  | 'User';

export type UserStatus = 'active' | 'pending' | 'suspended' | 'invited' | 'deactivated';

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;

  password: string;
  mustChangePassword?: boolean;
  passwordChangeAt?: Date;

  role: UserRole;
  customRoleId?: string | null;
  isOrganisationAdmin?: boolean;

  title?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;

  status?: UserStatus;
  lastLogin?: Date;

  refreshToken?: string;

  organisationId?: string | null;

  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  title?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

export interface UpdateUserData {
  status?: UserStatus;
  role?: UserRole;
}

export interface AssignRoleData {
  roleType: 'system' | 'custom';
  customRoleId?: string;
  systemRole?: UserRole;
}

export interface ChangeRoleData {
  role: UserRole;
}

export interface UserPermissions {
  permissions: string[];
}

// ────────────────────────────────────────────────
// ORGANISATION TYPES
// ────────────────────────────────────────────────
export interface Organisation {
  organisationId: string;
  organisationName: string;
  code: string;
  status: OrganisationStatus;
  description?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganisationData {
  organisationName: string;
  description?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  logoUrl?: string;
}

// export type UpdateOrganisationData = Partial<CreateOrganisationData>;

// ────────────────────────────────────────────────
// MEETING TYPES
// ────────────────────────────────────────────────
export type MeetingFormat = 'online' | 'in-person' | 'hybrid';
export type MeetingFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type MeetingType = 'regular' | 'special' | 'emergency' | 'annual';
export type MeetingPriority = 'low' | 'medium' | 'high' | 'urgent';
export type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type RSVPStatus = 'invited' | 'accepted' | 'declined' | 'tentative' | 'attended' | 'absent' | 'checkedIn';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingFormat: MeetingFormat;
  meetingFrequency: MeetingFrequency;
  meetingType: MeetingType;
  meetingPriority: MeetingPriority;
  location?: string;
  onlineMeetingLink?: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: MeetingStatus;
  createdByUser?: User;
  attendees?: MeetingAttendee[];
  organisationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  meetingFormat: MeetingFormat;
  meetingFrequency: MeetingFrequency;
  meetingType: MeetingType;
  meetingPriority: MeetingPriority;
  location?: string;
  onlineMeetingLink?: string;
  date: string;
  startTime: string;
  endTime: string;
}

export type UpdateMeetingData = Partial<CreateMeetingData>;

export interface MeetingAttendee {
  userId: string;
  user?: User;
  isChair: boolean;
  isSecretary: boolean;
  rsvpStatus?: RSVPStatus;
  attendedAt?: string;
}

export interface AddAttendeesData {
  userIds: string[];
  isChair?: boolean;
  isSecretary?: boolean;
}

export interface RSVPData {
  status: RSVPStatus;
  notes?: string;
}

export interface MeetingAttendeeStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  tentative: number;
}

// ────────────────────────────────────────────────
// AGENDA TYPES
// ────────────────────────────────────────────────
export type AgendaStatus = 'draft' | 'published' | 'archived';
export type AgendaItemType = 'discussion' | 'decision' | 'information' | 'action' | 'presentation' | 'vote';
export type AgendaItemStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';

export interface AgendaAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface AgendaItem {
  id: string;
  orderIndex: number;
  type: AgendaItemType;
  title: string;
  description?: string;
  duration: number; // in minutes
  presenterId?: string;
  presenterName?: string;
  attachments?: AgendaAttachment[];
  notes?: string;
  status?: AgendaItemStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface Agenda {
  id: string;
  title: string;
  description?: string;
  meetingId: string;
  status?: AgendaStatus;
  items?: AgendaItem[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface CreateAgendaData {
  title: string;
  description?: string;
  meetingId: string;
}

export interface UpdateAgendaData {
  title?: string;
  description?: string;
}

export interface CreateAgendaItemData {
  orderIndex: number;
  type: AgendaItemType;
  title: string;
  description?: string;
  duration: number;
  presenterId?: string;
  presenterName?: string;
  attachments?: Omit<AgendaAttachment, 'id'>[];
  notes?: string;
}

export type UpdateAgendaItemData = Partial<CreateAgendaItemData>;

export interface ReorderAgendaItemsData {
  items: Array<{
    itemId: string;
    orderIndex: number;
  }>;
}

export interface AgendaStats {
  totalItems: number;
  completedItems: number;
  totalDuration: number;
  elapsedDuration: number;
}

// ────────────────────────────────────────────────
// ANNOUNCEMENT TYPES
// ────────────────────────────────────────────────
export type AnnouncementAudienceType = 'ALL' | 'BOARD_MEMBERS' | 'ADMINS' | 'CUSTOM';

export interface AnnouncementAudience {
  type: AnnouncementAudienceType;
  userIds?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  audience: AnnouncementAudience;
  publishedBy: string;
  publishedByName: string;
  publishedAt: number; // timestamp in milliseconds
  expiresAt?: number; // timestamp in milliseconds
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  isPinned?: boolean;
  audience: AnnouncementAudience;
  publishedBy: string;
  publishedByName: string;
  publishedAt: number;
  expiresAt?: number;
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  isPinned?: boolean;
  audience?: AnnouncementAudience;
  publishedBy?: string;
  publishedByName?: string;
  publishedAt?: number;
  expiresAt?: number;
  version: number; // required for optimistic locking
}

export interface AnnouncementFilters {
  query?: string;
  category?: string;
  page?: number;
}

export interface BulkDeleteData {
  ids: string[];
}

// ────────────────────────────────────────────────
// DOCUMENT TYPES
// ────────────────────────────────────────────────
export type DocumentAccessLevel = 'public' | 'board_only' | 'admin_only' | 'private';

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  folderId?: string;
  tags?: string[];
  version: number;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  accessLevel?: DocumentAccessLevel;
  description?: string;
  meetingId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDocumentData {
  title: string;
  file: File;
  description?: string;
  folderId?: string;
  tags?: string[];
  accessLevel?: DocumentAccessLevel;
  meetingId?: string;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  folderId?: string;
  tags?: string[];
  accessLevel?: DocumentAccessLevel;
  file?: File;
}

export interface DocumentFilters {
  query?: string;
  folderId?: string;
  tags?: string[];
  accessLevel?: DocumentAccessLevel;
  page?: number;
  limit?: number;
}

// ────────────────────────────────────────────────
// MINUTES TYPES
// ────────────────────────────────────────────────
export type MinutesStatus = 'draft' | 'pending_review' | 'approved' | 'published';

export interface VotingDetails {
  question: string;
  inFavor: number;
  against: number;
  abstain: number;
  isPassed: boolean;
}

export interface ActionItemAssignee {
  userId: string;
  name: string;
}

export interface ActionItemDetails {
  description: string;
  assignedTo: ActionItemAssignee[];
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export type MinuteItemType = 'general' | 'decision' | 'action_item' | 'discussion' | 'vote';

export interface MinuteItem {
  id: string;
  orderIndex: number;
  type: MinuteItemType;
  title: string;
  content: string;
  agendaItemId?: string;
  timestamp?: string;
  votingDetails?: VotingDetails;
  actionItemDetails?: ActionItemDetails;
  createdAt?: string;
  updatedAt?: string;
}

export interface Minutes {
  id: string;
  title: string;
  summary: string;
  meetingId: string;
  meeting?: Meeting;
  collaborators: string[];
  status: MinutesStatus;
  items?: MinuteItem[];
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMinutesData {
  title: string;
  summary: string;
  meetingId: string;
  collaborators?: string[];
}

export interface UpdateMinutesData {
  title?: string;
  summary?: string;
  collaborators?: string[];
}

export interface ApproveMinutesData {
  approved: boolean;
  comments?: string;
}

export interface CreateMinuteItemData {
  orderIndex: number;
  type: MinuteItemType;
  title: string;
  content: string;
  agendaItemId?: string;
  timestamp?: string;
  votingDetails?: VotingDetails;
  actionItemDetails?: ActionItemDetails;
}

export type UpdateMinuteItemData = Partial<CreateMinuteItemData>;

export interface MinutesFilters {
  page?: number;
  limit?: number;
  status?: MinutesStatus;
}

// ────────────────────────────────────────────────
// NOTIFICATION TYPES
// ────────────────────────────────────────────────
export type NotificationCategory = 'SYSTEM' | 'MEETING' | 'VOTING' | 'DOCUMENT' | 'FINANCIAL' | 'ANNOUNCEMENT';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AttachmentType = 'DOCUMENT' | 'IMAGE' | 'MEETING' | 'TASK' | 'POLL';

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  targetRoute?: string;
  actionLabel?: string;
  senderName?: string;
  senderId?: string;
  recipientId: string;
  attachmentId?: string;
  attachmentType?: AttachmentType;
  isRead: boolean;
  isFlagged: boolean;
  expiresAt?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  targetRoute?: string;
  actionLabel?: string;
  senderName?: string;
  senderId?: string;
  recipientId: string;
  attachmentId?: string;
  attachmentType?: AttachmentType;
  expiresAt?: number;
}

export interface UpdateNotificationData {
  title?: string;
  message?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  targetRoute?: string;
  actionLabel?: string;
  senderName?: string;
  senderId?: string;
  recipientId?: string;
  attachmentId?: string;
  attachmentType?: AttachmentType;
  expiresAt?: number;
  isRead?: boolean;
  isFlagged?: boolean;
}

export interface NotificationFilters {
  query?: string;
  category?: NotificationCategory;
  page?: number;
}

// ────────────────────────────────────────────────
// POLL TYPES
// ────────────────────────────────────────────────
export type PollStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voterIds: string[];
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  anonymous: boolean;
  multipleChoice: boolean;
  requireQuorum: boolean;
  quorumPercentage?: number;
  status: PollStatus;
  expiresAt?: number;
  meetingId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePollData {
  question: string;
  description?: string;
  options: Array<{ id?: string; text: string; votes?: number; voterIds?: string[] }>;
  anonymous?: boolean;
  multipleChoice?: boolean;
  requireQuorum?: boolean;
  quorumPercentage?: number;
  status?: PollStatus;
  expiresAt?: number;
  meetingId?: string;
}

export type UpdatePollData = Partial<CreatePollData>;

export interface VoteData {
  pollId: string;
  optionId: string;
}

export interface PollFilters {
  query?: string;
  status?: PollStatus;
  page?: number;
}

// ────────────────────────────────────────────────
// TASK TYPES
// ────────────────────────────────────────────────
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assignee?: User;
  dueDate?: number;
  meetingId?: string;
  meeting?: Meeting;
  createdBy?: string;
  completedAt?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: number;
  meetingId?: string;
  createdBy?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: number;
  meetingId?: string;
  completedAt?: number;
}

export interface TaskFilters {
  query?: string;
  status?: TaskStatus;
  page?: number;
}

// ────────────────────────────────────────────────
// ORGANISATION TYPES
// ────────────────────────────────────────────────
export type OrganisationStatus = 'pending' | 'active' | 'approved' | 'suspended' | 'rejected';

export interface Organisation {
  organisationId: string;
  organisationName: string;
  orgCode?: string;
  OrgEmail: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  logoUrl?: string;
  isActive?: boolean;
  status: OrganisationStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganisationData {
  organisationName: string;
  OrgEmail: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export type UpdateOrganisationData = Partial<CreateOrganisationData>;

// ────────────────────────────────────────────────
// SETTINGS TYPES
// ────────────────────────────────────────────────
export interface PlatformSettings {
  id: string;
  appName: string;
  organizationSettings: {
    name: string;
    taxId: string;
    address: string;
    logoUrl: string;
    contactEmail: string;
  };
  memberSettings: {
    maxMembers: number;
    allowProfilePhotos: boolean;
    requireVerification: boolean;
    allowSelfRegistration: boolean;
  };
  notificationSettings: {
    weeklyDigest: boolean;
    taskAssignments: boolean;
    meetingReminders: boolean;
    emailNotifications: boolean;
  };
  securitySettings: {
    autoLogout: boolean;
    pinRequired: boolean;
    dataEncryption: boolean;
    sessionTimeout: number;
    auditLogEnabled: boolean;
  };
  integrationSettings: {
    slackEnabled: boolean;
    outlookEnabled: boolean;
    googleCalendarEnabled: boolean;
  };
  createdAt?: number;
  version?: number;
}

// Keep backward-compat alias
export type OrganisationSettings = PlatformSettings;

export interface UpdateSettingsData {
  appName?: string;
  organizationSettings?: Partial<PlatformSettings['organizationSettings']>;
  memberSettings?: Partial<PlatformSettings['memberSettings']>;
  notificationSettings?: Partial<PlatformSettings['notificationSettings']>;
  securitySettings?: Partial<PlatformSettings['securitySettings']>;
  integrationSettings?: Partial<PlatformSettings['integrationSettings']>;
}

// ────────────────────────────────────────────────
// OVERVIEW/ANALYTICS TYPES
// ────────────────────────────────────────────────
export interface AnalyticsData {
  upcomingMeetings: Meeting[];
  openTasks: Task[];
  activePolls: Poll[];
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    percentage: number;
  };
  recentDocuments: Document[];
  attendanceTrend: Array<{ month: string; value: number }>;
}

export interface FinanceOverview {
  budget: {
    total: { label: string; amount: number; subtext: string };
    spent: { label: string; amount: number; subtext: string };
    categories: Array<{
      id: string;
      fiscalYear: string;
      category: string;
      allocated: number;
      spent: number;
      status: string;
    }>;
  };
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

// ────────────────────────────────────────────────
// DASHBOARD TYPES
// ────────────────────────────────────────────────
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
  attendanceTrend: Array<{ month: string; value: number }>;
}

// ────────────────────────────────────────────────
// CUSTOM ROLE TYPES
// ────────────────────────────────────────────────
export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  organisationId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomRoleData {
  name: string;
  description?: string;
  permissions: string[];
}

export type UpdateCustomRoleData = Partial<CreateCustomRoleData>;

// ────────────────────────────────────────────────
// APPROVE ORGANISATION DTO
// ────────────────────────────────────────────────
export interface ApproveOrganisationData {
  organisationId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

// ────────────────────────────────────────────────
// ERROR TYPES
// ────────────────────────────────────────────────
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: Record<string, unknown>;
}
