// src/api/services/users.service.ts
// User management API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  ApiResponse,
  User,
  CreateUserData,
  UpdateUserData,
  AssignRoleData,
  ChangeRoleData,
  UserPermissions,
  PaginatedResponse,
} from '@/types/api.types';

export interface FetchUsersParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export const usersService = {
  /**
   * Get all users in the organisation
   */
  async getOrganisationUsers(): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]>>(
      ENDPOINTS.USERS.ORGANISATION_USERS
    );
    return response.data.data || [];
  },

  /**
   * Get all users (admin access)
   */
  async getUsers(params?: FetchUsersParams): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]>>(
      ENDPOINTS.USERS.BASE,
      { params }
    );
    // Handle both array and paginated responses
    const data = response.data.data;
    return Array.isArray(data) ? data : (data as unknown as PaginatedResponse<User>).items || [];
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(
      ENDPOINTS.USERS.BY_ID(userId)
    );
    return response.data.data;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>(
      ENDPOINTS.USERS.BASE,
      data
    );
    return response.data.data;
  },

  /**
   * Update user details
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      ENDPOINTS.USERS.BY_ID(userId),
      data
    );
    return response.data.data;
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.USERS.BY_ID(userId));
  },

  /**
   * Assign role to user
   */
  async assignRole(userId: string, data: AssignRoleData): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>(
      ENDPOINTS.USERS.ASSIGN_ROLE(userId),
      data
    );
    return response.data.data;
  },

  /**
   * Change user role
   */
  async changeRole(userId: string, data: ChangeRoleData): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      ENDPOINTS.USERS.CHANGE_ROLE(userId),
      data
    );
    return response.data.data;
  },

  /**
   * Toggle user active status
   */
  async toggleStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>(
      ENDPOINTS.USERS.TOGGLE_STATUS(userId),
      isActive
    );
    return response.data.data;
  },

  /**
   * Get user permissions
   */
  async getPermissions(userId: string): Promise<UserPermissions> {
    const response = await apiClient.get<ApiResponse<UserPermissions>>(
      ENDPOINTS.USERS.PERMISSIONS(userId)
    );
    return response.data.data;
  },

  /**
   * Create super admin (super admin only)
   */
  async createSuperAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<User> {
    const response = await apiClient.post<ApiResponse<User>>(
      ENDPOINTS.USERS.SUPER_ADMIN,
      data
    );
    return response.data.data;
  },
};

export default usersService;
