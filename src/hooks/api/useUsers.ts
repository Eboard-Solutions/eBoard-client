// src/hooks/api/useUsers.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService, type FetchUsersParams } from '@/api/services/users.service';
import type {
  CreateUserData,
  UpdateUserData,
  AssignRoleData,
  ChangeRoleData,
} from '@/types/api.types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const USERS_QUERY_KEYS = {
  all:          ['users'] as const,
  lists:        () => [...USERS_QUERY_KEYS.all, 'list']                        as const,
  list:         (params?: FetchUsersParams) => [...USERS_QUERY_KEYS.lists(), params] as const,
  organisation: () => [...USERS_QUERY_KEYS.all, 'organisation']                as const,
  details:      () => [...USERS_QUERY_KEYS.all, 'detail']                      as const,
  detail:       (id: string) => [...USERS_QUERY_KEYS.details(), id]            as const,
  permissions:  (id: string) => [...USERS_QUERY_KEYS.all, 'permissions', id]   as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useOrganisationUsers() {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.organisation(),
    queryFn:  () => usersService.getOrganisationUsers(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUsers(params?: FetchUsersParams) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn:  () => usersService.getUsers(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.detail(userId),
    queryFn:  () => usersService.getUserById(userId),
    enabled:  !!userId,
  });
}

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.permissions(userId),
    queryFn:  () => usersService.getPermissions(userId),
    enabled:  !!userId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserData) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserData }) =>
      usersService.updateUser(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.organisation() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AssignRoleData }) =>
      usersService.assignRole(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.organisation() });
    },
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ChangeRoleData }) =>
      usersService.changeRole(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.organisation() });
    },
  });
}

/**
 * Toggle a member's active/deactivated status.
 *
 * FIX: the old Members.tsx called useUpdateUser with { isActive } but
 * UpdateUserData does not have isActive — the backend returns 400.
 * The backend has a dedicated endpoint: PATCH /user/:userId/toggle-status
 * which accepts { isActive: boolean }. This hook calls that endpoint
 * via usersService.toggleStatus which maps to the correct route.
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersService.toggleStatus(userId, isActive),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.organisation() });
    },
  });
}

export function useCreateSuperAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName:  string;
      email:     string;
      password?: string;
      role?:     string;
    }) =>
      usersService.createSuperAdmin({
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password ?? '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
    },
  });
}