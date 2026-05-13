// src/api/services/agendas.service.ts
// Agenda management API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Agenda,
  AgendaItem,
  CreateAgendaData,
  UpdateAgendaData,
  CreateAgendaItemData,
  UpdateAgendaItemData,
  ReorderAgendaItemsData,
  AgendaStats,
  PaginationParams,
} from '@/types/api.types';
import type {ResponseObject} from "@/api/response-object.ts";

export interface FetchAgendasParams extends PaginationParams {
  status?: string;
}

export const agendasService = {
  /**
   * Get all agendas with pagination
   */
  async getAgendas(params: FetchAgendasParams = {}): Promise<ResponseObject<Agenda[]>> {
    const response = await apiClient.get<ResponseObject<Agenda[]>>(
        ENDPOINTS.AGENDAS.BASE,
        { params }
    );
    return response.data;
  },

  /**
   * Get agenda by ID
   */
  async getAgendaById(agendaId: string): Promise<Agenda> {
    const response = await apiClient.get<ResponseObject<Agenda>>(
        ENDPOINTS.AGENDAS.BY_ID(agendaId)
    );
    return response.data.data!;
  },

  /**
   * Get agenda by meeting ID
   */
  async getAgendaByMeetingId(meetingId: string): Promise<Agenda | null> {
    try {
      // Tighter per-call timeout: a missing agenda should fall through quickly
      // rather than wait the full 30s default. Backend usually answers in <1s,
      // so 12s is a generous upper bound that still feels snappy on slow links.
      const response = await apiClient.get<ResponseObject<Agenda>>(
          ENDPOINTS.AGENDAS.BY_MEETING(meetingId),
          { timeout: 12_000 }
      );
      return response.data.data || null;
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return null;
        }
      }
      throw error;
    }
  },

  /**
   * Create a new agenda
   *
   * Generous 60s timeout: agenda creation can fan out to notifications,
   * audit logs, and pre-read attachment seeding on the backend, and the
   * default 30s was being tripped on first-create when the worker pool
   * was cold. The user sees "timeout of 30000ms exceeded" on a save that
   * actually succeeded server-side — a confusing failure mode worth avoiding.
   */
  async createAgenda(data: CreateAgendaData): Promise<Agenda> {
    const response = await apiClient.post<ResponseObject<Agenda>>(
        ENDPOINTS.AGENDAS.BASE,
        data,
        { timeout: 60_000 }
    );
    return response.data.data!;
  },

  /**
   * Update agenda
   */
  async updateAgenda(agendaId: string, data: UpdateAgendaData): Promise<Agenda> {
    const response = await apiClient.patch<ResponseObject<Agenda>>(
        ENDPOINTS.AGENDAS.BY_ID(agendaId),
        data,
        { timeout: 60_000 }
    );
    return response.data.data!;
  },

  /**
   * Delete agenda
   */
  async deleteAgenda(agendaId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.AGENDAS.BY_ID(agendaId));
  },

  /**
   * Publish agenda
   */
  async publishAgenda(agendaId: string): Promise<Agenda> {
    const response = await apiClient.post<ResponseObject<Agenda>>(
        ENDPOINTS.AGENDAS.PUBLISH(agendaId)
    );
    return response.data.data!;
  },

  /**
   * Get agenda statistics
   */
  async getAgendaStats(agendaId: string): Promise<AgendaStats> {
    const response = await apiClient.get<ResponseObject<AgendaStats>>(
        ENDPOINTS.AGENDAS.STATS(agendaId)
    );
    return response.data.data!;
  },

  // ─── Agenda Items ─────────────────────────────────────

  /**
   * Add item to agenda
   */
  async addItem(agendaId: string, data: CreateAgendaItemData): Promise<AgendaItem> {
    const response = await apiClient.post<ResponseObject<AgendaItem>>(
        ENDPOINTS.AGENDAS.ITEMS.ADD(agendaId),
        data,
        { timeout: 45_000 }
    );
    return response.data.data!;
  },

  /**
   * Update agenda item
   */
  async updateItem(
      agendaId: string,
      itemId: string,
      data: UpdateAgendaItemData
  ): Promise<AgendaItem> {
    const response = await apiClient.patch<ResponseObject<AgendaItem>>(
        ENDPOINTS.AGENDAS.ITEMS.UPDATE(agendaId, itemId),
        data,
        { timeout: 45_000 }
    );
    return response.data.data!;
  },

  /**
   * Delete agenda item
   */
  async deleteItem(agendaId: string, itemId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.AGENDAS.ITEMS.DELETE(agendaId, itemId));
  },

  /**
   * Reorder agenda items
   */
  async reorderItems(agendaId: string, data: ReorderAgendaItemsData): Promise<void> {
    await apiClient.post(ENDPOINTS.AGENDAS.ITEMS.REORDER(agendaId), data);
  },

  /**
   * Start agenda item (during meeting)
   */
  async startItem(agendaId: string, itemId: string): Promise<AgendaItem> {
    const response = await apiClient.post<ResponseObject<AgendaItem>>(
        ENDPOINTS.AGENDAS.ITEMS.START(agendaId, itemId)
    );
    return response.data.data!;
  },

  /**
   * Complete agenda item (during meeting)
   */
  async completeItem(agendaId: string, itemId: string): Promise<AgendaItem> {
    const response = await apiClient.post<ResponseObject<AgendaItem>>(
        ENDPOINTS.AGENDAS.ITEMS.COMPLETE(agendaId, itemId)
    );
    return response.data.data!;
  },
};

export default agendasService;