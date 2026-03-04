// src/api/services/organisations.service.ts
// Organisations API service

import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Organisation,
  CreateOrganisationData,
  UpdateOrganisationData,
} from '@/types/api.types';

export const OrganisationsService = {
  // Get all organisations
  async getAll(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BASE);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : data.organisations || data.organizations || [];
  },

  // Get organisation by ID
  async getById(id: string): Promise<Organisation> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BY_ID(id));
    return response.data.data || response.data;
  },

  // Get pending organisations (for super admin)
  async getPending(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.PENDING);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : data.organisations || data.organizations || [];
  },

  // Register new organisation
  async register(data: CreateOrganisationData): Promise<Organisation> {
    const response = await apiClient.post(ENDPOINTS.ORGANISATIONS.REGISTER, data);
    return response.data.data || response.data;
  },

  // Update organisation
  async update(id: string, data: UpdateOrganisationData): Promise<Organisation> {
    const response = await apiClient.patch(ENDPOINTS.ORGANISATIONS.BY_ID(id), data);
    return response.data.data || response.data;
  },

  // Delete organisation
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ORGANISATIONS.BY_ID(id));
  },

  // Approve organisation (admin)
  async approve(id: string): Promise<Organisation> {
    const response = await apiClient.post(ENDPOINTS.ADMIN.APPROVE_ORG(id));
    return response.data.data || response.data;
  },
};

export default OrganisationsService;
