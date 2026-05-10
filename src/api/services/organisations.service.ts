// src/api/services/organisations.service.ts
import apiClient from '../client';
import { ENDPOINTS } from '@/config/api.config';
import type {
  Organisation,
  CreateOrganisationData,
  UpdateOrganisationData,
} from '@/types/api.types';

// ─── Response unwrap helpers ──────────────────────────────────────────────────
//
// Your backend has a double-wrapping pattern:
//
//   Service  → new ResponseObject({ data: orgDto })
//              = { statusCode, message, data: orgDto }
//
//   Controller → return { data: serviceResult }
//              = { data: { statusCode, message, data: orgDto } }
//
// Axios response.data is the HTTP body, so:
//   response.data          = { data: { statusCode, message, data: org } }
//   response.data.data     = { statusCode, message, data: org }   ← ResponseObject
//   response.data.data.data = org                                  ← actual entity
//
// deepUnwrap() handles both the double-wrapped case (controller + ResponseObject)
// and the single-wrapped case (ResponseObject only, or plain object).

function deepUnwrap(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;

  // Case 1: Double-wrapped by controller + ResponseObject
  // Structure: { data: { statusCode, message, data: X } }
  if (
    r.data != null &&
    typeof r.data === 'object' &&
    'statusCode' in (r.data as object) &&
    'data' in (r.data as object)
  ) {
    const inner = (r.data as Record<string, unknown>).data;
    return inner;  // Return the innermost data
  }

  // Case 2: ResponseObject directly (statusCode at root)
  // Structure: { statusCode, message, data: X }
  if ('statusCode' in r && 'data' in r) {
    return r.data;  // Extract inner data
  }

  // Case 3: Single-wrapped: { data: X }
  if ('data' in r) return r.data;

  // Case 4: Already unwrapped or unknown format
  return raw;
}

function unwrapArray(raw: unknown): Organisation[] {
  const unwrapped = deepUnwrap(raw);
  if (Array.isArray(unwrapped)) return unwrapped as Organisation[];
  if (unwrapped && typeof unwrapped === 'object') {
    const u = unwrapped as Record<string, unknown>;
    if (Array.isArray(u.items)) return u.items as Organisation[];
    if (Array.isArray(u.organisations)) return u.organisations as Organisation[];
    if (Array.isArray(u.data)) return u.data as Organisation[];
  }
  return [];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const OrganisationsService = {
  /**
   * SuperAdmin only — fetch ALL organisations.
   * OrgAdmins MUST NOT call this — it returns 403.
   */
  async getAll(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BASE);
    return unwrapArray(response.data);
  },

  /**
   * OrgAdmin — fetch only their own organisation.
   * Calls GET /organisations/my-organisation (no UUID in URL).
   *
   * Returns null when the OrgAdmin has not created an org yet —
   * the backend sends { data: null } in that case.
   *
   * ROOT CAUSE FIX:
   * Backend response body:
   *   { data: { statusCode: 200, message: '...', data: { organisationId, ... } } }
   *
   * Old code did:  payload = response.data?.data
   *   → got { statusCode, message, data: org } — a ResponseObject, not the org!
   *   → !payload.organisationId was TRUE → returned null even when org exists
   *
   * New code does: payload = deepUnwrap(response.data)
   *   → correctly digs through both wrapper layers to the actual org object
   */
  async getMyOrganisation(): Promise<Organisation | null> {
    try {
      // Fail fast (12s) instead of the global 30s — a slow backend should
      // surface as an error in the UI quickly, not leave users staring at
      // a spinner. React Query will retry up to 2x on network/5xx errors.
      const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.MY_ORGANISATION, {
        timeout: 12_000,
      });
      const payload = deepUnwrap(response.data);

      // Backend returns null when no org is linked yet
      if (payload == null) return null;
      if (typeof payload !== 'object') {
        console.warn('Invalid organisation response format:', payload);
        return null;
      }

      const org = payload as Record<string, unknown>;

      // Validate it has org-like properties
      if (!org.organisationId && !org.organisationName) {
        console.warn('Response missing org identifiers:', org);
        return null;
      }

      return org as unknown as Organisation;
    } catch (error) {
      console.error('Failed to fetch organisation:', error);
      throw error;  // Let React Query handle retry logic
    }
  },

  /**
   * Fetch a single organisation by UUID.
   * OrgAdmin: their own org only. SuperAdmin: any org.
   */
  async getById(id: string): Promise<Organisation> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.BY_ID(id));
    return deepUnwrap(response.data) as Organisation;
  },

  /** SuperAdmin pending queue */
  async getPending(): Promise<Organisation[]> {
    const response = await apiClient.get(ENDPOINTS.ORGANISATIONS.PENDING);
    return unwrapArray(response.data);
  },

  /**
   * Register / create a new organisation.
   * Backend returns { message, organisationId } on success.
   */
  async register(data: CreateOrganisationData): Promise<{ message: string; organisationId: string }> {
    const response = await apiClient.post(ENDPOINTS.ORGANISATIONS.REGISTER, data);
    return (deepUnwrap(response.data) ?? response.data) as { message: string; organisationId: string };
  },

  /**
   * Update an existing organisation.
   */
  async update(id: string, data: UpdateOrganisationData): Promise<Organisation> {
    const response = await apiClient.patch(ENDPOINTS.ORGANISATIONS.BY_ID(id), data);
    return deepUnwrap(response.data) as Organisation;
  },

  /** Delete (SuperAdmin only) */
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ORGANISATIONS.BY_ID(id));
  },

  /** Approve / reject pending org (SuperAdmin only) */
  async approve(
    organisationId: string,
    approvalData: { status: 'approved' | 'rejected'; rejectedReason?: string },
  ): Promise<Organisation> {
    const response = await apiClient.patch(ENDPOINTS.ADMIN.APPROVE_ORG(organisationId), {
      organisationId,
      ...approvalData,
    });
    return deepUnwrap(response.data) as Organisation;
  },
};

export default OrganisationsService;