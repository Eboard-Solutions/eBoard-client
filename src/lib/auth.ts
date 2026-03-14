// src/lib/auth.ts
// Thin facade over the centralized auth service.
// All auth logic goes through the apiClient (src/api/client.ts)
// which handles Bearer token injection and 401 refresh automatically.

import { authService as apiAuthService } from '@/api/services/auth.service';
import { TokenService } from '@/api/client';

export { TokenService };

export const authService = {
  // ─── Login variants ───────────────────────────────────────────────────────

  /** Login with orgCode (regular users / board members) */
  login: apiAuthService.login.bind(apiAuthService),

  /** Login for organization admins (no orgCode) */
  orgAdminLogin: apiAuthService.orgAdminLogin.bind(apiAuthService),

  /** Login for super admins */
  superAdminLogin: apiAuthService.superAdminLogin.bind(apiAuthService),

  // ─── Registration ─────────────────────────────────────────────────────────

  /** Register a new organization admin */
  signUp: apiAuthService.registerOrgAdmin.bind(apiAuthService),

  // ─── Password ─────────────────────────────────────────────────────────────

  forgotPassword: apiAuthService.forgotPassword.bind(apiAuthService),

  // ─── Token / user helpers (synchronous localStorage reads) ───────────────

  getToken:        () => TokenService.getAccessToken(),
  getRefreshToken: () => TokenService.getRefreshToken(),

  /** Returns the stored user object set during login */
  getUser: () => TokenService.getUser<{
    userId:             string;
    email:              string;
    firstName:          string;
    lastName:           string;
    role:               string;
    hasOrganisation:    boolean;
    organisationStatus: string | null;
    orgCode:            string | null;
    organisationId?:    string | null;
  }>(),

  getCurrentUser(): { name: string; email: string; role: string } | null {
    return apiAuthService.getCurrentUser();
  },

  isAuthenticated(): boolean {
    return !!TokenService.getAccessToken();
  },

  /** Clear tokens + user data from localStorage (client-side only) */
  logout(): void {
    TokenService.clearTokens();
  },

  /** Alias used by components that call clearAuth() */
  clearAuth(): void {
    TokenService.clearTokens();
  },
};

export default authService;