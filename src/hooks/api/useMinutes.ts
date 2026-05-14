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

// After any minutes mutation we have to refresh every cached view of the
// same minutes — the meeting-detail page reads via `byMeeting`, the
// minutes-list page via `lists`, and the editor via `detail`. The old
// hooks only invalidated two of the three keys, so the meeting page kept
// showing the stale version until the user navigated away and back. This
// is the "updating minutes takes too long to reload" bug.
function invalidateMinutesCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  minutesId?: string,
) {
  queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
  queryClient.invalidateQueries({ queryKey: minutesKeys.all });
  if (minutesId) {
    queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
  }
}

export function useCreateMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMinutesData) => MinutesService.create(data),
    onSuccess: (_, variables) => {
      invalidateMinutesCaches(queryClient);
      if ((variables as { meetingId?: string }).meetingId) {
        queryClient.invalidateQueries({
          queryKey: minutesKeys.byMeeting((variables as { meetingId: string }).meetingId),
        });
      }
    },
  });
}

export function useUpdateMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, data }: { minutesId: string; data: UpdateMinutesData }) =>
      MinutesService.update(minutesId, data),
    onSuccess: (response, { minutesId }) => {
      invalidateMinutesCaches(queryClient, minutesId);
      // The response carries the updated minutes (with its meetingId), so we
      // can refresh the per-meeting cache even when the caller didn't pass it.
      const meetingId = (response as { data?: { meetingId?: string }; meetingId?: string })
        ?.data?.meetingId ?? (response as { meetingId?: string })?.meetingId;
      if (meetingId) {
        queryClient.invalidateQueries({ queryKey: minutesKeys.byMeeting(meetingId) });
      }
    },
  });
}

export function useDeleteMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.delete(minutesId),
    onSuccess: () => {
      invalidateMinutesCaches(queryClient);
    },
  });
}

export function useApproveMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, data }: { minutesId: string; data: ApproveMinutesData }) =>
      MinutesService.approve(minutesId, data),
    onSuccess: (_, { minutesId }) => {
      invalidateMinutesCaches(queryClient, minutesId);
    },
  });
}

export function usePublishMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.publish(minutesId),
    onSuccess: (_, minutesId) => {
      invalidateMinutesCaches(queryClient, minutesId);
    },
  });
}

export function useSubmitMinutesForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.submitForReview(minutesId),
    onSuccess: (_, minutesId) => {
      invalidateMinutesCaches(queryClient, minutesId);
    },
  });
}

export function useAddMinuteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, data }: { minutesId: string; data: CreateMinuteItemData }) =>
      MinutesService.addItem(minutesId, data),
    onSuccess: (_, { minutesId }) => {
      invalidateMinutesCaches(queryClient, minutesId);
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
      invalidateMinutesCaches(queryClient, minutesId);
    },
  });
}

export function useDeleteMinuteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, itemId }: { minutesId: string; itemId: string }) =>
      MinutesService.deleteItem(minutesId, itemId),
    onSuccess: (_, { minutesId }) => {
      invalidateMinutesCaches(queryClient, minutesId);
    },
  });
}

export function useReorderMinuteItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, itemIds }: { minutesId: string; itemIds: string[] }) =>
      MinutesService.reorderItems(minutesId, itemIds),
    onSuccess: (_, { minutesId }) => {
      invalidateMinutesCaches(queryClient, minutesId);
    },
  });
}