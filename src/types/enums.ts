// src/types/enums.ts
// Database Schema Enums - Matching the backend API specification

// ════════════════════════════════════════════════════════════════════════════════
// ROLE ENUMS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * System Roles (eROLE)
 * Platform-level and organization-level role definitions
 */
export enum SystemRole {
  SUPER_ADMIN = 'superAdmin',
  ORG_ADMIN = 'OrgAdmin',
  BOARD_MEMBER = 'BoardMember',
  SECRETARY = 'secretary',
}

/**
 * Role Types (RoleType)
 * Distinguishes between built-in system roles and custom organizational roles
 */
export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

// Type alias for role strings used in API responses
export type UserRole = 'superAdmin' | 'OrgAdmin' | 'BoardMember' | 'secretary';

// ════════════════════════════════════════════════════════════════════════════════
// USER STATUS
// ════════════════════════════════════════════════════════════════════════════════

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  INVITED = 'invited',
  DEACTIVATED = 'deactivated',
}

// ════════════════════════════════════════════════════════════════════════════════
// ORGANISATION STATUS
// ════════════════════════════════════════════════════════════════════════════════

export enum OrganisationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// ════════════════════════════════════════════════════════════════════════════════
// MEETING ENUMS
// ════════════════════════════════════════════════════════════════════════════════

export enum MeetingFormat {
  ONLINE = 'online',
  PHYSICAL = 'physical',
  HYBRID = 'hybrid',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MeetingType {
  REGULAR = 'regular',
  SPECIAL = 'special',
  EMERGENCY = 'emergency',
  ANNUAL = 'annual',
}

export enum MeetingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum Frequency {
  ONCE = 'once',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum AttendanceStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  ATTENDED = 'attended',
  ABSENT = 'absent',
  CHECKED_IN = 'checkedIn',
}

export enum MeetingSessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum ParticipantStatus {
  JOINING = 'joining',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  LEFT = 'left',
}

export enum MediaType {
  AUDIO = 'audio',
  VIDEO = 'video',
  SCREEN = 'screen',
}

export enum RecordingStatus {
  PENDING = 'pending',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TranscriptStatus {
  PENDING = 'pending',
  TRANSCRIBING = 'transcribing',
  COMPLETED = 'completed',
  PROCESSING = 'processing',
  FAILED = 'failed',
}

export enum MinutesStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
}

export enum AgendaStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum AgendaItemType {
  DISCUSSION = 'discussion',
  DECISION = 'decision',
  INFORMATION = 'information',
  ACTION = 'action',
  PRESENTATION = 'presentation',
  VOTE = 'vote',
}

export enum ReminderType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export enum ReminderStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NoteType {
  GENERAL = 'general',
  DECISION = 'decision',
  ACTION_ITEM = 'action_item',
  DISCUSSION = 'discussion',
  VOTE = 'vote',
}

export enum CheckInMethod {
  QR_CODE = 'qr_code',
  PIN = 'pin',
  MANUAL = 'manual',
  AUTO = 'auto',
}

// ════════════════════════════════════════════════════════════════════════════════
// POLL ENUMS
// ════════════════════════════════════════════════════════════════════════════════

export enum PollStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

// ════════════════════════════════════════════════════════════════════════════════
// TASK ENUMS
// ════════════════════════════════════════════════════════════════════════════════

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ════════════════════════════════════════════════════════════════════════════════
// DOCUMENT ENUMS
// ════════════════════════════════════════════════════════════════════════════════

export enum DocumentAccessLevel {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum StorageDirectory {
  DOCUMENTS = 'documents',
  AVATARS = 'avatars',
  NOTIFICATIONS = 'notifications',
  LOGO = 'logo',
  RECORDINGS = 'recordings',
  MINUTES = 'minutes',
}

// ════════════════════════════════════════════════════════════════════════════════
// BUDGET ENUMS
// ════════════════════════════════════════════════════════════════════════════════

export enum BudgetStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

// ════════════════════════════════════════════════════════════════════════════════
// NOTIFICATION ENUMS
// ════════════════════════════════════════════════════════════════════════════════

export enum AudienceType {
  ALL = 'ALL',
  BOARD_ONLY = 'BOARD_ONLY',
  ADMIN_ONLY = 'ADMIN_ONLY',
  SPECIFIC = 'SPECIFIC',
}

export enum NotificationCategory {
  MEETING = 'MEETING',
  VOTING = 'VOTING',
  DOCUMENT = 'DOCUMENT',
  FINANCIAL = 'FINANCIAL',
  SYSTEM = 'SYSTEM',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ════════════════════════════════════════════════════════════════════════════════
// ROLE PERMISSIONS MATRIX
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Permission capabilities for role-based access control
 * Maps capabilities to the roles that can perform them
 */
export const RolePermissions = {
  // Platform Administration
  managePlatform: [SystemRole.SUPER_ADMIN],
  manageAllOrganisations: [SystemRole.SUPER_ADMIN],
  createSuperAdmin: [SystemRole.SUPER_ADMIN],
  viewAllUsers: [SystemRole.SUPER_ADMIN],
  viewAuditLogs: [SystemRole.SUPER_ADMIN],

  // Organisation Administration
  registerOrganisation: [SystemRole.ORG_ADMIN],
  updateOrganisation: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],
  manageUsers: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],
  assignRoles: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],
  manageCustomRoles: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],
  updateSettings: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],

  // Meeting Lifecycle
  createMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  updateMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  deleteMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  cancelMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  startMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  completeMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  manageAttendees: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  viewMeetings: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  rsvpMeeting: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],

  // Minutes
  createMinutes: [SystemRole.SECRETARY],
  updateMinutes: [SystemRole.SECRETARY],
  deleteMinutes: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  submitForReview: [SystemRole.SECRETARY],
  approveMinutes: [SystemRole.ORG_ADMIN],
  publishMinutes: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  viewMinutes: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],

  // Documents
  viewDocuments: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  uploadDocuments: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  updateDocuments: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  deleteDocuments: [SystemRole.ORG_ADMIN],

  // Polls & Voting
  createPoll: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  updatePoll: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  deletePoll: [SystemRole.ORG_ADMIN],
  viewPolls: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  castVote: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],

  // Tasks
  createTask: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  viewTasks: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  updateTask: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  deleteTask: [SystemRole.ORG_ADMIN],

  // Announcements
  createAnnouncement: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  updateAnnouncement: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  viewAnnouncements: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  deleteAnnouncement: [SystemRole.ORG_ADMIN],

  // Notifications
  viewNotifications: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  createNotification: [SystemRole.ORG_ADMIN, SystemRole.SECRETARY],
  manageOwnNotifications: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],

  // Settings
  viewOwnSettings: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  viewAllSettings: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],
  updateOrgSettings: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN],

  // Dashboard
  viewFinanceOverview: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
  viewAnalytics: [SystemRole.SUPER_ADMIN, SystemRole.ORG_ADMIN, SystemRole.SECRETARY, SystemRole.BOARD_MEMBER],
} as const;

/**
 * Helper function to check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof typeof RolePermissions): boolean {
  const allowedRoles = RolePermissions[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

/**
 * Helper function to check if role is admin level
 */
export function isAdminRole(role: UserRole): boolean {
  return role === SystemRole.SUPER_ADMIN || role === SystemRole.ORG_ADMIN;
}

/**
 * Helper function to check if role can manage organisation
 */
export function canManageOrganisation(role: UserRole): boolean {
  return role === SystemRole.SUPER_ADMIN || role === SystemRole.ORG_ADMIN;
}

/**
 * Helper function to get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    superAdmin: 'Super Admin',
    OrgAdmin: 'Organisation Admin',
    BoardMember: 'Board Member',
    secretary: 'Secretary',
  };
  return displayNames[role] || role;
}
