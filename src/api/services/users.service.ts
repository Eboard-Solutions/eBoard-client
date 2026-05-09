// src/api/services/users.service.ts
// User management API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  User,
  UpdateUserData,
  AssignRoleData,
  ChangeRoleData,
  UserPermissions,
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

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
      // Don't retry on timeouts — a slow backend won't get faster on retry,
      // and the user shouldn't have to wait 2× the timeout to see an error.
      // Without this guard, ECONNABORTED has no `status` so we'd fall through
      // and retry, producing the ~60s wait users were reporting.
      if (err?.code === 'ECONNABORTED') throw err;
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
  async getOrganisationUsers(): Promise<ResponseObject<User[]>> {
    return withRetry(async () => {
      // 20s is generous enough to absorb a backend cold-start (TypeORM init
      // can take ~22s on first boot from logs we observed) but still fast-
      // fails on a truly hung request. The global axios timeout is 30s;
      // setting this per-call avoids waiting that long unnecessarily.
      //
      // We let the original AxiosError propagate (no wrapping in `new Error`)
      // so callers can discriminate `err.code === 'ECONNABORTED'` (timeout)
      // from `err.response?.status` (HTTP error) and show situation-specific
      // copy in the UI.
      const response = await apiClient.get<ResponseObject<User[]>>(
          ENDPOINTS.USERS.ORGANISATION_USERS,
          { timeout: 20_000 },
      );
      return response.data;
    });
  },

  /**
   * Get all users with optional filters
   */
  async getUsers(params?: FetchUsersParams): Promise<ResponseObject<User[]>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ResponseObject<User[]>>(
            ENDPOINTS.USERS.BASE,
            { params },
        );
        const body = response.data as any;
        const data = body?.data ?? body;
        
        if(Array.isArray(data)) return data;
        if(Array.isArray(data?.items)) return data.items;
        if(Array.isArray(data?.users)) return data.users;

        return [];
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to load users'));
      }
    });
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ResponseObject<User>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ResponseObject<User>>(
            ENDPOINTS.USERS.BY_ID(userId),
        );
        return response.data;
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
   * firstName, lastName, email, role, title?, phoneNumber?, profilePictureUrl?
   */
  async createUser(data: CreateUserData): Promise<ResponseObject<User>> {
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
        const response = await apiClient.post<ResponseObject<User>>(
            ENDPOINTS.USERS.BASE,
            payload,
        );
        return response.data;
      } catch (err: any) {
        // Don't wrap into a fresh Error — preserve `err.response?.status` so
        // Members.tsx can render the right copy ("already a member", "org not
        // active", etc.) and offer the right next step.
        const status = err?.response?.status;
        const backendMessage = extractErrorMessage(err, '');

        // Override err.message with friendly copy that's safe to surface
        // verbatim in toasts. The original AxiosError keeps its other
        // fields (response, code) intact.
        if (status === 409) {
          err.message = backendMessage
            || 'A member with this email is already in your organisation. Use Invite to resend their activation link.';
        } else if (status === 403) {
          err.message = backendMessage
            || 'Your organisation must be approved before you can add members.';
        } else if (status === 400) {
          err.message = backendMessage || 'Some fields are invalid. Please review the form and try again.';
        } else if (err?.code === 'ECONNABORTED') {
          err.message = "The server is taking too long. Your request didn't go through — please try again.";
        } else {
          err.message = backendMessage || 'Could not add the member. Please try again.';
        }
        throw err;
      }
    });
  },

  /**
   * Update user details
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<ResponseObject<User>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.patch<ResponseObject<User>>(
            ENDPOINTS.USERS.BY_ID(userId),
            data,
        );
        return response.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to update member'));
      }
    });
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<ResponseObject<void>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.delete<ResponseObject<void>>(ENDPOINTS.USERS.BY_ID(userId));
        return response.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to remove member'));
      }
    });
  },

  /**
   * Assign role to user
   */
  async assignRole(userId: string, data: AssignRoleData): Promise<ResponseObject<User>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.post<ResponseObject<User>>(
            ENDPOINTS.USERS.ASSIGN_ROLE(userId),
            data,
        );
        return response.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to assign role'));
      }
    });
  },

  /**
   * Change user role
   */
  async changeRole(userId: string, data: ChangeRoleData): Promise<ResponseObject<User>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.patch<ResponseObject<User>>(
            ENDPOINTS.USERS.CHANGE_ROLE(userId),
            data,
        );
        return response.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to change role'));
      }
    });
  },

  /**
   * Toggle user active status.
   * Sends { isActive } object — NOT a raw boolean.
   */
  async toggleStatus(userId: string, isActive: boolean): Promise<ResponseObject<User>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.patch<ResponseObject<User>>(
            ENDPOINTS.USERS.TOGGLE_STATUS(userId),
            { isActive },
        );
        return response.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to update member status'));
      }
    });
  },

  /**
   * Get user permissions
   */
  async getPermissions(userId: string): Promise<ResponseObject<UserPermissions>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.get<ResponseObject<UserPermissions>>(
            ENDPOINTS.USERS.PERMISSIONS(userId),
        );
        return response.data;
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
  }): Promise<ResponseObject<User>> {
    return withRetry(async () => {
      try {
        const response = await apiClient.post<ResponseObject<User>>(
            ENDPOINTS.USERS.SUPER_ADMIN,
            data,
        );
        return response.data;
      } catch (err) {
        throw new Error(extractErrorMessage(err, 'Failed to create super admin'));
      }
    });
  },
};

export default usersService;