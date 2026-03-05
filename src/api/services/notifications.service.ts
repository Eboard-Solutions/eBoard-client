// src/api/services/notifications.service.ts
// Notifications API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Notification,
  CreateNotificationData,
  UpdateNotificationData,
  NotificationFilters,
  PaginatedResponse,
} from '@/types/api.types';

export const NotificationsService = {
  // Get all notifications with pagination
  async getAll(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE, { params: filters });
    return response.data.data || response.data;
  },

  // Get notification by ID
  async getById(id: string): Promise<Notification> {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BY_ID(id));
    return response.data.data || response.data;
  },

  // Create notification
  async create(data: CreateNotificationData): Promise<Notification> {
    const response = await apiClient.post(ENDPOINTS.NOTIFICATIONS.CREATE, data);
    return response.data.data || response.data;
  },

  // Update notification
  async update(id: string, data: UpdateNotificationData): Promise<Notification> {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.UPDATE(id), data);
    return response.data.data || response.data;
  },

  // Mark as read
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.UPDATE(id), { isRead: true });
    return response.data.data || response.data;
  },

  // Toggle flag
  async toggleFlag(id: string, isFlagged: boolean): Promise<Notification> {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.UPDATE(id), { isFlagged });
    return response.data.data || response.data;
  },

  // Delete notification
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },

  // Bulk delete notifications
  async bulkDelete(ids: string[]): Promise<void> {
    await apiClient.post(ENDPOINTS.NOTIFICATIONS.BULK_DELETE, { ids });
  },
};

export default NotificationsService;
