// src/lib/auth.ts
import axios, { AxiosError, AxiosResponse } from 'axios';

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const API_BASE = `http://localhost:3000/api/v1`;

// ────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────
interface LoginCredentials {
  email: string;
  password: string;
  orgCode?: string;
}

interface LoginResponse {
  at: string; // access token
  rt: string; // refresh token
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    hasOrganisation: boolean;
    organisationStatus: string | null;
    orgCode: string | null;
  };
}

interface SignUpData {
  firstName: string;
  lastName: string;
  organisationName: string; // Note: British spelling to match backend
  phoneNumber: string;
  email: string;
  password: string;
}

// ────────────────────────────────────────────────
// AUTH SERVICE
// ────────────────────────────────────────────────
export const authService = {
  /**
   * Log in user (super-admin, org-admin, or regular user)
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    if (!API_BASE) {
      throw new Error('API base URL not configured (VITE_API_URL missing)');
    }

    // Determine endpoint based on whether orgCode is provided
    const isOrgAdminLogin = !credentials.orgCode; // Org admins login without orgCode
    const url = isOrgAdminLogin 
      ? `${API_BASE}/auth/org-admin/login`  // Org admin endpoint
      : `${API_BASE}/auth/login`;             // Regular user endpoint (with orgCode)

    const payload: Record<string, string> = {
      email: credentials.email.trim(),
      password: credentials.password.trim(),
    };

    // Only include orgCode for regular users
    if (credentials.orgCode?.trim()) {
      payload.orgCode = credentials.orgCode.trim();
    }

    try {
      console.log('🔐 Login request to:', url);
      console.log('📤 Payload:', { email: payload.email, hasOrgCode: !!payload.orgCode });

      const response = await axios.post<LoginResponse>(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { at, rt, user } = response.data;

      if (!at) {
        throw new Error('No access token received from server');
      }

      // Store tokens and user data
      localStorage.setItem('token', at);
      localStorage.setItem('refreshToken', rt);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Login successful:', { 
        role: user.role, 
        hasOrganisation: user.hasOrganisation 
      });

      return response.data;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        let message = err.response?.data?.message || err.message || 'Login failed';

        console.error('❌ Login failed:', {
          status,
          message,
          endpoint: url
        });

        // Improve message readability
        if (status === 400) {
          if (Array.isArray(message)) {
            message = message.join(' • ');
          }
          if (message.toLowerCase().includes('orgcode') || message.toLowerCase().includes('organization code')) {
            throw new Error('Organization code is required for this account');
          }
          if (message.toLowerCase().includes('email') || message.toLowerCase().includes('password')) {
            throw new Error('Invalid email or password');
          }
          throw new Error(`Invalid request: ${message}`);
        }

        if (status === 401) {
          throw new Error('Invalid credentials');
        }

        if (status === 404) {
          throw new Error('Login service not available');
        }

        if (status === 429) {
          throw new Error('Too many attempts. Try again later.');
        }

        if (!status) {
          throw new Error('Cannot reach the server. Check your connection.');
        }

        throw new Error(message);
      }

      throw err instanceof Error ? err : new Error('Login failed unexpectedly');
    }
  },

  /**
   * Register new organization admin
   */
  signUp: async (data: SignUpData): Promise<unknown> => {
    if (!API_BASE) {
      throw new Error('API base URL not configured (VITE_API_URL missing)');
    }

    const url = `${API_BASE}/auth/register/org-admin`;

    // Build payload - must match backend API field names exactly
    const payload = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      organisationName: data.organisationName.trim(), // British spelling!
      phoneNumber: data.phoneNumber.trim(),
      email: data.email.trim(),
      password: data.password.trim(),
    };

    try {
      console.log('📤 Signup request to:', url);
      console.log('📤 Payload:', { ...payload, password: '***' }); // Log without password
      
      const response = await axios.post(url, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
      
      console.log('✅ Signup successful:', response.data);
      return response.data;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        let message = err.response?.data?.message || err.message || 'Unknown error';
        
        // Enhanced error logging for debugging
        console.error('❌ Signup failed:', {
          status,
          statusText: err.response?.statusText,
          message,
          errorData: err.response?.data,
          url
        });

        if (Array.isArray(message)) {
          message = message.join(' • ');
        }

        if (status === 400) {
          // Extract detailed validation errors if available
          const validationErrors = err.response?.data?.errors || 
                                   err.response?.data?.details ||
                                   err.response?.data?.error;
          
          if (validationErrors) {
            if (Array.isArray(validationErrors)) {
              throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }
            throw new Error(`Validation failed: ${validationErrors}`);
          }
          throw new Error(`Invalid input: ${message}`);
        }

        if (status === 409) {
          throw new Error('An account with this email already exists');
        }

        if (status === 404) {
          throw new Error(`Signup endpoint not found. Please check backend server.`);
        }

        if (status === 429) {
          throw new Error('Too many signup attempts. Please try again later.');
        }

        if (status === undefined || status === 0) {
          throw new Error('Network error – is the backend server running at http://localhost:3000?');
        }

        throw new Error(`Signup failed (${status}): ${message}`);
      }

      console.error('❌ Unexpected error:', err);
      throw err instanceof Error ? err : new Error('Signup failed unexpectedly');
    }
  },

  /**
   * Request password reset
   */
  forgotPassword: async (data: { email: string }): Promise<unknown> => {
    if (!API_BASE) throw new Error('API base URL not configured');

    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, data);
      return response.data;
    } catch (err) {
      console.error('Forgot password failed:', err);
      throw err instanceof Error ? err : new Error('Forgot password request failed');
    }
  },

  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  /**
   * Get stored user data
   */
  getUser(): LoginResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Get current user with formatted name (for Dashboard compatibility)
   */
  getCurrentUser(): { name: string; email: string; role: string } | null {
    const user = this.getUser();
    if (!user) return null;
    
    return {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
    };
  },

  /**
   * Remove tokens and user data (logout)
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /**
   * Check if user appears logged in (client-side only)
   */
  isAuthenticated(): boolean {
    return !!authService.getToken();
  },
};

// ────────────────────────────────────────────────
// GLOBAL AXIOS INTERCEPTORS
// ────────────────────────────────────────────────
axios.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      // Optional: redirect to login
      // window.location.href = '/auth/signin';
    }
    return Promise.reject(error);
  }
);

// Export default for easier imports
export default authService;