import { User, Meeting, Task, Poll, Notification, Role, AuditLogEntry, UserActivity, Permission } from '@/types';

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

// Local Document type (mirror of the expected shape) to avoid relying on a non-exported name from '@/types'
export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  tags: string[];
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  accessLevel: string;
}

// Mock login history for users
const generateLoginHistory = (userId: string): UserActivity[] => {
  const actions = ['Login', 'Viewed Dashboard', 'Updated Profile', 'Joined Meeting', 'Uploaded Document'];
  return Array.from({ length: 5 }, (_, i) => ({
    id: `activity-${i}`,
    userId,
    action: actions[i % actions.length],
    ipAddress: `192.168.1.${100 + i}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

// Default roles with permissions
export const roles: Role[] = [
  {
    id: 'role-1',
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: [
      'view_members', 'edit_members', 'delete_members', 'manage_roles',
      'view_meetings', 'create_meetings', 'edit_meetings', 'delete_meetings',
      'view_documents', 'upload_documents', 'delete_documents',
      'view_finance', 'manage_finance', 'view_announcements', 'publish_announcements',
      'view_reports', 'manage_settings', 'view_audit_log'
    ] as Permission[],
    isDefault: false,
    isCritical: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-2',
    name: 'Admin',
    description: 'Administrative access with member and content management',
    permissions: [
      'view_members', 'edit_members', 'manage_roles',
      'view_meetings', 'create_meetings', 'edit_meetings',
      'view_documents', 'upload_documents',
      'view_finance', 'view_announcements', 'publish_announcements',
      'view_reports', 'view_audit_log'
    ] as Permission[],
    isDefault: false,
    isCritical: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-3',
    name: 'Board Member',
    description: 'Standard board member with meeting and document access',
    permissions: [
      'view_members', 'view_meetings', 'create_meetings',
      'view_documents', 'upload_documents',
      'view_announcements', 'view_reports'
    ] as Permission[],
    isDefault: true,
    isCritical: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'role-4',
    name: 'Guest',
    description: 'Limited read-only access',
    permissions: [
      'view_members', 'view_meetings', 'view_documents', 'view_announcements'
    ] as Permission[],
    isDefault: false,
    isCritical: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Mock audit log entries
export const auditLogs: AuditLogEntry[] = [
  {
    id: 'audit-1',
    userId: '1',
    userName: 'Sarah Johnson',
    action: 'role_changed',
    targetUserId: '2',
    targetUserName: 'Michael Chen',
    previousValue: 'board_member',
    newValue: 'admin',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit-2',
    userId: '1',
    userName: 'Sarah Johnson',
    action: 'member_removed',
    targetUserId: '6',
    targetUserName: 'John Smith',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit-3',
    userId: '2',
    userName: 'Michael Chen',
    action: 'status_updated',
    targetUserId: '3',
    targetUserName: 'Emily Rodriguez',
    previousValue: 'active',
    newValue: 'suspended',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.101'
  },
  {
    id: 'audit-4',
    userId: '1',
    userName: 'Sarah Johnson',
    action: 'member_created',
    targetUserId: '7',
    targetUserName: 'New Member',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.100'
  },
  {
    id: 'audit-5',
    userId: '1',
    userName: 'Sarah Johnson',
    action: 'bulk_action',
    targetUserName: '3 members',
    previousValue: 'No department',
    newValue: 'Finance',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.100'
  }
];

// Current user - can be changed to simulate different roles
export const currentUser: User = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@eboard.com',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  role: 'admin',
  position: 'Board President',
  department: 'Executive',
  phone: '+1 (555) 123-4567',
  termStartDate: '2024-01-01',
  termEndDate: '2025-12-31',
  committees: ['Finance', 'Strategy'],
  status: 'active',
  lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  createdAt: '2023-06-15T00:00:00Z',
  twoFactorEnabled: true,
  loginHistory: generateLoginHistory('1')
};

// Mock users with enhanced data
export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@eboard.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    role: 'admin',
    position: 'Vice President',
    department: 'Operations',
    phone: '+1 (555) 234-5678',
    committees: ['Operations', 'Technology'],
    status: 'active',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: '2023-07-20T00:00:00Z',
    twoFactorEnabled: false,
    loginHistory: generateLoginHistory('2')
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@eboard.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    role: 'board_member',
    position: 'Treasurer',
    department: 'Finance',
    committees: ['Finance', 'Audit'],
    status: 'active',
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2023-08-10T00:00:00Z',
    twoFactorEnabled: true,
    loginHistory: generateLoginHistory('3')
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@eboard.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    role: 'board_member',
    position: 'Secretary',
    department: 'Administration',
    committees: ['Governance', 'Communications'],
    status: 'active',
    lastLogin: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    createdAt: '2023-09-01T00:00:00Z',
    twoFactorEnabled: false,
    loginHistory: generateLoginHistory('4')
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@eboard.com',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    role: 'board_member',
    position: 'Board Member',
    department: 'Marketing',
    committees: ['Marketing', 'Public Relations'],
    status: 'inactive',
    lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2023-10-15T00:00:00Z',
    twoFactorEnabled: false,
    loginHistory: generateLoginHistory('5')
  },
  {
    id: '6',
    name: 'James Wilson',
    email: 'james.wilson@eboard.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    role: 'board_member',
    position: 'Board Member',
    department: 'Technology',
    committees: ['Technology', 'Strategy'],
    status: 'suspended',
    lastLogin: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2023-11-01T00:00:00Z',
    twoFactorEnabled: false,
    loginHistory: generateLoginHistory('6')
  },
  {
    id: '7',
    name: 'Amanda Taylor',
    email: 'amanda.taylor@eboard.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    role: 'guest',
    position: 'Consultant',
    department: 'Strategy',
    committees: [],
    status: 'pending_invite',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    twoFactorEnabled: false,
    loginHistory: []
  }
];

// Available departments
export const departments = [
  'Executive',
  'Operations',
  'Finance',
  'Administration',
  'Marketing',
  'Technology',
  'Strategy',
  'Human Resources'
];

// Mock meetings
export const meetings: Meeting[] = [
  {
    id: '1',
    title: 'Q1 Strategic Planning Session',
    startAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    timezone: 'America/New_York',
    location: 'Conference Room A',
    isRecurring: false,
    status: 'in_progress',
    agenda: [
      {
        id: 'a1',
        title: 'Review 2024 Performance Metrics',
        owner: '1',
        duration: 30,
        description: 'Comprehensive review of key performance indicators',
        attachments: [],
        order: 1
      },
      {
        id: 'a2',
        title: 'Budget Allocation for Q1',
        owner: '3',
        duration: 45,
        description: 'Discussion and approval of Q1 budget distribution',
        attachments: [],
        order: 2
      }
    ],
    attendees: ['1', '2', '3', '4', '5'],
    createdBy: '1',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    title: 'Monthly Board Meeting',
    startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    timezone: 'America/New_York',
    location: 'Virtual (Zoom)',
    isRecurring: true,
    status: 'upcoming',
    agenda: [
      {
        id: 'a3',
        title: 'Executive Updates',
        owner: '1',
        duration: 20,
        attachments: [],
        order: 1
      },
      {
        id: 'a4',
        title: 'Financial Report Review',
        owner: '3',
        duration: 30,
        attachments: [],
        order: 2
      }
    ],
    attendees: ['1', '2', '3', '4', '5'],
    createdBy: '1',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'Emergency Vote: New Initiative',
    startAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    timezone: 'America/New_York',
    location: 'Virtual (Teams)',
    isRecurring: false,
    status: 'upcoming',
    agenda: [
      {
        id: 'a5',
        title: 'Vote on Partnership Proposal',
        owner: '2',
        duration: 45,
        attachments: [],
        order: 1
      }
    ],
    attendees: ['1', '2', '3', '4'],
    createdBy: '2',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock tasks
export const tasks: Task[] = [
  {
    id: '1',
    title: 'Prepare Q1 Financial Report',
    description: 'Compile comprehensive financial statements for board review',
    status: 'in_progress',
    priority: 'high',
    assigneeId: '3',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    meetingId: '1',
    createdBy: '1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    title: 'Update Member Directory',
    description: 'Verify and update contact information for all board members',
    status: 'todo',
    priority: 'medium',
    assigneeId: '4',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: '1',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'Review Partnership Proposal Documents',
    description: 'Legal review of partnership agreement',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: '2',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    meetingId: '3',
    createdBy: '2',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    title: 'Schedule Annual Retreat',
    description: 'Book venue and send invitations for annual board retreat',
    status: 'todo',
    priority: 'medium',
    assigneeId: '4',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: '1',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    title: 'Marketing Campaign Analysis',
    description: 'Analyze Q4 marketing campaign performance',
    status: 'review',
    priority: 'low',
    assigneeId: '5',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: '5',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock documents
export const documents: Document[] = [
  {
    id: '1',
    title: '2024 Annual Budget',
    fileName: '2024-annual-budget.pdf',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 2457600,
    tags: ['budget', 'finance', '2024'],
    version: 3,
    uploadedBy: '3',
    uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    accessLevel: 'board_only'
  },
  {
    id: '2',
    title: 'Strategic Plan 2024-2026',
    fileName: 'strategic-plan-2024-2026.pdf',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 5242880,
    tags: ['strategy', 'planning'],
    version: 2,
    uploadedBy: '1',
    uploadedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    accessLevel: 'board_only'
  },
  {
    id: '3',
    title: 'December Meeting Minutes',
    fileName: 'december-2024-minutes.pdf',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 1048576,
    tags: ['minutes', 'meeting'],
    version: 1,
    uploadedBy: '4',
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    accessLevel: 'board_only'
  },
  {
    id: '4',
    title: 'Partnership Proposal - Tech Corp',
    fileName: 'partnership-techcorp.pdf',
    fileUrl: '#',
    fileType: 'application/pdf',
    fileSize: 3145728,
    tags: ['partnership', 'legal'],
    version: 1,
    uploadedBy: '2',
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    accessLevel: 'admin_only'
  }
];

// Mock polls
export const polls: Poll[] = [
  {
    id: '1',
    meetingId: '3',
    question: 'Approve Partnership with Tech Corp?',
    description: 'Strategic partnership proposal for technology services',
    options: [
      { id: 'o1', text: 'Approve', votes: 2 },
      { id: 'o2', text: 'Reject', votes: 0 },
      { id: 'o3', text: 'Needs More Discussion', votes: 1 }
    ],
    anonymous: false,
    multipleChoice: false,
    requireQuorum: true,
    quorumPercentage: 66,
    status: 'active',
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: '2',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    question: 'Preferred Date for Annual Retreat',
    options: [
      { id: 'o4', text: 'March 15-17', votes: 3 },
      { id: 'o5', text: 'March 22-24', votes: 2 },
      { id: 'o6', text: 'April 5-7', votes: 0 }
    ],
    anonymous: false,
    multipleChoice: false,
    requireQuorum: false,
    status: 'active',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: '4',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock budgets
export interface BudgetItem {
  id: string;
  fiscalYear: string;
  category: string;
  allocated: number;
  spent: number;
  status: 'draft' | 'approved' | 'active';
  approvedBy?: string;
  approvedAt?: string;
}

export const budgets: BudgetItem[] = [
  {
    id: '1',
    fiscalYear: '2024',
    category: 'Operations',
    allocated: 500000,
    spent: 287500,
    status: 'active',
    approvedBy: '1',
    approvedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    fiscalYear: '2024',
    category: 'Marketing',
    allocated: 150000,
    spent: 92000,
    status: 'active',
    approvedBy: '1',
    approvedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    fiscalYear: '2024',
    category: 'Technology',
    allocated: 200000,
    spent: 145000,
    status: 'active',
    approvedBy: '1',
    approvedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    fiscalYear: '2024',
    category: 'Human Resources',
    allocated: 100000,
    spent: 58000,
    status: 'active',
    approvedBy: '1',
    approvedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock expenses
export interface Expense {
  id: string;
  budgetId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Mock expenses list
export const expenses: Expense[] = [
  {
    id: '1',
    budgetId: '1',
    title: 'Office Supplies - Q1',
    amount: 5400,
    category: 'Operations',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    submittedBy: '4',
    submittedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    approvedBy: '1',
    approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    budgetId: '2',
    title: 'Social Media Campaign',
    amount: 12000,
    category: 'Marketing',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    submittedBy: '5',
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock announcements
export const announcements = [
  {
    id: '1',
    title: 'Board Meeting Schedule Updated',
    content: 'Please note that the March board meeting has been rescheduled to accommodate all members. Check the calendar for updated times.',
    isPinned: true,
    targetAudience: 'all',
    publishedBy: '1',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    title: 'New Document Management System',
    content: 'We have upgraded our document management system with enhanced security features and better search capabilities.',
    isPinned: false,
    targetAudience: 'all',
    publishedBy: '1',
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock notifications
export const notifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'meeting',
    title: 'Upcoming Meeting',
    message: 'Q1 Strategic Planning Session starts in 2 days',
    read: false,
    actionUrl: '/meetings/1',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    userId: '1',
    type: 'vote',
    title: 'Vote Required',
    message: 'Partnership proposal vote is now open',
    read: false,
    actionUrl: '/voting/1',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    userId: '1',
    type: 'task',
    title: 'Task Due Soon',
    message: 'Review Partnership Proposal Documents is due tomorrow',
    read: true,
    actionUrl: '/tasks',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

// Dashboard stats
export const getDashboardStats = (): DashboardStats => {
  const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  return {
    upcomingMeetings: meetings.filter(m => m.status === 'upcoming').slice(0, 3),
    openTasks: tasks.filter(t => t.status !== 'completed').slice(0, 5),
    activePolls: polls.filter(p => p.status === 'active'),
    budgetSummary: {
      totalAllocated: totalBudget,
      totalSpent: totalSpent,
      percentage: percentage
    },
    recentDocuments: documents.slice(0, 4),
    attendanceTrend: [
      { month: 'Aug', attendance: 92 },
      { month: 'Sep', attendance: 88 },
      { month: 'Oct', attendance: 95 },
      { month: 'Nov', attendance: 90 },
      { month: 'Dec', attendance: 87 },
      { month: 'Jan', attendance: 93 }
    ]
  };
};
