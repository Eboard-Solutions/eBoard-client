// src/api/services/settings.service.ts
// Settings API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type { OrganisationSettings, UpdateSettingsData } from '@/types/api.types';

export const SettingsService = {
  // Get settings for organization
  async getByOrgId(orgId: string): Promise<OrganisationSettings> {
    const response = await apiClient.get(ENDPOINTS.SETTINGS.BY_ORG(orgId));
    return response.data.data || response.data;
  },

  // Get all organization settings (super admin)
  async getAll(): Promise<OrganisationSettings[]> {
    const response = await apiClient.get(ENDPOINTS.SETTINGS.ALL);
    return response.data.data || response.data;
  },

  // Get default organization settings (from token)
  async getDefault(): Promise<OrganisationSettings> {
    const response = await apiClient.get(ENDPOINTS.SETTINGS.DEFAULT);
    return response.data.data || response.data;
  },

  // Update organization settings
  async update(data: UpdateSettingsData): Promise<OrganisationSettings> {
    const response = await apiClient.patch(ENDPOINTS.SETTINGS.UPDATE, data);
    return response.data.data || response.data;
  },
};

export default SettingsService;
