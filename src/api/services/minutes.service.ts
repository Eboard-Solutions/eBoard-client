// src/api/services/minutes.service.ts
// Minutes API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Minutes,
  CreateMinutesData,
  UpdateMinutesData,
  ApproveMinutesData,
  MinuteItem,
  CreateMinuteItemData,
  UpdateMinuteItemData,
  MinutesFilters,
  PaginatedResponse,
} from '@/types/api.types';

export const MinutesService = {
  // Get all minutes with pagination
  async getAll(filters?: MinutesFilters): Promise<PaginatedResponse<Minutes>> {
    const response = await apiClient.get(ENDPOINTS.MINUTES.BASE, { params: filters });
    return response.data.data || response.data;
  },

  // Get minutes by ID
  async getById(minutesId: string): Promise<Minutes> {
    const response = await apiClient.get(ENDPOINTS.MINUTES.BY_ID(minutesId));
    return response.data.data || response.data;
  },

  // Get minutes by meeting ID
  async getByMeetingId(meetingId: string): Promise<Minutes> {
    const response = await apiClient.get(ENDPOINTS.MINUTES.BY_MEETING(meetingId));
    return response.data.data || response.data;
  },

  // Create new minutes
  async create(data: CreateMinutesData): Promise<Minutes> {
    const response = await apiClient.post(ENDPOINTS.MINUTES.BASE, data);
    return response.data.data || response.data;
  },

  // Update minutes
  async update(minutesId: string, data: UpdateMinutesData): Promise<Minutes> {
    const response = await apiClient.patch(ENDPOINTS.MINUTES.BY_ID(minutesId), data);
    return response.data.data || response.data;
  },

  // Delete minutes
  async delete(minutesId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.MINUTES.BY_ID(minutesId));
  },

  // Approve or reject minutes
  async approve(minutesId: string, data: ApproveMinutesData): Promise<Minutes> {
    const response = await apiClient.post(ENDPOINTS.MINUTES.APPROVE(minutesId), data);
    return response.data.data || response.data;
  },

  // Publish approved minutes
  async publish(minutesId: string): Promise<Minutes> {
    const response = await apiClient.post(ENDPOINTS.MINUTES.PUBLISH(minutesId));
    return response.data.data || response.data;
  },

  // Submit minutes for review
  async submitForReview(minutesId: string): Promise<Minutes> {
    const response = await apiClient.post(ENDPOINTS.MINUTES.SUBMIT_REVIEW(minutesId));
    return response.data.data || response.data;
  },

  // Add minute item
  async addItem(minutesId: string, data: CreateMinuteItemData): Promise<MinuteItem> {
    const response = await apiClient.post(ENDPOINTS.MINUTES.ITEMS.ADD(minutesId), data);
    return response.data.data || response.data;
  },

  // Update minute item
  async updateItem(minutesId: string, itemId: string, data: UpdateMinuteItemData): Promise<MinuteItem> {
    const response = await apiClient.patch(ENDPOINTS.MINUTES.ITEMS.UPDATE(minutesId, itemId), data);
    return response.data.data || response.data;
  },

  // Delete minute item
  async deleteItem(minutesId: string, itemId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.MINUTES.ITEMS.DELETE(minutesId, itemId));
  },

  // Reorder minute items
  async reorderItems(minutesId: string, itemIds: string[]): Promise<void> {
    await apiClient.post(ENDPOINTS.MINUTES.ITEMS.REORDER(minutesId), itemIds);
  },
};

export default MinutesService;
