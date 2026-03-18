// src/features/board-member/types.ts

export interface Meeting {
  meetingId: string;
  title: string;
  description: string;
  scheduledAt: string;
  endTime: string;
  location: string;
  meetingLink?: string;
  meetingType: 'BOARD' | 'COMMITTEE' | 'ANNUAL' | 'SPECIAL' | 'EMERGENCY';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  agenda: AgendaItem[];
  attendees: Attendee[];
  minutes?: string;
  postMeetingSummary?: string;
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  minutesAvailable: boolean;
  myRsvp?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'PENDING';
}

export interface AgendaItem {
  agendaId: string;
  meetingId: string;
  title: string;
  description: string;
  duration: number;
  order: number;
  presenter: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';
}

export interface Attendee {
  userId: string;
  name: string;
  email: string;
  role: string;
  rsvpStatus: 'ACCEPTED' | 'DECLINED' | 'PENDING' | 'TENTATIVE';
  attended?: boolean;
}

export interface Document {
  documentId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: 'BOARD_PACK' | 'MINUTES' | 'AGENDA' | 'REPORT' | 'POLICY' | 'FINANCIAL' | 'LEGAL' | 'OTHER';
  uploadedBy: string;
  meetingId?: string;
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isConfidential: boolean;
  viewCount: number;
  downloadCount: number;
  tags: string[];
  annotations: Annotation[];
}

export interface Annotation {
  annotationId: string;
  documentId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Resolution {
  resolutionId: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'OPEN' | 'PASSED' | 'REJECTED' | 'DEFERRED' | 'WITHDRAWN';
  meetingId?: string;
  proposedBy: string;
  secondedBy?: string;
  votingDeadline: string;
  votes: Vote[];
  totalVotes: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  quorumRequired: number;
  outcome?: string;
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  myVote?: 'FOR' | 'AGAINST' | 'ABSTAIN' | null;
}

export interface Vote {
  voteId: string;
  userId: string;
  userName: string;
  resolutionId: string;
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
  comment?: string;
  createdAt: string;
}

export interface Task {
  taskId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  progress: number; // 0–100
  deliverables: Deliverable[];
  meetingId?: string;
  resolutionId?: string;
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  reminderAt?: string;
  notes: string;
}

export interface Deliverable {
  deliverableId: string;
  taskId: string;
  title: string;
  fileUrl?: string;
  submittedAt: string;
  submittedBy: string;
}

export interface Poll {
  pollId: string;
  question: string;
  description?: string;
  options: PollOption[];
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  pollType: 'SINGLE' | 'MULTIPLE';
  isAnonymous: boolean;
  deadline: string;
  createdBy: string;
  myResponse?: string[];
  totalResponses: number;
  auditTrail: AuditEntry[];
  organisationId: string;
  createdAt: string;
}

export interface PollOption {
  optionId: string;
  label: string;
  votes: number;
  voterIds: string[];
}

export interface AuditEntry {
  entryId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface Announcement {
  announcementId: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  authorId: string;
  authorName: string;
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  isRead: boolean;
  isPinned: boolean;
  audience: 'ALL' | 'BOARD_MEMBERS' | 'ADMINS';
}

export interface Message {
  messageId: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  readBy: string[];
  isDeleted: boolean;
}

export interface MessageThread {
  threadId: string;
  subject: string;
  participants: string[];
  participantNames: string[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  isGroup: boolean;
  organisationId: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: 'MEETING' | 'TASK' | 'DOCUMENT' | 'RESOLUTION' | 'POLL' | 'ANNOUNCEMENT' | 'MESSAGE';
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  title?: string;
  organisation: string;
  twoFactorEnabled: boolean;
  notificationPreferences: {
    meetings: boolean;
    tasks: boolean;
    documents: boolean;
    resolutions: boolean;
    announcements: boolean;
    messages: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  joinedAt: string;
}

export interface ComplianceItem {
  complianceId: string;
  title: string;
  description: string;
  type: 'POLICY' | 'DISCLOSURE' | 'REGULATORY' | 'ACKNOWLEDGMENT';
  dueDate?: string;
  acknowledgedAt?: string;
  isAcknowledged: boolean;
  documentUrl?: string;
  organisationId: string;
  createdAt: string;
}

export interface AnalyticsData {
  attendanceRate: number;
  taskCompletionRate: number;
  votingParticipationRate: number;
  meetingsThisQuarter: number;
  documentsReviewed: number;
  resolutionsPassed: number;
  avgMeetingDuration: number;
  monthlyTrend: { month: string; meetings: number; tasks: number; votes: number }[];
}