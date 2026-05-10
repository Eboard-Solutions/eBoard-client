// src/hooks/api/usePolls.ts
// React Query hooks for Polls API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PollsService from '@/api/services/polls.service';
import type {
  CreatePollData,
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
    refetchInterval: 60 * 1000,            // Real-time vote tally updates
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
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

// Vote on poll mutation
export function useVotePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VoteData) => PollsService.vote(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pollKeys.detail(result.id) });
      queryClient.invalidateQueries({ queryKey: pollKeys.lists() });
    },
  });
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
