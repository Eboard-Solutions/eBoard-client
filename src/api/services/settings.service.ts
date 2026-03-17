// src/api/services/settings.service.ts
// Settings API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type { OrganisationSettings, UpdateSettingsData } from '@/types/api.types';
import { ResponseObject } from "@/api/response-object.ts";

export const SettingsService = {
  // Get settings for organization
  async getByorganisationId(organisationId: string): Promise<ResponseObject<OrganisationSettings>> {
    const response = await apiClient.get<ResponseObject<OrganisationSettings>>(ENDPOINTS.SETTINGS.BY_ORG(organisationId));
    return response.data;
  },

  // Get all organization settings (super admin)
  async getAll(): Promise<ResponseObject<OrganisationSettings[]>> {
    const response = await apiClient.get<ResponseObject<OrganisationSettings[]>>(ENDPOINTS.SETTINGS.ALL);
    return response.data;
  },

  // Get default organization settings (from token)
  async getDefault(): Promise<ResponseObject<OrganisationSettings>> {
    const response = await apiClient.get<ResponseObject<OrganisationSettings>>(ENDPOINTS.SETTINGS.DEFAULT);
    return response.data;
  },

  // Update organization settings
  async update(data: UpdateSettingsData): Promise<ResponseObject<OrganisationSettings>> {
    const response = await apiClient.patch<ResponseObject<OrganisationSettings>>(ENDPOINTS.SETTINGS.UPDATE, data);
    return response.data;
  },
};

export default SettingsService;