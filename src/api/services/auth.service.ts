// src/api/services/auth.service.ts
// Authentication API service

import apiClient, { TokenService } from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  LoginCredentials,
  OrgAdminLoginCredentials,
  SuperAdminLoginCredentials,
  LoginResponse,
  RegisterOrgAdminData,
  AuthUser,
  UserRole,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  ActivateAccountData,
  UpdateProfileData,
} from '@/types/api.types';
import type {ResponseObject} from "@/api/response-object.ts";


// Decode JWT payload (no verification - just parsing)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
export const authService = {
  /**
   * Login with organization code (regular users/board members)
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<ResponseObject<LoginResponse>>(
        ENDPOINTS.AUTH.LOGIN,
        credentials
    );
    const data = response.data.data!;
    TokenService.setTokens(data.accessToken, data.refreshToken);
    TokenService.setUser(data.user);
    return data;
  },

  /**
   * Login for organization admins (without org code)
   */
  async orgAdminLogin(credentials: OrgAdminLoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<ResponseObject<LoginResponse>>(
        ENDPOINTS.AUTH.ORG_ADMIN_LOGIN,
        credentials
    );
    const data = response.data.data!;
    TokenService.setTokens(data.accessToken, data.refreshToken);
    TokenService.setUser(data.user);
    return data;
  },

  /**
   * Login for super admins
   * Note: Super admin login only returns tokens, no user object.
   * We decode the JWT to extract user info.
   */
  async superAdminLogin(credentials: SuperAdminLoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<ResponseObject<{ at: string; rt: string }>>(
        ENDPOINTS.AUTH.SUPER_ADMIN_LOGIN,
        credentials
    );
    const data = response.data.data!;
    TokenService.setTokens(data.at, data.rt);

    // Super admin login doesn't return user object - decode from JWT
    const payload = decodeJwtPayload(data.at);
    const user = {
      userId: (payload?.sub as string) || '',
      email: (payload?.email as string) || credentials.email,
      firstName: 'Super',
      lastName: 'Admin',
      role: ((payload?.role as string) || 'SuperAdmin') as UserRole,
      hasOrganisation: false,
      organisationStatus: null,
      orgCode: null,
    };

    TokenService.setUser(user);
    return { accessToken: data.at, refreshToken: data.rt, user };
  },

  /**
   * Register a new organization admin
   */
  async registerOrgAdmin(data: RegisterOrgAdminData): Promise<unknown> {
    const response = await apiClient.post<ResponseObject<unknown>>(
        ENDPOINTS.AUTH.REGISTER_ORG_ADMIN,
        data
    );
    return response.data.data;
  },

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT(userId));
    } finally {
      TokenService.clearTokens();
    }
  },

  /**
   * Refresh tokens
   */
  async refreshTokens(): Promise<{ at: string; rt: string }> {
    const response = await apiClient.post<ResponseObject<{ at: string; rt: string }>>(
        ENDPOINTS.AUTH.REFRESH_TOKENS
    );
    const data = response.data.data!;
    TokenService.setTokens(data.at, data.rt);
    return data;
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<AuthUser> {
    const response = await apiClient.get<ResponseObject<AuthUser>>(
        ENDPOINTS.AUTH.ME
    );
    return response.data.data!;
  },

  /**
   * Update current user profile
   */
  async updateMe(data: UpdateProfileData): Promise<AuthUser> {
    const response = await apiClient.patch<ResponseObject<AuthUser>>(
        ENDPOINTS.AUTH.ME,
        data
    );
    return response.data.data!;
  },

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordData): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
  },

  /**
   * Request password reset for super admin
   */
  async forgotPasswordSuperAdmin(email: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD_SUPER_ADMIN, { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  /**
   * Change password (authenticated user)
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  /**
   * Activate account with token
   */
  async activateAccount(data: ActivateAccountData): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.ACTIVATE_ACCOUNT, data);
  },

  /**
   * Verify token validity
   */
  async introspect(token: string): Promise<boolean> {
    const response = await apiClient.post<ResponseObject<{ valid: boolean }>>(
        ENDPOINTS.AUTH.INTROSPECT,
        { token }
    );
    return response.data.data!.valid;
  },

  /**
   * Delete account
   */
  async deleteAccount(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.AUTH.DELETE_ACCOUNT(id));
    TokenService.clearTokens();
  },

  // ─── Local helpers ───────────────────────────────────
  getToken: () => TokenService.getAccessToken(),
  getRefreshToken: () => TokenService.getRefreshToken(),
  getUser: () => TokenService.getUser<AuthUser>(),
  isAuthenticated: () => !!TokenService.getAccessToken(),
  clearAuth: () => TokenService.clearTokens(),

  /**
   * Get formatted current user (for UI compatibility)
   */
  getCurrentUser(): { name: string; email: string; role: string } | null {
    const user = TokenService.getUser<AuthUser>();
    if (!user) return null;
    return {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
    };
  },
};

export default authService;