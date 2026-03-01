// src/lib/auth.ts
import axios, { AxiosError } from 'axios';

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const API_BASE = `http://localhost:3000/api/v1`;

// ────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
  orgCode?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hasOrganisation: boolean;
  organisationStatus: string | null;
  orgCode: string | null;
}

export interface LoginResponse {
  at: string;   // access token
  rt: string;   // refresh token
  user: AuthUser;
}

export interface SignUpData {
  firstName: string;
  lastName: string;
  organisationName: string;
  phoneNumber: string;
  email: string;
  password: string;
}

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────
function extractMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Unknown error';
  const d = data as Record<string, unknown>;
  const raw = d.message ?? d.error ?? d.detail ?? 'Unknown error';
  if (Array.isArray(raw)) return raw.join(' • ');
  return String(raw);
}

// ────────────────────────────────────────────────
// AUTH SERVICE
// ────────────────────────────────────────────────
export const authService = {

  /**
   * Login — routes to the correct endpoint based on whether orgCode is supplied.
   *
   * No orgCode  →  admin login  →  /auth/org-admin/login
   * With orgCode → member login →  /auth/login
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const hasOrgCode = !!credentials.orgCode?.trim();

    // FIX: correct endpoint routing
    const url = hasOrgCode
      ? `${API_BASE}/auth/login`            // board member / regular user
      : `${API_BASE}/auth/org-admin/login`; // super admin / org admin

    const payload: Record<string, string> = {
      email:    credentials.email.trim(),
      password: credentials.password.trim(),
    };
    if (hasOrgCode) {
      payload.orgCode = credentials.orgCode!.trim();
    }

    try {
      console.log('🔐 Login →', url, { hasOrgCode });

      const response = await axios.post<LoginResponse>(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      // Defensive: handle both flat and nested response shapes
      // e.g. { at, rt, user } OR { data: { at, rt, user } }
      const body = (response.data as any)?.data ?? response.data;
      const { at, rt, user } = body as LoginResponse;

      if (!at) {
        console.error('🔴 Full server response:', JSON.stringify(response.data, null, 2));
        throw new Error('No access token received from server');
      }
      if (!user) {
        throw new Error('No user data received from server');
      }

      // Persist session
      localStorage.setItem('token',        at);
      localStorage.setItem('refreshToken', rt);
      localStorage.setItem('user',         JSON.stringify(user));

      console.log('✅ Login successful:', { role: user.role, hasOrganisation: user.hasOrganisation });

      return { at, rt, user };

    } catch (err) {
      if (err instanceof AxiosError) {
        const status  = err.response?.status;
        const data    = err.response?.data;
        let   message = extractMessage(data);

        console.error('❌ Login failed:', { status, message, url, data });

        if (!status) throw new Error('Cannot reach the server. Check your connection.');

        if (status === 400) {
          if (message.toLowerCase().includes('orgcode') || message.toLowerCase().includes('organization code'))
            throw new Error('Organization code is required for this account');
          if (message.toLowerCase().includes('email') || message.toLowerCase().includes('password'))
            throw new Error('Invalid email or password');
          throw new Error(`Invalid request: ${message}`);
        }
        if (status === 401) throw new Error('Invalid credentials. Please check your email and password.');
        if (status === 403) throw new Error('Access denied. You may not have permission to log in here.');
        if (status === 404) throw new Error('Login service not found. Is the backend running?');
        if (status === 429) throw new Error('Too many attempts. Please try again later.');

        throw new Error(message);
      }

      // Re-throw non-Axios errors (e.g. the manual throws above)
      throw err instanceof Error ? err : new Error('Login failed unexpectedly');
    }
  },

  /**
   * Register new organization admin
   */
  signUp: async (data: SignUpData): Promise<unknown> => {
    const url = `${API_BASE}/auth/register/org-admin`;

    const payload = {
      firstName:        data.firstName.trim(),
      lastName:         data.lastName.trim(),
      organisationName: data.organisationName.trim(),
      phoneNumber:      data.phoneNumber.trim(),
      email:            data.email.trim(),
      password:         data.password.trim(),
    };

    try {
      console.log('📤 Signup →', url, { ...payload, password: '***' });
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      console.log('✅ Signup successful');
      return response.data;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status  = err.response?.status;
        const data    = err.response?.data;
        let   message = extractMessage(data);

        console.error('❌ Signup failed:', { status, message, data, url });

        if (Array.isArray(data?.errors))
          throw new Error(`Validation failed: ${(data.errors as string[]).join(', ')}`);

        if (!status) throw new Error('Network error – is the backend running at http://localhost:3000?');
        if (status === 400) throw new Error(`Invalid input: ${message}`);
        if (status === 409) throw new Error('An account with this email already exists.');
        if (status === 404) throw new Error('Signup endpoint not found. Check backend server.');
        if (status === 429) throw new Error('Too many signup attempts. Try again later.');

        throw new Error(`Signup failed (${status}): ${message}`);
      }
      throw err instanceof Error ? err : new Error('Signup failed unexpectedly');
    }
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (data: { email: string }): Promise<unknown> => {
    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, data);
      return response.data;
    } catch (err) {
      console.error('Forgot password failed:', err);
      throw err instanceof Error ? err : new Error('Forgot password request failed');
    }
  },

  // ── Token / session helpers ──────────────────

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  },

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  getCurrentUser(): { name: string; email: string; role: string } | null {
    const user = authService.getUser();
    if (!user) return null;
    return {
      name:  `${user.firstName} ${user.lastName}`,
      email: user.email,
      role:  user.role,
    };
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  isAuthenticated(): boolean {
    return !!authService.getToken();
  },
};

// ────────────────────────────────────────────────
// GLOBAL AXIOS INTERCEPTORS
// ────────────────────────────────────────────────
axios.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      authService.logout();
      // Uncomment to force redirect on token expiry:
      // window.location.href = '/auth/signin';
    }
    return Promise.reject(error);
  }
);

export default authService;