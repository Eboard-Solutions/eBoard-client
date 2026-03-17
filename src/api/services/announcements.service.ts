// src/api/services/announcements.service.ts
// Announcements API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Announcement,
  CreateAnnouncementData,
  UpdateAnnouncementData,
  AnnouncementFilters,
  BulkDeleteData,
} from '@/types/api.types';
import type {ResponseObject} from "@/api/response-object.ts";

export const announcementsService = {
  /**
   * Get all announcements with pagination and filters
   */
  async getAnnouncements(filters: AnnouncementFilters = {}): Promise<ResponseObject<Announcement[]>> {
    const response = await apiClient.get<ResponseObject<Announcement[]>>(
        ENDPOINTS.ANNOUNCEMENTS.BASE,
        { params: filters }
    );
    return response.data;
  },

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id: string): Promise<Announcement> {
    const response = await apiClient.get<ResponseObject<Announcement>>(
        ENDPOINTS.ANNOUNCEMENTS.BY_ID(id)
    );
    return response.data.data!;
  },

  /**
   * Create a new announcement
   */
  async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
    const response = await apiClient.post<ResponseObject<Announcement>>(
        ENDPOINTS.ANNOUNCEMENTS.CREATE,
        data
    );
    return response.data.data!;
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<Announcement> {
    const response = await apiClient.patch<ResponseObject<Announcement>>(
        ENDPOINTS.ANNOUNCEMENTS.UPDATE(id),
        data
    );
    return response.data.data!;
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