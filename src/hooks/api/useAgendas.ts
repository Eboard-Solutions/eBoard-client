// src/hooks/api/useAgendas.ts
// React Query hooks for agenda management

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agendasService, type FetchAgendasParams } from '@/api/services/agendas.service';
import type {
  CreateAgendaData,
  UpdateAgendaData,
  CreateAgendaItemData,
  UpdateAgendaItemData,
  ReorderAgendaItemsData,
} from '@/types/api.types';

export const AGENDAS_QUERY_KEYS = {
  all: ['agendas'] as const,
  lists: () => [...AGENDAS_QUERY_KEYS.all, 'list'] as const,
  list: (params?: FetchAgendasParams) => [...AGENDAS_QUERY_KEYS.lists(), params] as const,
  details: () => [...AGENDAS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...AGENDAS_QUERY_KEYS.details(), id] as const,
  byMeeting: (meetingId: string) => [...AGENDAS_QUERY_KEYS.all, 'meeting', meetingId] as const,
  stats: (id: string) => [...AGENDAS_QUERY_KEYS.all, 'stats', id] as const,
};

/**
 * Hook to get all agendas with pagination
 */
export function useAgendas(params?: FetchAgendasParams) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.list(params),
    queryFn: () => agendasService.getAgendas(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get agenda by ID
 */
export function useAgenda(agendaId: string) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.detail(agendaId),
    queryFn: () => agendasService.getAgendaById(agendaId),
    enabled: !!agendaId,
  });
}

/**
 * Hook to get agenda by meeting ID
 */
export function useAgendaByMeeting(meetingId: string) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.byMeeting(meetingId),
    queryFn: () => agendasService.getAgendaByMeetingId(meetingId),
    enabled: !!meetingId,
  });
}

/**
 * Hook to get agenda statistics
 */
export function useAgendaStats(agendaId: string) {
  return useQuery({
    queryKey: AGENDAS_QUERY_KEYS.stats(agendaId),
    queryFn: () => agendasService.getAgendaStats(agendaId),
    enabled: !!agendaId,
  });
}

/**
 * Hook to create a new agenda
 */
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

/**
 * Hook to update agenda
 */
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

/**
 * Hook to delete agenda
 */
export function useDeleteAgenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agendaId: string) => agendasService.deleteAgenda(agendaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to publish agenda
 */
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

// ─── Agenda Items Hooks ─────────────────────────────────────

/**
 * Hook to add item to agenda
 */
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

/**
 * Hook to update agenda item
 */
export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      agendaId,
      itemId,
      data,
    }: {
      agendaId: string;
      itemId: string;
      data: UpdateAgendaItemData;
    }) => agendasService.updateItem(agendaId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.detail(variables.agendaId) });
    },
  });
}

/**
 * Hook to delete agenda item
 */
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

/**
 * Hook to reorder agenda items
 */
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

/**
 * Hook to start agenda item
 */
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

/**
 * Hook to complete agenda item
 */
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
