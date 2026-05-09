// src/hooks/api/useAuth.ts
// React Query hooks for authentication

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/api/services';
import type {
  LoginCredentials,
  OrgAdminLoginCredentials,
  SuperAdminLoginCredentials,
  RegisterOrgAdminData,
  ChangePasswordData,
  ForgotPasswordData,
  ResetPasswordData,
  UpdateProfileData,
} from '@/types/api.types';

export const AUTH_QUERY_KEYS = {
  me: ['auth', 'me'] as const,
  user: ['auth', 'user'] as const,
};

/**
 * Hook to get the current authenticated user profile
 */
// hooks/api/useAuth.ts
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],   // ← same key everywhere = one shared request
    queryFn:  () => authService.getMe(),
    staleTime: 1000 * 60 * 15, // user profile rarely changes — 15 min
  });
}

/**
 * Hook for login with org code (regular users)
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
}

/**
 * Hook for org admin login
 */
export function useOrgAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: OrgAdminLoginCredentials) =>
      authService.orgAdminLogin(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
}

/**
 * Hook for super admin login
 */
export function useSuperAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: SuperAdminLoginCredentials) =>
      authService.superAdminLogin(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
}

/**
 * Hook for registering a new org admin
 */
export function useRegisterOrgAdmin() {
  return useMutation({
    mutationFn: (data: RegisterOrgAdminData) => authService.registerOrgAdmin(data),
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => authService.logout(userId),
    onSuccess: () => {
      queryClient.clear();
    },
    onError: () => {
      // Even on error, clear local state
      authService.clearAuth();
      queryClient.clear();
    },
  });
}

/**
 * Hook for updating user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => authService.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.me });
    },
  });
}

/**
 * Hook for changing password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => authService.changePassword(data),
  });
}

/**
 * Hook for forgot password
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordData) => authService.forgotPassword(data),
  });
}

/**
 * Hook for reset password
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordData) => authService.resetPassword(data),
  });
}
