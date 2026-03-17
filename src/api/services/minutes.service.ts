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
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

export const MinutesService = {
  // Get all minutes with pagination
  async getAll(filters?: MinutesFilters): Promise<ResponseObject<Minutes[]>> {
    const response = await apiClient.get<ResponseObject<Minutes[]>>(ENDPOINTS.MINUTES.BASE, { params: filters });
    return response.data;
  },

  // Get minutes by ID
  async getById(minutesId: string): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.get<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.BY_ID(minutesId));
    return response.data;
  },

  // Get minutes by meeting ID
  async getByMeetingId(meetingId: string): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.get<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.BY_MEETING(meetingId));
    return response.data;
  },

  // Create new minutes
  async create(data: CreateMinutesData): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.post<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.BASE, data);
    return response.data;
  },

  // Update minutes
  async update(minutesId: string, data: UpdateMinutesData): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.patch<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.BY_ID(minutesId), data);
    return response.data;
  },

  // Delete minutes
  async delete(minutesId: string): Promise<ResponseObject<void>> {
    const response = await apiClient.delete<ResponseObject<void>>(ENDPOINTS.MINUTES.BY_ID(minutesId));
    return response.data;
  },

  // Approve or reject minutes
  async approve(minutesId: string, data: ApproveMinutesData): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.post<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.APPROVE(minutesId), data);
    return response.data;
  },

  // Publish approved minutes
  async publish(minutesId: string): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.post<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.PUBLISH(minutesId));
    return response.data;
  },

  // Submit minutes for review
  async submitForReview(minutesId: string): Promise<ResponseObject<Minutes>> {
    const response = await apiClient.post<ResponseObject<Minutes>>(ENDPOINTS.MINUTES.SUBMIT_REVIEW(minutesId));
    return response.data;
  },

  // Add minute item
  async addItem(minutesId: string, data: CreateMinuteItemData): Promise<ResponseObject<MinuteItem>> {
    const response = await apiClient.post<ResponseObject<MinuteItem>>(ENDPOINTS.MINUTES.ITEMS.ADD(minutesId), data);
    return response.data;
  },

  // Update minute item
  async updateItem(minutesId: string, itemId: string, data: UpdateMinuteItemData): Promise<ResponseObject<MinuteItem>> {
    const response = await apiClient.patch<ResponseObject<MinuteItem>>(ENDPOINTS.MINUTES.ITEMS.UPDATE(minutesId, itemId), data);
    return response.data;
  },

  // Delete minute item
  async deleteItem(minutesId: string, itemId: string): Promise<ResponseObject<void>> {
    const response = await apiClient.delete<ResponseObject<void>>(ENDPOINTS.MINUTES.ITEMS.DELETE(minutesId, itemId));
    return response.data;
  },

  // Reorder minute items
  async reorderItems(minutesId: string, itemIds: string[]): Promise<ResponseObject<void>> {
    const response = await apiClient.post<ResponseObject<void>>(ENDPOINTS.MINUTES.ITEMS.REORDER(minutesId), itemIds);
    return response.data;
  },
};

export default MinutesService;