// src/hooks/api/useOrganisations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OrganisationsService from '@/api/services/organisations.service';
import type { CreateOrganisationData, UpdateOrganisationData } from '@/types/api.types';
import { ENDPOINTS } from '@/config/api.config';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const organisationKeys = {
  all: ['organisations'] as const,
  lists: () => [...organisationKeys.all, 'list'] as const,
  list: () => [...organisationKeys.lists()] as const,
  mine: () => [...organisationKeys.all, 'mine'] as const,
  pending: () => [...organisationKeys.all, 'pending'] as const,
  details: () => [...organisationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organisationKeys.details(), id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * SuperAdmin only — all organisations.
 * Do NOT call this from OrgAdmin pages — it will 403.
 */
export function useOrganisations() {
  return useQuery({
    queryKey: organisationKeys.list(),
    queryFn: () => OrganisationsService.getAll(),
  });
}

/**
 * OrgAdmin — fetches only their own organisation via
 * GET /organisations/my-organisation (no UUID in the URL).
 *
 * Returns null (not an error) when the OrgAdmin has no org yet,
 * so the frontend can show the "Create Organisation" flow.
 *
 * Pass `enabled=false` for SuperAdmin users who should use
 * useOrganisations() or useOrganisationById() instead.
 */
export function useMyOrganisation(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.mine(),
    queryFn: () => OrganisationsService.getMyOrganisation(),
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — org data doesn't change frequently
    gcTime: 10 * 60 * 1000,   // Keep in memory for 10 minutes after last use
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      // Don't retry on auth/permission errors
      if (status === 401 || status === 403 || status === 404) return false;
      // Don't retry on timeouts — a slow backend won't get faster on retry,
      // and we want the user to see the error fast so they can investigate.
      if (error?.code === 'ECONNABORTED') return false;
      // Retry once on transient network/5xx errors
      return failureCount < 1;
    },
    retryDelay: 500,
  });
}

/**
 * Fetch one organisation by UUID.
 * Used by SuperAdmin drilling into a specific org,
 * or by OrgAdmin who already knows their org's UUID.
 */
export function useOrganisationById(orgId: string | null | undefined) {
  return useQuery({
    queryKey: organisationKeys.detail(orgId ?? ''),
    queryFn: () => OrganisationsService.getById(orgId!),
    enabled: !!orgId,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

/** SuperAdmin pending queue */
export function usePendingOrganisations() {
  return useQuery({
    queryKey: organisationKeys.pending(),
    queryFn: () => OrganisationsService.getPending(),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Register (create) a new organisation.
 *
 * FIX: After registration the user's JWT still contains the OLD payload
 * (no organisationId claim) because it was issued before the org was created.
 * The onSuccess here invalidates the cache; the OrganisationPage's onCreated
 * callback calls refreshAuth() first (to get a new token with organisationId)
 * and then refetchOrg() — that ordering is critical and already correct in
 * the page component.
 */
export function useRegisterOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganisationData) => OrganisationsService.register(data),
    onSuccess: () => {
      // Invalidate caches so the next fetch gets fresh data once the token
      // has been refreshed by the caller (OrganisationPage.onCreated)
      queryClient.invalidateQueries({ queryKey: organisationKeys.mine() });
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organisationKeys.pending() });
    },
  });
}

/**
 * Update an organisation.
 * Payload: { organisationId: string; data: UpdateOrganisationData }
 */
export function useUpdateOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      organisationId,
      data,
    }: {
      organisationId: string;
      data: UpdateOrganisationData;
    }) => OrganisationsService.update(organisationId, data),
    onSuccess: (_, { organisationId }) => {
      queryClient.invalidateQueries({ queryKey: organisationKeys.detail(organisationId) });
      queryClient.invalidateQueries({ queryKey: organisationKeys.mine() });
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
    },
  });
}

/** Delete an organisation (SuperAdmin only) */
export function useDeleteOrganisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (organisationId: string) => OrganisationsService.delete(organisationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });
    },
  });
}

/** Approve a pending organisation (SuperAdmin only) */
export function useApproveOrganisation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organisationId,
      status,
      rejectedReason,
    }: {
      organisationId: string;
      status: 'approved' | 'rejected';
      rejectedReason?: string;
    }) => OrganisationsService.approve(organisationId, {
      status,
      rejectedReason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENDPOINTS.ORGANISATIONS.PENDING] });
      queryClient.invalidateQueries({ queryKey: [ENDPOINTS.ORGANISATIONS.BASE] });
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() });

    },
  });
}