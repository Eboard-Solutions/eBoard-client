// src/api/services/agendas.service.ts
// Agenda management API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  ApiResponse,
  Agenda,
  AgendaItem,
  CreateAgendaData,
  UpdateAgendaData,
  CreateAgendaItemData,
  UpdateAgendaItemData,
  ReorderAgendaItemsData,
  AgendaStats,
  PaginatedResponse,
  PaginationParams,
} from '@/types/api.types';

export interface FetchAgendasParams extends PaginationParams {
  status?: string;
}

export const agendasService = {
  /**
   * Get all agendas with pagination
   */
  async getAgendas(params: FetchAgendasParams = {}): Promise<PaginatedResponse<Agenda>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Agenda>>>(
      ENDPOINTS.AGENDAS.BASE,
      { params }
    );
    const data = response.data.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: Math.ceil(data.length / (params.limit || 10)),
      };
    }
    return data;
  },

  /**
   * Get agenda by ID
   */
  async getAgendaById(agendaId: string): Promise<Agenda> {
    const response = await apiClient.get<ApiResponse<Agenda>>(
      ENDPOINTS.AGENDAS.BY_ID(agendaId)
    );
    return response.data.data;
  },

  /**
   * Get agenda by meeting ID
   */
  async getAgendaByMeetingId(meetingId: string): Promise<Agenda | null> {
    try {
      const response = await apiClient.get<ApiResponse<Agenda>>(
        ENDPOINTS.AGENDAS.BY_MEETING(meetingId)
      );
      return response.data.data;
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
   */
  async createAgenda(data: CreateAgendaData): Promise<Agenda> {
    const response = await apiClient.post<ApiResponse<Agenda>>(
      ENDPOINTS.AGENDAS.BASE,
      data
    );
    return response.data.data;
  },

  /**
   * Update agenda
   */
  async updateAgenda(agendaId: string, data: UpdateAgendaData): Promise<Agenda> {
    const response = await apiClient.patch<ApiResponse<Agenda>>(
      ENDPOINTS.AGENDAS.BY_ID(agendaId),
      data
    );
    return response.data.data;
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
    const response = await apiClient.post<ApiResponse<Agenda>>(
      ENDPOINTS.AGENDAS.PUBLISH(agendaId)
    );
    return response.data.data;
  },

  /**
   * Get agenda statistics
   */
  async getAgendaStats(agendaId: string): Promise<AgendaStats> {
    const response = await apiClient.get<ApiResponse<AgendaStats>>(
      ENDPOINTS.AGENDAS.STATS(agendaId)
    );
    return response.data.data;
  },

  // ─── Agenda Items ─────────────────────────────────────

  /**
   * Add item to agenda
   */
  async addItem(agendaId: string, data: CreateAgendaItemData): Promise<AgendaItem> {
    const response = await apiClient.post<ApiResponse<AgendaItem>>(
      ENDPOINTS.AGENDAS.ITEMS.ADD(agendaId),
      data
    );
    return response.data.data;
  },

  /**
   * Update agenda item
   */
  async updateItem(
    agendaId: string,
    itemId: string,
    data: UpdateAgendaItemData
  ): Promise<AgendaItem> {
    const response = await apiClient.patch<ApiResponse<AgendaItem>>(
      ENDPOINTS.AGENDAS.ITEMS.UPDATE(agendaId, itemId),
      data
    );
    return response.data.data;
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
    const response = await apiClient.post<ApiResponse<AgendaItem>>(
      ENDPOINTS.AGENDAS.ITEMS.START(agendaId, itemId)
    );
    return response.data.data;
  },

  /**
   * Complete agenda item (during meeting)
   */
  async completeItem(agendaId: string, itemId: string): Promise<AgendaItem> {
    const response = await apiClient.post<ApiResponse<AgendaItem>>(
      ENDPOINTS.AGENDAS.ITEMS.COMPLETE(agendaId, itemId)
    );
    return response.data.data;
  },
};

export default agendasService;
