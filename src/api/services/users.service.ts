// src/api/services/users.service.ts
// User management API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  ApiResponse,
  User,
  UpdateUserData,
  AssignRoleData,
  ChangeRoleData,
  UserPermissions,
  PaginatedResponse,
} from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchUsersParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

/**
 * Matches backend CreateUserDto exactly.
 * firstName, lastName, email, role are required.
 * title, phoneNumber, profilePictureUrl are optional.
 * NO password — the backend generates one automatically.
 */
export interface CreateUserData {
  firstName:          string;
  lastName:           string;
  email:              string;
  role:               string;
  title?:             string;
  phoneNumber?:       string;
  profilePictureUrl?: string;
}

// ─── Error extractor ──────────────────────────────────────────────────────────
// Axios wraps the backend's error response. This extracts the real message
// from the NestJS error body so toasts show something useful instead of
// "Request failed with status code 500".

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const axiosErr = err as any;

  // NestJS error body: { message: string | string[], statusCode: number }
  const body = axiosErr?.response?.data;
  if (body) {
    if (typeof body.message === 'string' && body.message) return body.message;
    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message.join(', ');
    }
    if (typeof body.error === 'string' && body.error) return body.error;
  }

  // Axios network error
  if (axiosErr?.message) return axiosErr.message;

  return fallback;
}

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Retries on transient 500s caused by Neon/Supabase connection drops.
// The backend already has withRetry, but a second layer on the frontend
// means the user never sees a failure on the first request after DB idle.

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status;
      // Only retry on 500/503 (server errors), not on 400/401/403/404
      if (status && status < 500) throw err;
      if (attempt === retries) throw err;
      // Brief wait before retry
      await new Promise(r => setTimeout(r, 500));
    }
  }
  // TypeScript safety — loop above always throws or returns
  throw new Error('Retry exhausted');
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const usersService = {

  /**
   * Get all users in the organisation (OrgAdmin / SuperAdmin)
   */
  async getOrganisationUsers(): Promise<User[]> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ApiResponse<User[]>>(
          ENDPOINTS.USERS.ORGANISATION_USERS,
        );
        const data = response.data.data;
        if (!data) return [];
        return Array.isArray(data) ? data : (data as any).items ?? [];
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to load members'));
      }
    });
  },

  /**
   * Get all users with optional filters
   */
  async getUsers(params?: FetchUsersParams): Promise<User[]> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ApiResponse<User[]>>(
          ENDPOINTS.USERS.BASE,
          { params },
        );
        const data = response.data.data;
        if (!data) return [];
        return Array.isArray(data)
          ? data
          : (data as unknown as PaginatedResponse<User>).items ?? [];
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to load users'));
      }
    });
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ApiResponse<User>>(
          ENDPOINTS.USERS.BY_ID(userId),
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to load user'));
      }
    });
  },

  /**
   * Create a new user.
   *
   * The backend controller extracts organisationId from the caller's JWT —
   * do NOT include it in the payload. The backend CreateUserDto accepts:
   *   firstName, lastName, email, role, title?, phoneNumber?, profilePictureUrl?
   */
  async createUser(data: CreateUserData): Promise<User> {
    return withRetry(async () => {
      // Build a clean payload — only defined, non-empty fields
      const payload: Record<string, string> = {
        firstName: data.firstName.trim(),
        lastName:  data.lastName.trim(),
        email:     data.email.trim().toLowerCase(),
        role:      data.role,
      };
      if (data.title?.trim())             payload.title             = data.title.trim();
      if (data.phoneNumber?.trim())       payload.phoneNumber       = data.phoneNumber.trim();
      if (data.profilePictureUrl?.trim()) payload.profilePictureUrl = data.profilePictureUrl.trim();

      try {
        const response = await apiClient.post<ApiResponse<User>>(
          ENDPOINTS.USERS.BASE,
          payload,
        );
        return response.data.data;
      } catch (err: any) {
        // Surface the real NestJS error so the toast is useful
        const status = err?.response?.status;
        const message = extractErrorMessage(err, 'Failed to add member');

        // Common specific cases
        if (status === 409) throw new Error('A member with this email already exists in your organisation');
        if (status === 403) throw new Error('Your organisation must be active to add members');
        if (status === 400) throw new Error(`Validation error: ${message}`);

        throw new Error(message);
      }
    });
  },

  /**
   * Update user details
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    return withRetry(async () => {
      try {
        const response = await apiClient.patch<ApiResponse<User>>(
          ENDPOINTS.USERS.BY_ID(userId),
          data,
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to update member'));
      }
    });
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    return withRetry(async () => {
      try {
        await apiClient.delete(ENDPOINTS.USERS.BY_ID(userId));
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to remove member'));
      }
    });
  },

  /**
   * Assign role to user
   */
  async assignRole(userId: string, data: AssignRoleData): Promise<User> {
    return withRetry(async () => {
      try {
        const response = await apiClient.post<ApiResponse<User>>(
          ENDPOINTS.USERS.ASSIGN_ROLE(userId),
          data,
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to assign role'));
      }
    });
  },

  /**
   * Change user role
   */
  async changeRole(userId: string, data: ChangeRoleData): Promise<User> {
    return withRetry(async () => {
      try {
        const response = await apiClient.patch<ApiResponse<User>>(
          ENDPOINTS.USERS.CHANGE_ROLE(userId),
          data,
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to change role'));
      }
    });
  },

  /**
   * Toggle user active status.
   * Sends { isActive } object — NOT a raw boolean.
   */
  async toggleStatus(userId: string, isActive: boolean): Promise<User> {
    return withRetry(async () => {
      try {
        const response = await apiClient.patch<ApiResponse<User>>(
          ENDPOINTS.USERS.TOGGLE_STATUS(userId),
          { isActive },
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to update member status'));
      }
    });
  },

  /**
   * Get user permissions
   */
  async getPermissions(userId: string): Promise<UserPermissions> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ApiResponse<UserPermissions>>(
          ENDPOINTS.USERS.PERMISSIONS(userId),
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to load permissions'));
      }
    });
  },

  /**
   * Create super admin (super admin only)
   */
  async createSuperAdmin(data: {
    firstName: string;
    lastName:  string;
    email:     string;
    password:  string;
  }): Promise<User> {
    return withRetry(async () => {
      try {
        const response = await apiClient.post<ApiResponse<User>>(
          ENDPOINTS.USERS.SUPER_ADMIN,
          data,
        );
        return response.data.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to create super admin'));
      }
    });
  },
};

export default usersService;