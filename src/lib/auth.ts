// src/lib/auth.ts
import axios, { AxiosError, AxiosResponse } from "axios";

// ────────────────────────────────────────────────
// CONFIGURATION & VALIDATION
// ────────────────────────────────────────────────
const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  console.error(
    "%c[CRITICAL] VITE_API_URL is missing!\n" +
      "Add VITE_API_URL=http://localhost:3000 (or your backend URL) " +
      "to .env.local or .env file.\nThen restart dev server.",
    "color: #ff4444; font-weight: bold; font-size: 14px; background: #1e1e1e; padding: 8px 12px; border-radius: 4px;"
  );
}

// Remove trailing slash if present
const API_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, "") : "";

// Global API base with version prefix (matches NestJS app.setGlobalPrefix('api/v1'))
const API_BASE = API_URL ? `${API_URL}/api/v1` : "";

// ────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────
interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  // Add more fields when backend returns them (user, refresh_token, expires_in, etc.)
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
  // Add other required fields from RegisterOrgAdminDto
}

interface ForgotPasswordData {
  email: string;
}

// ────────────────────────────────────────────────
// AUTH SERVICE
// ────────────────────────────────────────────────
export const authService = {
  /**
   * Log in regular user
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    if (!API_BASE) {
      throw new Error("API base URL not configured (VITE_API_URL missing)");
    }

    const url = `${API_BASE}/auth/login`;

    try {
      const response: AxiosResponse<LoginResponse> = await axios.post(url, credentials, {
        headers: { "Content-Type": "application/json" },
      });

      const { access_token } = response.data;

      if (!access_token) {
        throw new Error("No access token received from server");
      }

      localStorage.setItem("token", access_token);
      return response.data;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;

        if (status === 404) {
          throw new Error(`Endpoint not found: ${url} (check backend route)`);
        }
        if (status === 401) {
          throw new Error("Invalid email or password");
        }
        if (status === 400) {
          throw new Error(`Bad request: ${message || "Check input format"}`);
        }
        if (status === 429) {
          throw new Error("Too many login attempts. Try again later.");
        }
      }
      throw err instanceof Error ? err : new Error("Login failed");
    }
  },

  /**
   * Register new organization admin
   */
  signUp: async (data: SignUpData): Promise<unknown> => {
    if (!API_BASE) throw new Error("API base URL not configured");

    try {
      const response = await axios.post(`${API_BASE}/auth/register/org-admin`, data);
      return response.data;
    } catch (err) {
      console.error("Signup failed:", err);
      throw err instanceof Error ? err : new Error("Signup request failed");
    }
  },

  /**
   * Request password reset (normal user)
   */
  forgotPassword: async (data: ForgotPasswordData): Promise<unknown> => {
    if (!API_BASE) throw new Error("API base URL not configured");

    try {
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, data);
      return response.data;
    } catch (err) {
      console.error("Forgot password failed:", err);
      throw err instanceof Error ? err : new Error("Forgot password request failed");
    }
  },

  /**
   * Get stored JWT token
   */
  getToken: (): string | null => {
    return localStorage.getItem("token");
  },

  /**
   * Remove token (logout)
   */
  logout: (): void => {
    localStorage.removeItem("token");
    // Optional: clear user data if stored
    // localStorage.removeItem("user");
  },

  /**
   * Client-side check if token exists
   */
  isAuthenticated: (): boolean => {
    return !!authService.getToken();
  },
};

// ────────────────────────────────────────────────
// AXIOS INTERCEPTORS (global)
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
      // Optional: redirect to login (if using wouter/router)
      // window.location.href = "/auth/signin";
    }
    return Promise.reject(error);
  }
);

// Default export (most common usage pattern)
export default authService;