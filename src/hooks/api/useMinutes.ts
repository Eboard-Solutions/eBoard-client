// src/hooks/api/useMinutes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MinutesService from '@/api/services/minutes.service';
import type {
  CreateMinutesData,
  UpdateMinutesData,
  ApproveMinutesData,
  CreateMinuteItemData,
  UpdateMinuteItemData,
  MinutesFilters,
} from '@/types/api.types';

export const minutesKeys = {
  all:       ['minutes'] as const,
  lists:     () => [...minutesKeys.all, 'list']                         as const,
  list:      (filters: MinutesFilters) => [...minutesKeys.lists(), filters] as const,
  details:   () => [...minutesKeys.all, 'detail']                       as const,
  detail:    (id: string) => [...minutesKeys.details(), id]             as const,
  byMeeting: (meetingId: string) => [...minutesKeys.all, 'meeting', meetingId] as const,
};

export function useMinutes(filters?: MinutesFilters) {
  return useQuery({
    queryKey: minutesKeys.list(filters || {}),
    queryFn:  () => MinutesService.getAll(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMinutesById(minutesId: string) {
  return useQuery({
    queryKey: minutesKeys.detail(minutesId),
    queryFn:  () => MinutesService.getById(minutesId),
    enabled:  !!minutesId,
  });
}

/**
 * Fetch minutes for a specific meeting.
 *
 * FIX: A 404 here is EXPECTED — it means the meeting has no minutes yet.
 * Without retry: false, React Query retries 3 times on 404, spamming
 * the console every time a user selects a meeting with no minutes.
 *
 * Components should treat null/undefined data as "no minutes yet"
 * and show the create form rather than an error state.
 */
export function useMinutesByMeeting(meetingId: string) {
  return useQuery({
    queryKey: minutesKeys.byMeeting(meetingId),
    queryFn:  async () => {
      try {
        return await MinutesService.getByMeetingId(meetingId);
      } catch (err: any) {
        // FIX: 404 means no minutes exist yet — return null instead of throwing
        // so the component shows "create minutes" rather than an error state
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!meetingId,
    // FIX: don't retry on 404 or 403 — these are expected, not transient errors
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 404 || status === 403) return false;
      return failureCount < 1;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMinutesData) => MinutesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

export function useUpdateMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, data }: { minutesId: string; data: UpdateMinutesData }) =>
      MinutesService.update(minutesId, data),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

export function useDeleteMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.delete(minutesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

export function useApproveMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, data }: { minutesId: string; data: ApproveMinutesData }) =>
      MinutesService.approve(minutesId, data),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

export function usePublishMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.publish(minutesId),
    onSuccess: (_, minutesId) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

export function useSubmitMinutesForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.submitForReview(minutesId),
    onSuccess: (_, minutesId) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

export function useAddMinuteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, data }: { minutesId: string; data: CreateMinuteItemData }) =>
      MinutesService.addItem(minutesId, data),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
    },
  });
}

export function useUpdateMinuteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      minutesId, itemId, data,
    }: { minutesId: string; itemId: string; data: UpdateMinuteItemData }) =>
      MinutesService.updateItem(minutesId, itemId, data),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
    },
  });
}

export function useDeleteMinuteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, itemId }: { minutesId: string; itemId: string }) =>
      MinutesService.deleteItem(minutesId, itemId),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
    },
  });
}

export function useReorderMinuteItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, itemIds }: { minutesId: string; itemIds: string[] }) =>
      MinutesService.reorderItems(minutesId, itemIds),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
    },
  });
}