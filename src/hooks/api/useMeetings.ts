// src/hooks/api/useMeetings.ts
// React Query hooks for meetings management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingsService, type FetchMeetingsParams } from '@/api/services/meetings.service';
import type {
  CreateMeetingData,
  UpdateMeetingData,
  AddAttendeesData,
  RSVPData,
} from '@/types/api.types';

export const MEETINGS_QUERY_KEYS = {
  all: ['meetings'] as const,
  lists: () => [...MEETINGS_QUERY_KEYS.all, 'list'] as const,
  list: (params?: FetchMeetingsParams) => [...MEETINGS_QUERY_KEYS.lists(), params] as const,
  myMeetings: (includeDeclined?: boolean) =>
    [...MEETINGS_QUERY_KEYS.all, 'my', includeDeclined] as const,
  details: () => [...MEETINGS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...MEETINGS_QUERY_KEYS.details(), id] as const,
  attendees: (id: string) => [...MEETINGS_QUERY_KEYS.all, 'attendees', id] as const,
  attendeeStats: (id: string) => [...MEETINGS_QUERY_KEYS.all, 'attendee-stats', id] as const,
};

/**
 * Hook to get all meetings with pagination
 */
export function useMeetings(params?: FetchMeetingsParams) {
  return useQuery({
    queryKey: MEETINGS_QUERY_KEYS.list(params),
    queryFn: () => meetingsService.getMeetings(params),
    staleTime: 60 * 1000,                  // 1 min cache before background refetch
    refetchInterval: 60 * 1000,            // Real-time: poll every 60s while page open
    refetchIntervalInBackground: false,    // Pause when tab is hidden — saves bandwidth
    refetchOnWindowFocus: true,            // Refresh the moment the user returns
  });
}

/**
 * Hook to get user's meetings. Used by the dashboard "Upcoming Meetings"
 * widget — keep data fresh enough that navigating back doesn't show the
 * stale cached list until the next 60s tick.
 */
export function useMyMeetings(includeDeclined = false) {
  return useQuery({
    queryKey: MEETINGS_QUERY_KEYS.myMeetings(includeDeclined),
    queryFn: () => meetingsService.getMyMeetings(includeDeclined),
    staleTime: 15 * 1000,                  // Treat data as stale after 15s
    refetchInterval: 45 * 1000,            // Poll every 45s while tab is active
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',              // Always re-check when the widget remounts
  });
}

/**
 * Hook to get meeting by ID
 */
export function useMeeting(meetingId: string) {
  return useQuery({
    queryKey: MEETINGS_QUERY_KEYS.detail(meetingId),
    queryFn: () => meetingsService.getMeetingById(meetingId),
    enabled: !!meetingId,
  });
}

/**
 * Hook to get meeting attendees
 */
export function useMeetingAttendees(meetingId: string) {
  return useQuery({
    queryKey: MEETINGS_QUERY_KEYS.attendees(meetingId),
    queryFn: () => meetingsService.getAttendees(meetingId),
    enabled: !!meetingId,
  });
}

/**
 * Hook to get meeting attendee stats
 */
export function useMeetingAttendeeStats(meetingId: string) {
  return useQuery({
    queryKey: MEETINGS_QUERY_KEYS.attendeeStats(meetingId),
    queryFn: () => meetingsService.getAttendeeStats(meetingId),
    enabled: !!meetingId,
  });
}

/**
 * Hook to create a new meeting
 */
export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMeetingData) => meetingsService.createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to update meeting
 */
export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, data }: { meetingId: string; data: UpdateMeetingData }) =>
      meetingsService.updateMeeting(meetingId, data),
    onSuccess: (_, variables) => {
      // Wipe every cached view of this meeting so the page reloads against
      // fresh data: detail, all paginated lists, the user's "my meetings"
      // feed (the dashboard widget), and the related minutes record.
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.detail(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['minutes', 'meeting', variables.meetingId] });
    },
  });
}

/**
 * Hook to delete meeting
 */
export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingsService.deleteMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to add attendees to meeting
 */
export function useAddAttendees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, data }: { meetingId: string; data: AddAttendeesData }) =>
      meetingsService.addAttendees(meetingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.attendees(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.attendeeStats(variables.meetingId) });
    },
  });
}

/**
 * Hook to remove attendee from meeting
 */
export function useRemoveAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, userId }: { meetingId: string; userId: string }) =>
      meetingsService.removeAttendee(meetingId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.attendees(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.attendeeStats(variables.meetingId) });
    },
  });
}

/**
 * Hook to RSVP to meeting
 */
export function useRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, data }: { meetingId: string; data: RSVPData }) =>
      meetingsService.rsvp(meetingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.detail(variables.meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.myMeetings() });
    },
  });
}

/**
 * Hook to start meeting
 */
export function useStartMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingsService.startMeeting(meetingId),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.detail(meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to complete meeting
 */
export function useCompleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingsService.completeMeeting(meetingId),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.detail(meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Hook to cancel meeting
 */
export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meetingId: string) => meetingsService.cancelMeeting(meetingId),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.detail(meetingId) });
      queryClient.invalidateQueries({ queryKey: MEETINGS_QUERY_KEYS.lists() });
    },
  });
}
