// src/hooks/api/useSettings.ts
// React Query hooks for Settings API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SettingsService from '@/api/services/settings.service';
import type { UpdateSettingsData } from '@/types/api.types';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  byOrg: (orgId: string) => [...settingsKeys.all, 'org', orgId] as const,
  default: () => [...settingsKeys.all, 'default'] as const,
};

// Get settings by organization ID
export function useOrganisationSettings(orgId: string) {
  return useQuery({
    queryKey: settingsKeys.byOrg(orgId),
    queryFn: () => SettingsService.getByOrgId(orgId),
    enabled: !!orgId,
  });
}

// Get all settings (admin only)
export function useAllSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => SettingsService.getAll(),
  });
}

// Get default settings
export function useDefaultSettings() {
  return useQuery({
    queryKey: settingsKeys.default(),
    queryFn: () => SettingsService.getDefault(),
  });
}

// Update settings mutation
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSettingsData) => SettingsService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
