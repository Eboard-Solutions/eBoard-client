// src/api/services/organisations.service.ts
import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Organisation,
  CreateOrganisationData,
  UpdateOrganisationData,
} from '@/types/api.types';

export const OrganisationsService = {
  /**
   * SuperAdmin only — fetch ALL organisations.
   * OrgAdmins MUST NOT call this — it returns 403.
   */
  async getAll(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BASE);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : data.organisations || data.organizations || [];
  },

  /**
   * OrgAdmin — fetch only their own organisation.
   * Calls GET /organisations/my-organisation (no UUID in URL).
   * Returns null when the OrgAdmin has not created an org yet.
   */
  async getMyOrganisation(): Promise<Organisation | null> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.MY_ORGANISATION);
    const payload = response.data.data ?? response.data ?? null;
    // Backend sends { data: null, message: '...' } when no org exists yet
    if (!payload || (typeof payload === 'object' && !payload.organisationId)) {
      return null;
    }
    return payload as Organisation;
  },

  /**
   * Fetch a single organisation by UUID.
   * OrgAdmin: their own org only. SuperAdmin: any org.
   */
  async getById(id: string): Promise<Organisation> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BY_ID(id));
    return response.data.data || response.data;
  },

  /** SuperAdmin pending queue */
  async getPending(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.PENDING);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : data.organisations || data.organizations || [];
  },

  /** Register / create a new organisation */
  async register(data: CreateOrganisationData): Promise<Organisation> {
    const response = await apiClient.post(ENDPOINTS.ORGANISATIONS.REGISTER, data);
    return response.data.data || response.data;
  },

  /** Update an existing organisation */
  async update(id: string, data: UpdateOrganisationData): Promise<Organisation> {
    const response = await apiClient.patch(ENDPOINTS.ORGANISATIONS.BY_ID(id), data);
    return response.data.data || response.data;
  },

  /** Delete (SuperAdmin only) */
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ORGANISATIONS.BY_ID(id));
  },

  /** Approve pending org (SuperAdmin only) */
  async approve(id: string): Promise<Organisation> {
    const response = await apiClient.post(ENDPOINTS.ADMIN.APPROVE_ORG(id));
    return response.data.data || response.data;
  },
};

export default OrganisationsService;