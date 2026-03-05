// src/hooks/api/useUsers.ts
// React Query hooks for user management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService, type FetchUsersParams } from '@/api/services/users.service';
import type {
  CreateUserData,
  UpdateUserData,
  AssignRoleData,
  ChangeRoleData,
} from '@/types/api.types';

export const USERS_QUERY_KEYS = {
  all: ['users'] as const,
  lists: () => [...USERS_QUERY_KEYS.all, 'list'] as const,
  list: (params?: FetchUsersParams) => [...USERS_QUERY_KEYS.lists(), params] as const,
  organisation: () => [...USERS_QUERY_KEYS.all, 'organisation'] as const,
  details: () => [...USERS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...USERS_QUERY_KEYS.details(), id] as const,
  permissions: (id: string) => [...USERS_QUERY_KEYS.all, 'permissions', id] as const,
};

/**
 * Hook to get all users in the organisation
 */
export function useOrganisationUsers() {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.organisation(),
    queryFn: () => usersService.getOrganisationUsers(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get users with optional filters
 */
export function useUsers(params?: FetchUsersParams) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn: () => usersService.getUsers(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get user by ID
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.detail(userId),
    queryFn: () => usersService.getUserById(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to get user permissions
 */
export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.permissions(userId),
    queryFn: () => usersService.getPermissions(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserData }) =>
      usersService.updateUser(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to delete user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to assign role to user
 */
export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AssignRoleData }) =>
      usersService.assignRole(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(variables.userId) });
    },
  });
}

/**
 * Hook to change user role
 */
export function useChangeRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ChangeRoleData }) =>
      usersService.changeRole(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to toggle user status
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersService.toggleStatus(userId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
    },
  });
}
