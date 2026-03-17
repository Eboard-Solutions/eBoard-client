// src/api/services/notifications.service.ts
// Notifications API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Notification,
  CreateNotificationData,
  UpdateNotificationData,
  NotificationFilters,
} from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

export const NotificationsService = {
  // Get all notifications with pagination
  async getAll(filters?: NotificationFilters): Promise<ResponseObject<Notification[]>> {
    const response = await apiClient.get<ResponseObject<Notification[]>>(ENDPOINTS.NOTIFICATIONS.BASE, { params: filters });
    return response.data;
  },

  // Get notification by ID
  async getById(id: string): Promise<ResponseObject<Notification>> {
    const response = await apiClient.get<ResponseObject<Notification>>(ENDPOINTS.NOTIFICATIONS.BY_ID(id));
    return response.data;
  },

  // Create notification
  async create(data: CreateNotificationData): Promise<ResponseObject<Notification>> {
    const response = await apiClient.post<ResponseObject<Notification>>(ENDPOINTS.NOTIFICATIONS.CREATE, data);
    return response.data;
  },

  // Update notification
  async update(id: string, data: UpdateNotificationData): Promise<ResponseObject<Notification>> {
    const response = await apiClient.patch<ResponseObject<Notification>>(ENDPOINTS.NOTIFICATIONS.UPDATE(id), data);
    return response.data;
  },

  // Mark as read
  async markAsRead(id: string): Promise<ResponseObject<Notification>> {
    const response = await apiClient.patch<ResponseObject<Notification>>(ENDPOINTS.NOTIFICATIONS.UPDATE(id), { isRead: true });
    return response.data;
  },

  // Toggle flag
  async toggleFlag(id: string, isFlagged: boolean): Promise<ResponseObject<Notification>> {
    const response = await apiClient.patch<ResponseObject<Notification>>(ENDPOINTS.NOTIFICATIONS.UPDATE(id), { isFlagged });
    return response.data;
  },

  // Delete notification
  async delete(id: string): Promise<ResponseObject<Notification>> {
    const response = await apiClient.delete<ResponseObject<Notification>>(ENDPOINTS.NOTIFICATIONS.DELETE(id));
    return response.data;
  },

  // Bulk delete notifications
  async bulkDelete(ids: string[]): Promise<ResponseObject<Notification[]>> {
    const response = await apiClient.post<ResponseObject<Notification[]>>(ENDPOINTS.NOTIFICATIONS.BULK_DELETE, { ids });
    return response.data;
  },
};

export default NotificationsService;