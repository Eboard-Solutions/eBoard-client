// src/hooks/api/useAgendas.ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendasService, type FetchAgendasParams } from '@/api/services/agendas.service';
import type {
  CreateAgendaData,
  UpdateAgendaData,
  CreateAgendaItemData,
  UpdateAgendaItemData,
  ReorderAgendaItemsData,
} from '@/types/api.types';

export const AGENDAS_QUERY_KEYS = {
  all:       ['agendas'] as const,
  lists:     () => [...AGENDAS_QUERY_KEYS.all, 'list']                     as const,
  list:      (params?: FetchAgendasParams) => [...AGENDAS_QUERY_KEYS.lists(), params] as const,
  details:   () => [...AGENDAS_QUERY_KEYS.all, 'detail']                   as const,
  detail:    (id: string) => [...AGENDAS_QUERY_KEYS.details(), id]         as const,
  byMeeting: (meetingId: string) => [...AGENDAS_QUERY_KEYS.all, 'meeting', meetingId] as const,
  stats:     (id: string) => [...AGENDAS_QUERY_KEYS.all, 'stats', id]      as const,
};

export function useAgendas(params?: FetchAgendasParams) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.list(params),
    queryFn:  () => agendasService.getAgendas(params),
    staleTime: 2 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAgenda(agendaId: string) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.detail(agendaId),
    queryFn:  () => agendasService.getAgendaById(agendaId),
    enabled:  !!agendaId,
  });
}

/**
 * Fetch the agenda for a specific meeting.
 *
 * FIX: A 404 here is EXPECTED — it means the meeting has no agenda yet.
 * Without `retry: false`, React Query retries 3 times on every 404,
 * flooding the console with identical error logs every time a user
 * selects a meeting that hasn't had an agenda created yet.
 *
 * The agendasService.getAgendaByMeetingId() already catches 404 and
 * returns null, so the query data will be null (not an error) when
 * no agenda exists. Components should treat null data as "no agenda yet"
 * and show the create form — not an error state.
 */
export function useAgendaByMeeting(meetingId: string) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.byMeeting(meetingId),
    queryFn:  () => agendasService.getAgendaByMeetingId(meetingId),
    enabled:  !!meetingId,
    // FIX: do not retry on any error — 404 = no agenda yet (not a real error)
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 404 || status === 403) return false;
      return failureCount < 1; // allow one retry for genuine network errors
    },
    // Keep showing the previous meeting's agenda while the next one loads,
    // so flipping between meetings doesn't blank the panel back to a spinner.
    placeholderData: keepPreviousData,
    // Treat null (no agenda) the same as stale data — no need to refetch constantly.
    // Longer stale window means revisiting a meeting we already loaded is instant.
    staleTime: 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });
}

export function useAgendaStats(agendaId: string) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.stats(agendaId),
    queryFn:  () => agendasService.getAgendaStats(agendaId),
    enabled:  !!agendaId,
  });
}

export function useCreateAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgendaData) => agendasService.createAgenda(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.byMeeting(variables.meetingId) });
    },
  });
}

export function useUpdateAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agendaId, data }: { agendaId: string; data: UpdateAgendaData }) =>
      agendasService.updateAgenda(agendaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.lists() });
    },
  });
}

export function useDeleteAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agendaId: string) => agendasService.deleteAgenda(agendaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
    },
  });
}

export function usePublishAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agendaId: string) => agendasService.publishAgenda(agendaId),
    onSuccess: (_, agendaId) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(agendaId) });
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.lists() });
    },
  });
}

export function useAddAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agendaId, data }: { agendaId: string; data: CreateAgendaItemData }) =>
      agendasService.addItem(agendaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
    },
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      agendaId, itemId, data,
    }: { agendaId: string; itemId: string; data: UpdateAgendaItemData }) =>
      agendasService.updateItem(agendaId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
    },
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agendaId, itemId }: { agendaId: string; itemId: string }) =>
      agendasService.deleteItem(agendaId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
    },
  });
}

export function useReorderAgendaItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agendaId, data }: { agendaId: string; data: ReorderAgendaItemsData }) =>
      agendasService.reorderItems(agendaId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
    },
  });
}

export function useStartAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agendaId, itemId }: { agendaId: string; itemId: string }) =>
      agendasService.startItem(agendaId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.stats(variables.agendaId) });
    },
  });
}

export function useCompleteAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agendaId, itemId }: { agendaId: string; itemId: string }) =>
      agendasService.completeItem(agendaId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.stats(variables.agendaId) });
    },
  });
}