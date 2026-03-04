// src/api/services/polls.service.ts
// Polls API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Poll,
  CreatePollData,
  UpdatePollData,
  VoteData,
  PollFilters,
  PaginatedResponse,
} from '@/types/api.types';

export const PollsService = {
  // Get all polls with pagination
  async getAll(filters?: PollFilters): Promise<PaginatedResponse<Poll>> {
    const response = await apiClient.get(ENDPOINTS.POLLS.BASE, { params: filters });
    return response.data.data || response.data;
  },

  // Get poll by ID
  async getById(id: string): Promise<Poll> {
    const response = await apiClient.get(ENDPOINTS.POLLS.BY_ID(id));
    return response.data.data || response.data;
  },

  // Create poll
  async create(data: CreatePollData): Promise<Poll> {
    const response = await apiClient.post(ENDPOINTS.POLLS.CREATE, data);
    return response.data.data || response.data;
  },

  // Update poll
  async update(id: string, data: UpdatePollData): Promise<Poll> {
    const response = await apiClient.patch(ENDPOINTS.POLLS.UPDATE(id), data);
    return response.data.data || response.data;
  },

  // Delete poll
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.POLLS.DELETE(id));
  },

  // Bulk delete polls
  async bulkDelete(ids: string[]): Promise<void> {
    await apiClient.post(ENDPOINTS.POLLS.BULK_DELETE, { ids });
  },

  // Cast a vote
  async vote(data: VoteData): Promise<Poll> {
    const response = await apiClient.post(ENDPOINTS.POLLS.VOTE, data);
    return response.data.data || response.data;
  },
};

export default PollsService;
