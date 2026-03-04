// src/hooks/api/useMinutes.ts
// React Query hooks for Minutes API

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

// Query keys
export const minutesKeys = {
  all: ['minutes'] as const,
  lists: () => [...minutesKeys.all, 'list'] as const,
  list: (filters: MinutesFilters) => [...minutesKeys.lists(), filters] as const,
  details: () => [...minutesKeys.all, 'detail'] as const,
  detail: (id: string) => [...minutesKeys.details(), id] as const,
  byMeeting: (meetingId: string) => [...minutesKeys.all, 'meeting', meetingId] as const,
};

// Get all minutes
export function useMinutes(filters?: MinutesFilters) {
  return useQuery({
    queryKey: minutesKeys.list(filters || {}),
    queryFn: () => MinutesService.getAll(filters),
  });
}

// Get minutes by ID
export function useMinutesById(minutesId: string) {
  return useQuery({
    queryKey: minutesKeys.detail(minutesId),
    queryFn: () => MinutesService.getById(minutesId),
    enabled: !!minutesId,
  });
}

// Get minutes by meeting ID
export function useMinutesByMeeting(meetingId: string) {
  return useQuery({
    queryKey: minutesKeys.byMeeting(meetingId),
    queryFn: () => MinutesService.getByMeetingId(meetingId),
    enabled: !!meetingId,
  });
}

// Create minutes mutation
export function useCreateMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMinutesData) => MinutesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

// Update minutes mutation
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

// Delete minutes mutation
export function useDeleteMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (minutesId: string) => MinutesService.delete(minutesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.lists() });
    },
  });
}

// Approve minutes mutation
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

// Publish minutes mutation
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

// Submit minutes for review mutation
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

// Add minute item mutation
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

// Update minute item mutation
export function useUpdateMinuteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ minutesId, itemId, data }: { minutesId: string; itemId: string; data: UpdateMinuteItemData }) =>
      MinutesService.updateItem(minutesId, itemId, data),
    onSuccess: (_, { minutesId }) => {
      queryClient.invalidateQueries({ queryKey: minutesKeys.detail(minutesId) });
    },
  });
}

// Delete minute item mutation
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

// Reorder minute items mutation
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
