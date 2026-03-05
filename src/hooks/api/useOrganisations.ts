// src/hooks/api/useOrganisations.ts
// React Query hooks for Organisations API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OrganisationsService from '@/api/services/organisations.service';
import type {
  CreateOrganisationData,
  UpdateOrganisationData,
} from '@/types/api.types';

// Query keys
export const organisationKeys = {
  all: ['organisations'] as const,
  lists: () => [...organisationKeys.all, 'list'] as const,
  list: () => [...organisationKeys.lists()] as const,
  pending: () => [...organisationKeys.all, 'pending'] as const,
  details: () => [...organisationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organisationKeys.details(), id] as const,
};

// Get all organisations
export function useOrganisations() {
  return useQuery({
    queryKey: organisationKeys.list(),
    queryFn: () => OrganisationsService.getAll(),
  });
}

// Get organisation by ID
export function useOrganisationById(orgId: string) {
  return useQuery({
    queryKey: organisationKeys.detail(orgId),
    queryFn: () => OrganisationsService.getById(orgId),
    enabled: !!orgId,
  });
}

// Get pending organisations (SuperAdmin only)
export function usePendingOrganisations() {
  return useQuery({
    queryKey: organisationKeys.pending(),
    queryFn: () => OrganisationsService.getPending(),
  });
}

// Register organisation mutation
export function useRegisterOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganisationData) => OrganisationsService.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organisationKeys.pending() });
    },
  });
}

// Update organisation mutation
export function useUpdateOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: UpdateOrganisationData }) =>
      OrganisationsService.update(orgId, data),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: organisationKeys.detail(orgId) });
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
    },
  });
}

// Delete organisation mutation
export function useDeleteOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => OrganisationsService.delete(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
    },
  });
}

// Approve organisation mutation
export function useApproveOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => OrganisationsService.approve(orgId),
    onSuccess: (_, orgId) => {
      queryClient.invalidateQueries({ queryKey: organisationKeys.detail(orgId) });
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organisationKeys.pending() });
    },
  });
}
