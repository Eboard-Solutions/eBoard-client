// Mock user data for frontend development
const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@eboard.com',
    role: 'admin',
    position: 'Board President',
    department: 'Executive',
    phone: '+1 (555) 123-4567',
    termStartDate: '2024-01-01',
    termEndDate: '2025-12-31',
    committees: ['Finance', 'Strategy'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@eboard.com',
    role: 'board_member',
    position: 'Vice President',
    department: 'Operations',
    phone: '+1 (555) 234-5678',
    committees: ['Operations', 'Technology'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@eboard.com',
    role: 'board_member',
    position: 'Treasurer',
    department: 'Finance',
    phone: '+1 (555) 345-6789',
    committees: ['Finance', 'Audit'],
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@eboard.com',
    role: 'board_member',
    position: 'Secretary',
    department: 'Administration',
    phone: '+1 (555) 456-7890',
    committees: ['Governance', 'Communications'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@eboard.com',
    role: 'board_member',
    position: 'Board Member',
    department: 'Marketing',
    phone: '+1 (555) 567-8901',
    committees: ['Marketing', 'Public Relations'],
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop'
  }
];

export const fetchUsers = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock authentication check (optional - you can remove this if not needed)
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  return {
    success: true,
    data: mockUsers,
    message: 'Users fetched successfully'
  };
};

