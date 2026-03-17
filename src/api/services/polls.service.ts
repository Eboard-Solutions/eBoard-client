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
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

export const PollsService = {
  // Get all polls with pagination
  async getAll(filters?: PollFilters): Promise<ResponseObject<Poll[]>> {
    const response = await apiClient.get<ResponseObject<Poll[]>>(ENDPOINTS.POLLS.BASE, { params: filters });
    return response.data;
  },

  // Get poll by ID
  async getById(id: string): Promise<ResponseObject<Poll>> {
    const response = await apiClient.get<ResponseObject<Poll>>(ENDPOINTS.POLLS.BY_ID(id));
    return response.data;
  },

  // Create poll
  async create(data: CreatePollData): Promise<ResponseObject<Poll>> {
    const response = await apiClient.post<ResponseObject<Poll>>(ENDPOINTS.POLLS.CREATE, data);
    return response.data;
  },

  // Update poll
  async update(id: string, data: UpdatePollData): Promise<ResponseObject<Poll>> {
    const response = await apiClient.patch<ResponseObject<Poll>>(ENDPOINTS.POLLS.UPDATE(id), data);
    return response.data;
  },

  // Delete poll
  async delete(id: string): Promise<ResponseObject<Poll>> {
    const response = await apiClient.delete<ResponseObject<Poll>>(ENDPOINTS.POLLS.DELETE(id));
    return response.data;
  },

  // Bulk delete polls
  async bulkDelete(ids: string[]): Promise<ResponseObject<Poll[]>> {
    const response = await apiClient.post<ResponseObject<Poll[]>>(ENDPOINTS.POLLS.BULK_DELETE, { ids });
    return response.data;
  },

  // Cast a vote
  async vote(data: VoteData): Promise<ResponseObject<Poll>> {
    const response = await apiClient.post<ResponseObject<Poll>>(ENDPOINTS.POLLS.VOTE, data);
    return response.data;
  },
};

export default PollsService;