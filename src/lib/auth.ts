import type { User, UserRole } from '../types/index';

// Authentication state management
class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private isAuthenticated: boolean = false;

  private constructor() {
    // Load user from localStorage on init
    const storedUser = localStorage.getItem('eboard_user');
    const storedAuth = localStorage.getItem('eboard_authenticated');
    
    if (storedUser && storedAuth === 'true') {
      this.currentUser = JSON.parse(storedUser);
      this.isAuthenticated = true;
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Sign in
  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // In production, this would call your API
    // For now, simulating authentication
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock validation
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Mock user lookup (in production, this comes from your backend)
    const mockUser: User = {
      id: '1',
      name: 'Sarah Johnson',
      email: email,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      role: 'admin',
      position: 'Board President',
      department: 'Executive',
      phone: '+1 (555) 123-4567',
      termStartDate: '2024-01-01',
      termEndDate: '2025-12-31',
      committees: ['Finance', 'Strategy']
    };

    this.currentUser = mockUser;
    this.isAuthenticated = true;
    
    // Persist to localStorage
    localStorage.setItem('eboard_user', JSON.stringify(mockUser));
    localStorage.setItem('eboard_authenticated', 'true');
    
    return { success: true, user: mockUser };
  }

  // Sign up (only for board members and guests)
  async signUp(data: {
    name: string;
    email: string;
    password: string;
    position?: string;
    department?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    // In production, this would call your API
    await new Promise(resolve => setTimeout(resolve, 500));

    // Validate
    if (!data.name || !data.email || !data.password) {
      return { success: false, error: 'All fields are required' };
    }

    if (data.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Create new user (default role: board_member)
    const newUser: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      role: 'board_member', // Default role for self-registration
      position: data.position,
      department: data.department,
      termStartDate: new Date().toISOString(),
    };

    this.currentUser = newUser;
    this.isAuthenticated = true;
    
    // Persist to localStorage
    localStorage.setItem('eboard_user', JSON.stringify(newUser));
    localStorage.setItem('eboard_authenticated', 'true');
    
    return { success: true, user: newUser };
  }

  // Sign out
  signOut(): void {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('eboard_user');
    localStorage.removeItem('eboard_authenticated');
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if authenticated
  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  // Check permissions
  hasPermission(requiredRole: UserRole | UserRole[]): boolean {
    if (!this.currentUser) return false;

    const roles: UserRole[] = ['guest', 'board_member', 'admin', 'super_admin'];
    const userRoleLevel = roles.indexOf(this.currentUser.role);

    if (Array.isArray(requiredRole)) {
      return requiredRole.some(role => roles.indexOf(role) <= userRoleLevel);
    }

    return roles.indexOf(requiredRole) <= userRoleLevel;
  }

  // Create admin (only super admin can do this)
  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'super_admin';
    position?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    // Check if current user is super admin
    if (!this.currentUser || this.currentUser.role !== 'super_admin') {
      return { success: false, error: 'Only Super Admin can create admin users' };
    }

    // In production, this would call your API
    await new Promise(resolve => setTimeout(resolve, 500));

    const newAdmin: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      role: data.role,
      position: data.position,
      termStartDate: new Date().toISOString(),
    };

    return { success: true, user: newAdmin };
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    this.currentUser = { ...this.currentUser, ...updates };
    localStorage.setItem('eboard_user', JSON.stringify(this.currentUser));
    
    return { success: true };
  }
}

export const authService = AuthService.getInstance();

// Permission helper
export const hasPermission = (requiredRole: UserRole | UserRole[]): boolean => {
  return authService.hasPermission(requiredRole);
};

// Get current user helper
export const getCurrentUser = (): User | null => {
  return authService.getCurrentUser();
};