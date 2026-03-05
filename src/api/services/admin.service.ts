// src/api/services/admin.service.ts
// Admin API service

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type { ApiResponse, Organisation } from '@/types/api.types';

export const adminService = {
  /**
   * Approve organization registration
   */
  async approveOrganisation(id: string): Promise<Organisation> {
    const response = await apiClient.patch<ApiResponse<Organisation>>(
      ENDPOINTS.ADMIN.APPROVE_ORG(id)
    );
    return response.data.data;
  },

  /**
   * Reject organization registration
   */
  async rejectOrganisation(id: string, reason?: string): Promise<Organisation> {
    const response = await apiClient.patch<ApiResponse<Organisation>>(
      ENDPOINTS.ADMIN.APPROVE_ORG(id),
      { status: 'rejected', reason }
    );
    return response.data.data;
  },
};

export default adminService;
