// src/api/services/announcements.service.ts
// Announcements API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  ApiResponse,
  Announcement,
  CreateAnnouncementData,
  UpdateAnnouncementData,
  AnnouncementFilters,
  BulkDeleteData,
  PaginatedResponse,
} from '@/types/api.types';

export const announcementsService = {
  /**
   * Get all announcements with pagination and filters
   */
  async getAnnouncements(filters: AnnouncementFilters = {}): Promise<PaginatedResponse<Announcement>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Announcement>>>(
      ENDPOINTS.ANNOUNCEMENTS.BASE,
      { params: filters }
    );
    const data = response.data.data;
    // Handle both array and paginated responses
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: filters.page || 1,
        limit: 10,
        totalPages: Math.ceil(data.length / 10),
      };
    }
    return data;
  },

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id: string): Promise<Announcement> {
    const response = await apiClient.get<ApiResponse<Announcement>>(
      ENDPOINTS.ANNOUNCEMENTS.BY_ID(id)
    );
    return response.data.data;
  },

  /**
   * Create a new announcement
   */
  async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
    const response = await apiClient.post<ApiResponse<Announcement>>(
      ENDPOINTS.ANNOUNCEMENTS.CREATE,
      data
    );
    return response.data.data;
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<Announcement> {
    const response = await apiClient.patch<ApiResponse<Announcement>>(
      ENDPOINTS.ANNOUNCEMENTS.UPDATE(id),
      data
    );
    return response.data.data;
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ANNOUNCEMENTS.DELETE(id));
  },

  /**
   * Bulk delete announcements
   */
  async bulkDeleteAnnouncements(data: BulkDeleteData): Promise<void> {
    await apiClient.post(ENDPOINTS.ANNOUNCEMENTS.BULK_DELETE, data);
  },
};

export default announcementsService;
