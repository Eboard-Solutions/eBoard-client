// src/hooks/api/useAnnouncements.ts
// React Query hooks for announcements management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsService } from '@/api/services';
import type {
  CreateAnnouncementData,
  UpdateAnnouncementData,
  AnnouncementFilters,
  BulkDeleteData,
} from '@/types/api.types';

export const ANNOUNCEMENTS_QUERY_KEYS = {
  all: ['announcements'] as const,
  lists: () => [...ANNOUNCEMENTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: AnnouncementFilters) => [...ANNOUNCEMENTS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...ANNOUNCEMENTS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ANNOUNCEMENTS_QUERY_KEYS.details(), id] as const,
};

/**
 * Hook to get all announcements with filters
 */
export function useAnnouncements(filters?: AnnouncementFilters) {
  return useQuery({
    queryKey: ANNOUNCEMENTS_QUERY_KEYS.list(filters),
    queryFn: () => announcementsService.getAnnouncements(filters),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,            // New announcements stream in
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get announcement by ID
 */
export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: ANNOUNCEMENTS_QUERY_KEYS.detail(id),
    queryFn: () => announcementsService.getAnnouncementById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new announcement
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementData) => announcementsService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to update announcement
 */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnnouncementData }) =>
      announcementsService.updateAnnouncement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to delete announcement
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => announcementsService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to bulk delete announcements
 */
export function useBulkDeleteAnnouncements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkDeleteData) => announcementsService.bulkDeleteAnnouncements(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEYS.all });
    },
  });
}
