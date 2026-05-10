// src/hooks/api/usePolls.ts
// React Query hooks for Polls API

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PollsService from '@/api/services/polls.service';
import { authService } from '@/api/services';
import type {
  CreatePollData,
  Poll,
  UpdatePollData,
  VoteData,
  PollFilters,
} from '@/types/api.types';

// Query keys
export const pollKeys = {
  all: ['polls'] as const,
  lists: () => [...pollKeys.all, 'list'] as const,
  list: (filters: PollFilters) => [...pollKeys.lists(), filters] as const,
  details: () => [...pollKeys.all, 'detail'] as const,
  detail: (id: string) => [...pollKeys.details(), id] as const,
};

// Get all polls
export function usePolls(filters?: PollFilters) {
  return useQuery({
    queryKey: pollKeys.list(filters || {}),
    queryFn: () => PollsService.getAll(filters),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000,            // Real-time vote tally updates
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    // Show the previous page of polls (or cached results) immediately while a
    // fresh request is in flight — gets rid of the long blank "loading" state
    // when navigating back to the page or changing filters.
    placeholderData: keepPreviousData,
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 1;
    },
  });
}

// Get poll by ID
export function usePollById(pollId: string) {
  return useQuery({
    queryKey: pollKeys.detail(pollId),
    queryFn: () => PollsService.getById(pollId),
    enabled: !!pollId,
  });
}

// Create poll mutation
export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePollData) => PollsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
  });
}

// Update poll mutation
export function useUpdatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, data }: { pollId: string; data: UpdatePollData }) =>
      PollsService.update(pollId, data),
    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
  });
}

// Delete poll mutation
export function useDeletePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => PollsService.delete(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
  });
}

// Vote on poll mutation. Optimistically writes the user's vote into every
// cached poll list so the UI reflects the click instantly — the network
// round-trip + the next refetch silently reconcile the real tally.
export function useVotePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VoteData) => PollsService.vote(data),
    onMutate: async ({ pollId, optionId }: VoteData) => {
      const userId = authService.getUser()?.userId;
      if (!userId) return { snapshots: [] as Array<[unknown, unknown]> };

      await queryClient.cancelQueries({ queryKey: pollKeys.lists() });

      // Snapshot every cached "list" query so we can roll back on error.
      const listQueries = queryClient.getQueriesData<unknown>({
        queryKey: pollKeys.lists(),
      });
      const snapshots: Array<[unknown, unknown]> = [];

      for (const [key, value] of listQueries) {
        snapshots.push([key, value]);
        queryClient.setQueryData(key, (prev: unknown) =>
          applyOptimisticVote(prev, pollId, optionId, userId),
        );
      }

      // Same for the per-poll detail cache.
      const detailKey = pollKeys.detail(pollId);
      const prevDetail = queryClient.getQueryData<unknown>(detailKey);
      if (prevDetail !== undefined) {
        snapshots.push([detailKey, prevDetail]);
        queryClient.setQueryData(detailKey, (prev: unknown) =>
          applyOptimisticVote(prev, pollId, optionId, userId),
        );
      }

      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back every cache we touched in onMutate.
      ctx?.snapshots?.forEach(([key, value]) => {
        queryClient.setQueryData(key as readonly unknown[], value);
      });
    },
    onSettled: (result) => {
      if (result?.id) {
        queryClient.invalidateQueries({ queryKey: pollKeys.detail(result.id) });
      }
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
  });
}

// Walk the cached payload (whatever shape it came back as) and patch the
// poll/option that the user just voted on. Pure, immutable updates so React
// Query notices and re-renders.
function applyOptimisticVote(
  cached: unknown,
  pollId: string,
  optionId: string,
  userId: string,
): unknown {
  if (!cached) return cached;

  const patchPoll = (poll: Poll): Poll => {
    if (poll.id !== pollId) return poll;
    const isMulti = !!poll.multipleChoice;
    const options = (poll.options || []).map((opt) => {
      const voterIds = Array.isArray(opt.voterIds) ? [...opt.voterIds] : [];
      // Single-choice: clear this user from every other option first.
      if (!isMulti && voterIds.includes(userId) && opt.id !== optionId) {
        const next = voterIds.filter((id) => id !== userId);
        return { ...opt, voterIds: next, votes: next.length };
      }
      if (opt.id === optionId) {
        if (voterIds.includes(userId)) return opt;
        const next = [...voterIds, userId];
        return { ...opt, voterIds: next, votes: next.length };
      }
      return opt;
    });
    return { ...poll, options };
  };

  const patchList = (list: Poll[]): Poll[] => list.map(patchPoll);

  const c = cached as Record<string, unknown>;
  if (Array.isArray(cached)) return patchList(cached as Poll[]);
  if (Array.isArray(c.data)) return { ...c, data: patchList(c.data as Poll[]) };
  if (c.data && typeof c.data === 'object') {
    const d = c.data as Record<string, unknown>;
    if (Array.isArray(d.data)) return { ...c, data: { ...d, data: patchList(d.data as Poll[]) } };
    if (Array.isArray(d.items)) return { ...c, data: { ...d, items: patchList(d.items as Poll[]) } };
    // Single-poll detail payload: { data: Poll }
    if ((d as unknown as Poll).id) return { ...c, data: patchPoll(d as unknown as Poll) };
  }
  if ((c as unknown as Poll).id) return patchPoll(c as unknown as Poll);
  return cached;
}

// Bulk delete polls mutation
export function useBulkDeletePolls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollIds: string[]) => PollsService.bulkDelete(pollIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
    },
  });
}
