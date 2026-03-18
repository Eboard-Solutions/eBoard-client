// src/features/board-member/store.ts
// Full localStorage-backed store with seed data.
// Backend integration: replace each function body with an API call
// (the function signatures stay identical so pages need zero changes).

import type {
  Meeting, Document, Resolution, Task, Poll,
  Announcement, MessageThread, Message, Notification,
  UserProfile, ComplianceItem, AnalyticsData, Vote,
  Deliverable, Annotation,
} from './types';

// ─── IDs ─────────────────────────────────────────────────────────────────────

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Generic CRUD helpers ─────────────────────────────────────────────────────

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const K = {
  meetings:     'bm:meetings',
  documents:    'bm:documents',
  resolutions:  'bm:resolutions',
  tasks:        'bm:tasks',
  polls:        'bm:polls',
  announcements:'bm:announcements',
  threads:      'bm:threads',
  notifications:'bm:notifications',
  profile:      'bm:profile',
  compliance:   'bm:compliance',
  seeded:       'bm:seeded',
};

// ─── Current user stub (replace with authService.getUser() on backend) ────────

export const CURRENT_USER = {
  userId:   'user-001',
  name:     'Alex Johnson',
  firstName:'Alex',
  lastName: 'Johnson',
  email:    'alex.johnson@eboard.com',
  role:     'BoardMember',
  title:    'Non-Executive Director',
};

// ─── Seed data ────────────────────────────────────────────────────────────────

function seed() {
  if (localStorage.getItem(K.seeded)) return;

  // ── Meetings ──
  const meetings: Meeting[] = [
    {
      meetingId: 'mtg-001',
      title: 'Q1 2025 Board Review',
      description: 'Quarterly review of financial performance and strategic initiatives.',
      scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      endTime:     new Date(Date.now() + 2 * 86_400_000 + 7_200_000).toISOString(),
      location: 'Boardroom A, HQ Tower',
      meetingLink: 'https://zoom.us/j/boardroom',
      meetingType: 'BOARD',
      status: 'SCHEDULED',
      minutesAvailable: false,
      myRsvp: 'ACCEPTED',
      agenda: [
        { agendaId: 'ag-001', meetingId: 'mtg-001', title: 'Call to order & quorum', description: '', duration: 5,  order: 1, presenter: 'Chairperson', status: 'PENDING' },
        { agendaId: 'ag-002', meetingId: 'mtg-001', title: 'Approval of previous minutes', description: '', duration: 10, order: 2, presenter: 'Secretary', status: 'PENDING' },
        { agendaId: 'ag-003', meetingId: 'mtg-001', title: 'CFO Financial Report', description: 'Q4 financials and Q1 projections', duration: 30, order: 3, presenter: 'CFO', status: 'PENDING' },
        { agendaId: 'ag-004', meetingId: 'mtg-001', title: 'Strategic Initiatives Update', description: '', duration: 20, order: 4, presenter: 'CEO', status: 'PENDING' },
        { agendaId: 'ag-005', meetingId: 'mtg-001', title: 'AOB & Adjournment', description: '', duration: 10, order: 5, presenter: 'Chairperson', status: 'PENDING' },
      ],
      attendees: [
        { userId: 'user-001', name: 'Alex Johnson', email: 'alex@eboard.com', role: 'Board Member', rsvpStatus: 'ACCEPTED' },
        { userId: 'user-002', name: 'Sarah Chen', email: 'sarah@eboard.com', role: 'Chairperson', rsvpStatus: 'ACCEPTED' },
        { userId: 'user-003', name: 'Marcus Williams', email: 'marcus@eboard.com', role: 'CFO', rsvpStatus: 'ACCEPTED' },
        { userId: 'user-004', name: 'Priya Patel', email: 'priya@eboard.com', role: 'CEO', rsvpStatus: 'TENTATIVE' },
      ],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      meetingId: 'mtg-002',
      title: 'Audit Committee Meeting',
      description: 'Review of internal audit findings and compliance status.',
      scheduledAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      endTime:     new Date(Date.now() + 7 * 86_400_000 + 5_400_000).toISOString(),
      location: 'Conference Room B',
      meetingType: 'COMMITTEE',
      status: 'SCHEDULED',
      minutesAvailable: false,
      myRsvp: 'PENDING',
      agenda: [
        { agendaId: 'ag-006', meetingId: 'mtg-002', title: 'Internal Audit Report', description: '', duration: 25, order: 1, presenter: 'Head of Audit', status: 'PENDING' },
        { agendaId: 'ag-007', meetingId: 'mtg-002', title: 'Risk Register Review', description: '', duration: 20, order: 2, presenter: 'Risk Officer', status: 'PENDING' },
      ],
      attendees: [
        { userId: 'user-001', name: 'Alex Johnson', email: 'alex@eboard.com', role: 'Board Member', rsvpStatus: 'PENDING' },
        { userId: 'user-005', name: 'Diana Ross', email: 'diana@eboard.com', role: 'Audit Chair', rsvpStatus: 'ACCEPTED' },
      ],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    },
    {
      meetingId: 'mtg-003',
      title: 'Annual General Meeting 2024',
      description: 'Annual review of company performance and election of board members.',
      scheduledAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      endTime:     new Date(Date.now() - 30 * 86_400_000 + 10_800_000).toISOString(),
      location: 'Grand Ballroom, City Hotel',
      meetingType: 'ANNUAL',
      status: 'COMPLETED',
      minutesAvailable: true,
      minutes: 'The AGM was called to order at 10:00 AM. Quorum was confirmed with 87% attendance. All resolutions passed with required majority.',
      postMeetingSummary: 'Successfully completed AGM. Key decisions: approved annual report, re-elected board members, approved dividend of $0.45/share.',
      myRsvp: 'ACCEPTED',
      agenda: [],
      attendees: [
        { userId: 'user-001', name: 'Alex Johnson', email: 'alex@eboard.com', role: 'Board Member', rsvpStatus: 'ACCEPTED', attended: true },
        { userId: 'user-002', name: 'Sarah Chen', email: 'sarah@eboard.com', role: 'Chairperson', rsvpStatus: 'ACCEPTED', attended: true },
      ],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 29 * 86_400_000).toISOString(),
    },
  ];

  // ── Documents ──
  const documents: Document[] = [
    {
      documentId: 'doc-001',
      title: 'Q1 2025 Board Pack',
      description: 'Comprehensive board materials including financials, strategy updates, and risk reports.',
      fileUrl: '#',
      fileType: 'PDF',
      fileSize: 4_200_000,
      category: 'BOARD_PACK',
      uploadedBy: 'Sarah Chen',
      meetingId: 'mtg-001',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      version: 2,
      isConfidential: false,
      viewCount: 12,
      downloadCount: 5,
      tags: ['Q1', '2025', 'Board Pack'],
      annotations: [
        { annotationId: 'ann-001', documentId: 'doc-001', userId: 'user-001', userName: 'Alex Johnson', text: 'Review page 14 — revenue projections need clarification.', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
      ],
    },
    {
      documentId: 'doc-002',
      title: 'Corporate Governance Policy 2025',
      description: 'Updated governance framework incorporating new regulatory requirements.',
      fileUrl: '#',
      fileType: 'PDF',
      fileSize: 1_100_000,
      category: 'POLICY',
      uploadedBy: 'Company Secretary',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
      version: 3,
      isConfidential: false,
      viewCount: 8,
      downloadCount: 3,
      tags: ['Governance', 'Policy'],
      annotations: [],
    },
    {
      documentId: 'doc-003',
      title: 'Q4 2024 Financial Statements',
      description: 'Audited financial statements for the year ending December 2024.',
      fileUrl: '#',
      fileType: 'PDF',
      fileSize: 2_800_000,
      category: 'FINANCIAL',
      uploadedBy: 'Marcus Williams',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      version: 1,
      isConfidential: true,
      viewCount: 6,
      downloadCount: 2,
      tags: ['Financial', 'Q4', '2024', 'Audited'],
      annotations: [],
    },
    {
      documentId: 'doc-004',
      title: 'AGM 2024 Minutes',
      description: 'Official minutes from the Annual General Meeting held on 15 February 2024.',
      fileUrl: '#',
      fileType: 'PDF',
      fileSize: 890_000,
      category: 'MINUTES',
      uploadedBy: 'Company Secretary',
      meetingId: 'mtg-003',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 28 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 28 * 86_400_000).toISOString(),
      version: 1,
      isConfidential: false,
      viewCount: 15,
      downloadCount: 7,
      tags: ['AGM', '2024', 'Minutes'],
      annotations: [],
    },
  ];

  // ── Resolutions ──
  const resolutions: Resolution[] = [
    {
      resolutionId: 'res-001',
      title: 'Approval of Q4 2024 Financial Statements',
      description: 'Be it resolved that the Board approves the audited financial statements for the year ending 31 December 2024 as presented by the CFO, subject to any corrections identified by the external auditors.',
      status: 'OPEN',
      proposedBy: 'Marcus Williams (CFO)',
      secondedBy: 'Diana Ross',
      votingDeadline: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      votes: [
        { voteId: 'v-001', userId: 'user-002', userName: 'Sarah Chen', resolutionId: 'res-001', vote: 'FOR', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
        { voteId: 'v-002', userId: 'user-003', userName: 'Marcus Williams', resolutionId: 'res-001', vote: 'FOR', createdAt: new Date(Date.now() - 43_200_000).toISOString() },
      ],
      totalVotes: 2,
      votesFor: 2,
      votesAgainst: 0,
      abstentions: 0,
      quorumRequired: 4,
      myVote: null,
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      resolutionId: 'res-002',
      title: 'Appointment of External Auditor for FY2025',
      description: 'Be it resolved that Deloitte & Touche LLP be re-appointed as the Company\'s external auditors for the financial year ending 31 December 2025, at a fee to be agreed upon by the Audit Committee.',
      status: 'PASSED',
      proposedBy: 'Diana Ross (Audit Chair)',
      votingDeadline: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      votes: [
        { voteId: 'v-003', userId: 'user-001', userName: 'Alex Johnson', resolutionId: 'res-002', vote: 'FOR', createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
        { voteId: 'v-004', userId: 'user-002', userName: 'Sarah Chen', resolutionId: 'res-002', vote: 'FOR', createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
        { voteId: 'v-005', userId: 'user-003', userName: 'Marcus Williams', resolutionId: 'res-002', vote: 'FOR', createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
        { voteId: 'v-006', userId: 'user-005', userName: 'Diana Ross', resolutionId: 'res-002', vote: 'FOR', createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
      ],
      totalVotes: 4,
      votesFor: 4,
      votesAgainst: 0,
      abstentions: 0,
      quorumRequired: 4,
      outcome: 'Resolution passed unanimously. Deloitte & Touche LLP re-appointed.',
      myVote: 'FOR',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    },
    {
      resolutionId: 'res-003',
      title: 'Capital Expenditure Approval — Digital Transformation',
      description: 'Be it resolved that the Board approves a capital expenditure budget of $2.5 million for the digital transformation programme as outlined in the CEO\'s presentation, to be funded from existing reserves.',
      status: 'OPEN',
      proposedBy: 'Priya Patel (CEO)',
      votingDeadline: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      votes: [],
      totalVotes: 0,
      votesFor: 0,
      votesAgainst: 0,
      abstentions: 0,
      quorumRequired: 4,
      myVote: null,
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    },
  ];

  // ── Tasks ──
  const tasks: Task[] = [
    {
      taskId: 'task-001',
      title: 'Review Q1 Board Pack',
      description: 'Thoroughly review all materials in the Q1 2025 Board Pack ahead of the board meeting. Pay particular attention to revenue projections on page 14.',
      assignedTo: 'user-001',
      assignedToName: 'Alex Johnson',
      assignedBy: 'Sarah Chen',
      dueDate: new Date(Date.now() + 1 * 86_400_000).toISOString(),
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      progress: 65,
      deliverables: [],
      meetingId: 'mtg-001',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
      notes: 'Focusing on financial section first. Will complete governance section tomorrow.',
    },
    {
      taskId: 'task-002',
      title: 'Submit Board Member Disclosure Form',
      description: 'Complete and submit the annual conflict of interest and related party disclosure form for FY2025.',
      assignedTo: 'user-001',
      assignedToName: 'Alex Johnson',
      assignedBy: 'Company Secretary',
      dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      status: 'PENDING',
      priority: 'MEDIUM',
      progress: 0,
      deliverables: [],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      notes: '',
    },
    {
      taskId: 'task-003',
      title: 'Provide Feedback on Digital Strategy',
      description: 'Review the digital transformation proposal and submit written feedback to the CEO by end of week.',
      assignedTo: 'user-001',
      assignedToName: 'Alex Johnson',
      assignedBy: 'Priya Patel',
      dueDate: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      status: 'OVERDUE',
      priority: 'HIGH',
      progress: 30,
      deliverables: [],
      resolutionId: 'res-003',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      notes: 'Partial notes prepared. Need to finalise financial impact section.',
    },
    {
      taskId: 'task-004',
      title: 'Complete Governance Training Module',
      description: 'Complete the mandatory annual governance and ethics training module on the board portal.',
      assignedTo: 'user-001',
      assignedToName: 'Alex Johnson',
      assignedBy: 'Company Secretary',
      dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      status: 'COMPLETED',
      priority: 'LOW',
      progress: 100,
      deliverables: [
        { deliverableId: 'del-001', taskId: 'task-004', title: 'Training Certificate', fileUrl: '#', submittedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(), submittedBy: 'Alex Johnson' },
      ],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      notes: 'Completed. Certificate uploaded.',
    },
  ];

  // ── Polls ──
  const polls: Poll[] = [
    {
      pollId: 'poll-001',
      question: 'Board Meeting Format Preference for H2 2025',
      description: 'Please indicate your preferred format for board meetings in the second half of 2025.',
      options: [
        { optionId: 'opt-001', label: 'In-person only', votes: 1, voterIds: ['user-002'] },
        { optionId: 'opt-002', label: 'Hybrid (in-person + virtual)', votes: 2, voterIds: ['user-003', 'user-005'] },
        { optionId: 'opt-003', label: 'Fully virtual', votes: 0, voterIds: [] },
      ],
      status: 'ACTIVE',
      pollType: 'SINGLE',
      isAnonymous: false,
      deadline: new Date(Date.now() + 4 * 86_400_000).toISOString(),
      createdBy: 'Sarah Chen',
      totalResponses: 3,
      auditTrail: [
        { entryId: 'ae-001', userId: 'user-002', userName: 'Sarah Chen', action: 'VOTED', timestamp: new Date(Date.now() - 2 * 86_400_000).toISOString(), details: 'Voted: In-person only' },
      ],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
    {
      pollId: 'poll-002',
      question: 'Priority Committees for 2025',
      description: 'Select up to 2 committees that should be given increased focus and resources in 2025.',
      options: [
        { optionId: 'opt-004', label: 'Audit & Risk Committee', votes: 3, voterIds: ['user-001', 'user-002', 'user-003'] },
        { optionId: 'opt-005', label: 'Remuneration Committee', votes: 1, voterIds: ['user-005'] },
        { optionId: 'opt-006', label: 'Nominations Committee', votes: 2, voterIds: ['user-002', 'user-005'] },
        { optionId: 'opt-007', label: 'ESG & Sustainability Committee', votes: 2, voterIds: ['user-001', 'user-003'] },
      ],
      status: 'CLOSED',
      pollType: 'MULTIPLE',
      isAnonymous: true,
      deadline: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      createdBy: 'Priya Patel',
      myResponse: ['opt-004', 'opt-007'],
      totalResponses: 4,
      auditTrail: [],
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
    },
  ];

  // ── Announcements ──
  const announcements: Announcement[] = [
    {
      announcementId: 'ann-001',
      title: 'Q1 Board Pack Now Available',
      content: 'The Q1 2025 Board Pack has been uploaded to the documents section. Please review all materials before the board meeting on ' + new Date(Date.now() + 2 * 86_400_000).toLocaleDateString() + '. Pay special attention to the financial statements and the CEO\'s strategic update.',
      priority: 'HIGH',
      authorId: 'user-002',
      authorName: 'Sarah Chen',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      isRead: false,
      isPinned: true,
      audience: 'ALL',
    },
    {
      announcementId: 'ann-002',
      title: 'Reminder: Annual Disclosure Forms Due',
      content: 'All board members are reminded to complete and submit their annual conflict of interest and related party disclosure forms by end of month. Please use the compliance section of the portal. Contact the Company Secretary if you have any questions.',
      priority: 'URGENT',
      authorId: 'sec-001',
      authorName: 'Company Secretary',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      isRead: false,
      isPinned: false,
      audience: 'BOARD_MEMBERS',
    },
    {
      announcementId: 'ann-003',
      title: 'Welcome to the New Board Portal',
      content: 'We are pleased to announce the launch of our new E-Board MIS portal. This platform brings all board activities together — meetings, documents, resolutions, tasks, and communications — in one secure place. Please explore the features and contact support if you need assistance.',
      priority: 'NORMAL',
      authorId: 'user-004',
      authorName: 'Priya Patel',
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      isRead: true,
      isPinned: false,
      audience: 'ALL',
    },
  ];

  // ── Threads ──
  const threads: MessageThread[] = [
    {
      threadId: 'thread-001',
      subject: 'Q1 Meeting Agenda — Feedback Requested',
      participants: ['user-001', 'user-002', 'user-004'],
      participantNames: ['Alex Johnson', 'Sarah Chen', 'Priya Patel'],
      isGroup: true,
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      lastMessage: 'Happy with the agenda. See everyone there.',
      messages: [
        { messageId: 'msg-001', threadId: 'thread-001', senderId: 'user-002', senderName: 'Sarah Chen', content: 'Dear Board Members, please review the draft agenda for Q1 meeting and provide any feedback by tomorrow.', createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(), readBy: ['user-001', 'user-002', 'user-004'], isDeleted: false },
        { messageId: 'msg-002', threadId: 'thread-001', senderId: 'user-004', senderName: 'Priya Patel', content: 'Agenda looks good. I\'d suggest adding a 10-minute slot for the digital strategy update.', createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(), readBy: ['user-001', 'user-002', 'user-004'], isDeleted: false },
        { messageId: 'msg-003', threadId: 'thread-001', senderId: 'user-001', senderName: 'Alex Johnson', content: 'Happy with the agenda. See everyone there.', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), readBy: ['user-001'], isDeleted: false },
      ],
    },
    {
      threadId: 'thread-002',
      subject: 'Direct: Financial query',
      participants: ['user-001', 'user-003'],
      participantNames: ['Alex Johnson', 'Marcus Williams'],
      isGroup: false,
      organisationId: 'org-001',
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
      lastMessage: 'I will circulate a detailed note before the meeting.',
      messages: [
        { messageId: 'msg-004', threadId: 'thread-002', senderId: 'user-001', senderName: 'Alex Johnson', content: 'Marcus, could you clarify the revenue variance on page 14 of the board pack?', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), readBy: ['user-001', 'user-003'], isDeleted: false },
        { messageId: 'msg-005', threadId: 'thread-002', senderId: 'user-003', senderName: 'Marcus Williams', content: 'Sure Alex. The variance is due to FX impact and one-off restructuring costs. I will circulate a detailed note before the meeting.', createdAt: new Date(Date.now() - 86_400_000).toISOString(), readBy: ['user-003'], isDeleted: false },
      ],
    },
  ];

  // ── Notifications ──
  const notifications: Notification[] = [
    { notificationId: 'notif-001', userId: 'user-001', type: 'MEETING',      title: 'Meeting Tomorrow',         body: 'Q1 2025 Board Review is scheduled for tomorrow at 9:00 AM.',           isRead: false, createdAt: new Date(Date.now() - 86_400_000).toISOString() },
    { notificationId: 'notif-002', userId: 'user-001', type: 'TASK',         title: 'Task Overdue',             body: 'Provide Feedback on Digital Strategy is now overdue.',                 isRead: false, createdAt: new Date(Date.now() - 3_600_000).toISOString() },
    { notificationId: 'notif-003', userId: 'user-001', type: 'RESOLUTION',   title: 'New Resolution to Vote',   body: 'Capital Expenditure Approval requires your vote.',                     isRead: false, createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString() },
    { notificationId: 'notif-004', userId: 'user-001', type: 'DOCUMENT',     title: 'New Document Uploaded',    body: 'Q1 2025 Board Pack is now available for review.',                       isRead: true,  createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    { notificationId: 'notif-005', userId: 'user-001', type: 'ANNOUNCEMENT', title: 'Disclosure Forms Due',     body: 'Annual conflict of interest disclosure forms are due end of month.',    isRead: false, createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString() },
    { notificationId: 'notif-006', userId: 'user-001', type: 'POLL',         title: 'Poll Awaiting Response',   body: 'Board Meeting Format Preference poll closes in 4 days.',               isRead: true,  createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { notificationId: 'notif-007', userId: 'user-001', type: 'MESSAGE',      title: 'New Message from Marcus',  body: 'Marcus Williams replied to your query about financial variance.',       isRead: false, createdAt: new Date(Date.now() - 86_400_000).toISOString() },
  ];

  // ── Profile ──
  const profile: UserProfile = {
    userId: 'user-001',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@eboard.com',
    phone: '+1 (555) 234-5678',
    bio: 'Non-Executive Director with 15 years experience in financial services and corporate governance.',
    role: 'BoardMember',
    title: 'Non-Executive Director',
    organisation: 'Acme Corporation',
    twoFactorEnabled: false,
    notificationPreferences: { meetings: true, tasks: true, documents: true, resolutions: true, announcements: true, messages: true },
    theme: 'light',
    language: 'en',
    timezone: 'America/New_York',
    joinedAt: new Date(Date.now() - 365 * 86_400_000).toISOString(),
  };

  // ── Compliance ──
  const compliance: ComplianceItem[] = [
    { complianceId: 'comp-001', title: 'Annual Conflict of Interest Disclosure', description: 'All board members must disclose any potential conflicts of interest annually.', type: 'DISCLOSURE', dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString(), isAcknowledged: false, organisationId: 'org-001', createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString() },
    { complianceId: 'comp-002', title: 'Corporate Governance Code Acknowledgment', description: 'Acknowledge receipt and understanding of the updated Corporate Governance Code 2025.', type: 'ACKNOWLEDGMENT', dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(), isAcknowledged: false, documentUrl: '#', organisationId: 'org-001', createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString() },
    { complianceId: 'comp-003', title: 'Data Protection Policy', description: 'Annual acknowledgment of the company\'s data protection and privacy policy.', type: 'POLICY', isAcknowledged: true, acknowledgedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(), documentUrl: '#', organisationId: 'org-001', createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString() },
    { complianceId: 'comp-004', title: 'Securities Trading Policy', description: 'Acknowledge the insider trading and securities dealing policy.', type: 'REGULATORY', dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString(), isAcknowledged: true, acknowledgedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(), organisationId: 'org-001', createdAt: new Date(Date.now() - 45 * 86_400_000).toISOString() },
  ];

  // Write all seed data
  write(K.meetings,      meetings);
  write(K.documents,     documents);
  write(K.resolutions,   resolutions);
  write(K.tasks,         tasks);
  write(K.polls,         polls);
  write(K.announcements, announcements);
  write(K.threads,       threads);
  write(K.notifications, notifications);
  write(K.compliance,    compliance);
  localStorage.setItem(K.profile,  JSON.stringify(profile));
  localStorage.setItem(K.seeded,   '1');
}

// Run seed on import
seed();

// ─── MEETINGS ─────────────────────────────────────────────────────────────────

export const meetingStore = {
  getAll:    (): Meeting[]          => read<Meeting>(K.meetings),
  getById:   (id: string)           => read<Meeting>(K.meetings).find(m => m.meetingId === id) ?? null,
  create:    (m: Meeting)           => write(K.meetings, [...read<Meeting>(K.meetings), m]),
  update:    (id: string, data: Partial<Meeting>) => write(K.meetings, read<Meeting>(K.meetings).map(m => m.meetingId === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m)),
  delete:    (id: string)           => write(K.meetings, read<Meeting>(K.meetings).filter(m => m.meetingId !== id)),
  rsvp:      (meetingId: string, status: Meeting['myRsvp']) => {
    const meetings = read<Meeting>(K.meetings);
    write(K.meetings, meetings.map(m => {
      if (m.meetingId !== meetingId) return m;
      return {
        ...m,
        myRsvp: status,
        attendees: m.attendees.map(a => a.userId === CURRENT_USER.userId ? { ...a, rsvpStatus: status as any } : a),
        updatedAt: new Date().toISOString(),
      };
    }));
  },
};

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export const documentStore = {
  getAll:      (): Document[]             => read<Document>(K.documents),
  getById:     (id: string)               => read<Document>(K.documents).find(d => d.documentId === id) ?? null,
  create:      (d: Document)              => write(K.documents, [...read<Document>(K.documents), d]),
  update:      (id: string, data: Partial<Document>) => write(K.documents, read<Document>(K.documents).map(d => d.documentId === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d)),
  delete:      (id: string)               => write(K.documents, read<Document>(K.documents).filter(d => d.documentId !== id)),
  incrementView:(id: string)              => {
    write(K.documents, read<Document>(K.documents).map(d => d.documentId === id ? { ...d, viewCount: d.viewCount + 1 } : d));
  },
  incrementDownload:(id: string)          => {
    write(K.documents, read<Document>(K.documents).map(d => d.documentId === id ? { ...d, downloadCount: d.downloadCount + 1 } : d));
  },
  addAnnotation:(id: string, text: string) => {
    const annotation: Annotation = { annotationId: uid(), documentId: id, userId: CURRENT_USER.userId, userName: CURRENT_USER.name, text, createdAt: new Date().toISOString() };
    write(K.documents, read<Document>(K.documents).map(d => d.documentId === id ? { ...d, annotations: [...d.annotations, annotation] } : d));
    return annotation;
  },
  deleteAnnotation:(docId: string, annotationId: string) => {
    write(K.documents, read<Document>(K.documents).map(d => d.documentId === docId ? { ...d, annotations: d.annotations.filter(a => a.annotationId !== annotationId) } : d));
  },
};

// ─── RESOLUTIONS ──────────────────────────────────────────────────────────────

export const resolutionStore = {
  getAll:  (): Resolution[]           => read<Resolution>(K.resolutions),
  getById: (id: string)               => read<Resolution>(K.resolutions).find(r => r.resolutionId === id) ?? null,
  create:  (r: Resolution)            => write(K.resolutions, [...read<Resolution>(K.resolutions), r]),
  update:  (id: string, data: Partial<Resolution>) => write(K.resolutions, read<Resolution>(K.resolutions).map(r => r.resolutionId === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r)),
  delete:  (id: string)               => write(K.resolutions, read<Resolution>(K.resolutions).filter(r => r.resolutionId !== id)),
  castVote:(resolutionId: string, voteChoice: 'FOR' | 'AGAINST' | 'ABSTAIN', comment?: string) => {
    const resolutions = read<Resolution>(K.resolutions);
    write(K.resolutions, resolutions.map(r => {
      if (r.resolutionId !== resolutionId) return r;
      // Remove any existing vote from this user
      const otherVotes = r.votes.filter(v => v.userId !== CURRENT_USER.userId);
      const newVote: Vote = { voteId: uid(), userId: CURRENT_USER.userId, userName: CURRENT_USER.name, resolutionId, vote: voteChoice, comment, createdAt: new Date().toISOString() };
      const allVotes = [...otherVotes, newVote];
      return {
        ...r,
        votes: allVotes,
        myVote: voteChoice,
        totalVotes: allVotes.length,
        votesFor:     allVotes.filter(v => v.vote === 'FOR').length,
        votesAgainst: allVotes.filter(v => v.vote === 'AGAINST').length,
        abstentions:  allVotes.filter(v => v.vote === 'ABSTAIN').length,
        updatedAt: new Date().toISOString(),
      };
    }));
  },
};

// ─── TASKS ────────────────────────────────────────────────────────────────────

export const taskStore = {
  getAll:           (): Task[]            => read<Task>(K.tasks),
  getMine:          ()                    => read<Task>(K.tasks).filter(t => t.assignedTo === CURRENT_USER.userId),
  getById:          (id: string)          => read<Task>(K.tasks).find(t => t.taskId === id) ?? null,
  create:           (t: Task)             => write(K.tasks, [...read<Task>(K.tasks), t]),
  update:           (id: string, data: Partial<Task>) => write(K.tasks, read<Task>(K.tasks).map(t => t.taskId === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)),
  delete:           (id: string)          => write(K.tasks, read<Task>(K.tasks).filter(t => t.taskId !== id)),
  updateProgress:   (id: string, progress: number, status?: Task['status']) => {
    const s = status ?? (progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'PENDING');
    taskStore.update(id, { progress, status: s });
  },
  addDeliverable:   (taskId: string, title: string) => {
    const d: Deliverable = { deliverableId: uid(), taskId, title, submittedAt: new Date().toISOString(), submittedBy: CURRENT_USER.name };
    taskStore.update(taskId, { deliverables: [...(taskStore.getById(taskId)?.deliverables ?? []), d] });
    return d;
  },
};

// ─── POLLS ────────────────────────────────────────────────────────────────────

export const pollStore = {
  getAll:  (): Poll[]               => read<Poll>(K.polls),
  getById: (id: string)             => read<Poll>(K.polls).find(p => p.pollId === id) ?? null,
  create:  (p: Poll)                => write(K.polls, [...read<Poll>(K.polls), p]),
  update:  (id: string, data: Partial<Poll>) => write(K.polls, read<Poll>(K.polls).map(p => p.pollId === id ? { ...p, ...data } : p)),
  delete:  (id: string)             => write(K.polls, read<Poll>(K.polls).filter(p => p.pollId !== id)),
  respond: (pollId: string, optionIds: string[]) => {
    const polls = read<Poll>(K.polls);
    write(K.polls, polls.map(p => {
      if (p.pollId !== pollId) return p;
      const entry: AuditEntry = { entryId: uid(), userId: CURRENT_USER.userId, userName: CURRENT_USER.name, action: 'VOTED', timestamp: new Date().toISOString(), details: `Selected: ${optionIds.join(', ')}` };
      const updatedOptions = p.options.map(o => {
        const wasSelected = (p.myResponse ?? []).includes(o.optionId);
        const isSelected  = optionIds.includes(o.optionId);
        if (wasSelected === isSelected) return o;
        return { ...o, votes: isSelected ? o.votes + 1 : Math.max(0, o.votes - 1), voterIds: isSelected ? [...o.voterIds, CURRENT_USER.userId] : o.voterIds.filter(id => id !== CURRENT_USER.userId) };
      });
      const wasNew = !p.myResponse?.length;
      return { ...p, options: updatedOptions, myResponse: optionIds, totalResponses: wasNew ? p.totalResponses + 1 : p.totalResponses, auditTrail: [...p.auditTrail, entry] };
    }));
  },
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

export const announcementStore = {
  getAll:   (): Announcement[]      => read<Announcement>(K.announcements),
  getById:  (id: string)            => read<Announcement>(K.announcements).find(a => a.announcementId === id) ?? null,
  create:   (a: Announcement)       => write(K.announcements, [...read<Announcement>(K.announcements), a]),
  update:   (id: string, data: Partial<Announcement>) => write(K.announcements, read<Announcement>(K.announcements).map(a => a.announcementId === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a)),
  delete:   (id: string)            => write(K.announcements, read<Announcement>(K.announcements).filter(a => a.announcementId !== id)),
  markRead: (id: string)            => announcementStore.update(id, { isRead: true }),
  markAllRead: ()                   => write(K.announcements, read<Announcement>(K.announcements).map(a => ({ ...a, isRead: true }))),
};

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export const messageStore = {
  getThreads:    (): MessageThread[]   => read<MessageThread>(K.threads).filter(t => t.participants.includes(CURRENT_USER.userId)),
  getThread:     (id: string)          => read<MessageThread>(K.threads).find(t => t.threadId === id) ?? null,
  createThread:  (t: MessageThread)    => write(K.threads, [...read<MessageThread>(K.threads), t]),
  sendMessage:   (threadId: string, content: string): Message => {
    const msg: Message = { messageId: uid(), threadId, senderId: CURRENT_USER.userId, senderName: CURRENT_USER.name, content, createdAt: new Date().toISOString(), readBy: [CURRENT_USER.userId], isDeleted: false };
    write(K.threads, read<MessageThread>(K.threads).map(t => t.threadId === threadId ? { ...t, messages: [...t.messages, msg], lastMessage: content, updatedAt: new Date().toISOString() } : t));
    return msg;
  },
  deleteMessage: (threadId: string, messageId: string) => {
    write(K.threads, read<MessageThread>(K.threads).map(t => t.threadId === threadId ? { ...t, messages: t.messages.map(m => m.messageId === messageId ? { ...m, isDeleted: true, content: 'This message was deleted.' } : m) } : t));
  },
  markThreadRead:(threadId: string) => {
    write(K.threads, read<MessageThread>(K.threads).map(t => t.threadId === threadId ? { ...t, messages: t.messages.map(m => ({ ...m, readBy: m.readBy.includes(CURRENT_USER.userId) ? m.readBy : [...m.readBy, CURRENT_USER.userId] })) } : t));
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notificationStore = {
  getAll:      (): Notification[]   => read<Notification>(K.notifications).filter(n => n.userId === CURRENT_USER.userId),
  getUnread:   ()                   => notificationStore.getAll().filter(n => !n.isRead),
  markRead:    (id: string)         => write(K.notifications, read<Notification>(K.notifications).map(n => n.notificationId === id ? { ...n, isRead: true } : n)),
  markAllRead: ()                   => write(K.notifications, read<Notification>(K.notifications).map(n => n.userId === CURRENT_USER.userId ? { ...n, isRead: true } : n)),
  add:         (n: Notification)    => write(K.notifications, [...read<Notification>(K.notifications), n]),
  delete:      (id: string)         => write(K.notifications, read<Notification>(K.notifications).filter(n => n.notificationId !== id)),
};

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export const profileStore = {
  get:    (): UserProfile           => JSON.parse(localStorage.getItem(K.profile) ?? 'null') ?? { ...CURRENT_USER, twoFactorEnabled: false, notificationPreferences: { meetings: true, tasks: true, documents: true, resolutions: true, announcements: true, messages: true }, theme: 'light', language: 'en', timezone: 'America/New_York', joinedAt: new Date().toISOString(), organisation: 'Acme Corporation' },
  update: (data: Partial<UserProfile>) => {
    const current = profileStore.get();
    localStorage.setItem(K.profile, JSON.stringify({ ...current, ...data }));
  },
};

// ─── COMPLIANCE ───────────────────────────────────────────────────────────────

export const complianceStore = {
  getAll:       (): ComplianceItem[] => read<ComplianceItem>(K.compliance),
  acknowledge:  (id: string)         => write(K.compliance, read<ComplianceItem>(K.compliance).map(c => c.complianceId === id ? { ...c, isAcknowledged: true, acknowledgedAt: new Date().toISOString() } : c)),
};

// ─── ANALYTICS (computed from live data) ─────────────────────────────────────

export function getAnalytics(): AnalyticsData {
  const meetings   = meetingStore.getAll();
  const tasks      = taskStore.getMine();
  const resolutions= resolutionStore.getAll();
  const docs       = documentStore.getAll();

  const completedMeetings = meetings.filter(m => m.status === 'COMPLETED');
  const attendedMeetings  = completedMeetings.filter(m => m.attendees.find(a => a.userId === CURRENT_USER.userId)?.attended);
  const attendanceRate    = completedMeetings.length > 0 ? Math.round((attendedMeetings.length / completedMeetings.length) * 100) : 100;

  const doneTasks   = tasks.filter(t => t.status === 'COMPLETED');
  const taskCompletionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const openRes = resolutions.filter(r => r.status === 'OPEN' || r.status === 'PASSED');
  const votedRes = openRes.filter(r => r.myVote !== null && r.myVote !== undefined);
  const votingParticipationRate = openRes.length > 0 ? Math.round((votedRes.length / openRes.length) * 100) : 100;

  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const meetingsThisQuarter = meetings.filter(m => new Date(m.scheduledAt) >= quarterStart).length;

  // Month-by-month trend (last 6 months)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.toLocaleString('default', { month: 'short' });
    const mMeetings = meetings.filter(m => { const md = new Date(m.scheduledAt); return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear(); }).length;
    const mTasks    = tasks.filter(t => { const td = new Date(t.createdAt); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); }).length;
    const mVotes    = resolutions.filter(r => r.votes.some(v => v.userId === CURRENT_USER.userId && new Date(v.createdAt).getMonth() === d.getMonth())).length;
    return { month, meetings: mMeetings, tasks: mTasks, votes: mVotes };
  });

  return { attendanceRate, taskCompletionRate, votingParticipationRate, meetingsThisQuarter, documentsReviewed: docs.reduce((s, d) => s + d.viewCount, 0), resolutionsPassed: resolutions.filter(r => r.status === 'PASSED').length, avgMeetingDuration: 90, monthlyTrend };
}