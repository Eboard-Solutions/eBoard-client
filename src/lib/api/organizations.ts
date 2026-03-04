// src/lib/api/organizations.ts
// CRUD operations for organizations table

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';

export interface Organization {
  id: string;
  organisationName: string;
  OrgEmail?: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  logoUrl?: string;
  status?: string;           // e.g. "active", "pending"
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganizationDto {
  organisationName: string;
  OrgEmail: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {
  id: string;
}

// ── CREATE ────────────────────────────────────────────────────────────────
export async function createOrganization(data: CreateOrganizationDto): Promise<Organization> {
  try {
    console.log('📤 Creating organization:', data);

    const response = await apiClient.post('/organisations/register', data);
    const result = response.data.data || response.data;
    
    console.log('✅ Organization created:', result);

    // Try multiple common shapes
    const org = result.organization || result.organisation || result;
    if (!org?.id) {
      console.warn('Created org response missing id field');
    }

    return org;
  } catch (error: any) {
    console.error('❌ createOrganization failed:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to create organization');
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────
export async function updateOrganization(data: UpdateOrganizationDto): Promise<Organization> {
  const { id, ...updateData } = data;

  if (!id) throw new Error('Organization ID is required for update');

  try {
    console.log('📤 Updating organization:', id, updateData);

    const response = await apiClient.patch(`/organisations/${id}`, updateData);
    const result = response.data.data || response.data;
    
    console.log('✅ Organization updated:', result);

    return result.organization || result.organisation || result;
  } catch (error: any) {
    console.error('❌ updateOrganization failed:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to update organization');
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────
export async function deleteOrganization(id: string): Promise<void> {
  if (!id) throw new Error('Organization ID is required for delete');

  try {
    console.log('🗑️ Deleting organization:', id);

    await apiClient.delete(`/organisations/${id}`);

    console.log('✅ Organization deleted');
  } catch (error: any) {
    console.error('❌ deleteOrganization failed:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete organization');
  }
}

// ── FETCH ALL (only for SuperAdmin) ───────────────────────────────────────
export async function fetchOrganizations(): Promise<Organization[]> {
  try {
    console.log('🔍 Fetching all organizations (super-admin only?)');

    const response = await apiClient.get('/organisations');
    const data = response.data.data || response.data;
    
    const list = Array.isArray(data) ? data : data.organisations || data.organizations || data.results || [];

    return list.map((org: any) => ({
      id: org.id,
      organisationName: org.organisationName || org.name || 'Unnamed',
      OrgEmail: org.OrgEmail || org.email,
      description: org.description,
      address: org.address,
      phoneNumber: org.phoneNumber,
      websiteUrl: org.websiteUrl,
      logoUrl: org.logoUrl,
      status: org.status,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));
  } catch (error: any) {
    console.error('❌ fetchOrganizations failed:', error);
    if (error.response?.status === 403) {
      console.warn('403 Forbidden → likely not SuperAdmin');
    }
    return [];
  }
}

// ── Fetch single organization by ID (for OrgAdmin "my organization") ──
export async function fetchMyOrganization(orgId: string): Promise<Organization | null> {
  if (!orgId) {
    console.warn('fetchMyOrganization called without orgId');
    return null;
  }

  try {
    console.log('🔍 Fetching my organization:', orgId);

    const response = await apiClient.get(`/organisations/${orgId}`);
    const data = response.data.data || response.data;
    const org = data.organization || data.organisation || data;

    if (!org?.id) return null;

    return {
      id: org.id,
      organisationName: org.organisationName || org.name || 'Unnamed',
      OrgEmail: org.OrgEmail || org.email,
      description: org.description,
      address: org.address,
      phoneNumber: org.phoneNumber,
      websiteUrl: org.websiteUrl,
      logoUrl: org.logoUrl,
      status: org.status,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  } catch (error) {
    console.error('❌ fetchMyOrganization failed:', error);
    return null;
  }
}