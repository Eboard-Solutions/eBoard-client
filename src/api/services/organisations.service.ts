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
    const data = response.data.data ?? response.data;
    return Array.isArray(data) ? data : data.organisations ?? data.organizations ?? [];
  },

  /**
   * OrgAdmin — fetch only their own organisation.
   * Calls GET /organisations/my-organisation (no UUID in URL).
   *
   * Returns null when the OrgAdmin has not created an org yet —
   * the backend sends { data: null, message: '...' } in that case.
   *
   * FIX: unwrap response.data.data correctly since the controller
   * now always wraps the result in { data: org }.
   */
  async getMyOrganisation(): Promise<Organisation | null> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.MY_ORGANISATION);

    // Controller returns { data: null } when no org exists yet
    // and { data: { organisationId, ... } } when it does
    const payload = response.data?.data ?? null;

    if (!payload || typeof payload !== 'object' || !payload.organisationId) {
      return null;
    }

    return payload as Organisation;
  },

  /**
   * Fetch a single organisation by UUID.
   * OrgAdmin: their own org only. SuperAdmin: any org.
   *
   * FIX: controller now wraps response in { data: org }
   */
  async getById(id: string): Promise<Organisation> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BY_ID(id));
    return response.data.data ?? response.data;
  },

  /** SuperAdmin pending queue */
  async getPending(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.PENDING);
    const data = response.data.data ?? response.data;
    return Array.isArray(data) ? data : data.organisations ?? data.organizations ?? [];
  },

  /**
   * Register / create a new organisation.
   * On success the backend returns { message, organisationId } — NOT a full org.
   * The caller (useRegisterOrganisation) invalidates the cache so
   * getMyOrganisation re-fetches automatically.
   */
  async register(data: CreateOrganisationData): Promise<{ message: string; organisationId: string }> {
    const response = await apiClient.post(ENDPOINTS.ORGANISATIONS.REGISTER, data);
    return response.data.data ?? response.data;
  },

  /**
   * Update an existing organisation.
   * FIX: controller now wraps response in { data: org }
   */
  async update(id: string, data: UpdateOrganisationData): Promise<Organisation> {
    const response = await apiClient.patch(ENDPOINTS.ORGANISATIONS.BY_ID(id), data);
    return response.data.data ?? response.data;
  },

  /** Delete (SuperAdmin only) */
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ORGANISATIONS.BY_ID(id));
  },

  /** Approve pending org (SuperAdmin only) */
  async approve(id: string): Promise<Organisation> {
    const response = await apiClient.post(ENDPOINTS.ADMIN.APPROVE_ORG(id));
    return response.data.data ?? response.data;
  },
};

export default OrganisationsService;