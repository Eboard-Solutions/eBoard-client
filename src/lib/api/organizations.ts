// src/lib/api/organizations.ts
// CRUD operations for organizations table

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

    const res = await fetch('/api/v1/organisations/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
      credentials: 'include',     // changed — better for session auth
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errorMsg = 'Failed to create organization';
      try {
        const errData = await res.json();
        errorMsg = errData.message || errorMsg;
      } catch {}
      throw new Error(`${errorMsg} (HTTP ${res.status})`);
    }

    const result = await res.json();
    console.log('✅ Organization created:', result);

    // Try multiple common shapes
    const org = result.organization || result.organisation || result;
    if (!org?.id) {
      console.warn('Created org response missing id field');
    }

    return org;
  } catch (error) {
    console.error('❌ createOrganization failed:', error);
    throw error instanceof Error ? error : new Error('Failed to create organization');
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────
export async function updateOrganization(data: UpdateOrganizationDto): Promise<Organization> {
  const { id, ...updateData } = data;

  if (!id) throw new Error('Organization ID is required for update');

  try {
    console.log('📤 Updating organization:', id, updateData);

    const res = await fetch(`/api/v1/organisations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      let errorMsg = 'Failed to update organization';
      try {
        const errData = await res.json();
        errorMsg = errData.message || errorMsg;
      } catch {}
      throw new Error(`${errorMsg} (HTTP ${res.status})`);
    }

    const result = await res.json();
    console.log('✅ Organization updated:', result);

    return result.organization || result.organisation || result;
  } catch (error) {
    console.error('❌ updateOrganization failed:', error);
    throw error instanceof Error ? error : new Error('Failed to update organization');
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────
export async function deleteOrganization(id: string): Promise<void> {
  if (!id) throw new Error('Organization ID is required for delete');

  try {
    console.log('🗑️ Deleting organization:', id);

    const res = await fetch(`/api/v1/organisations/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = 'Failed to delete organization';
      try {
        const errData = await res.json();
        errorMsg = errData.message || errorMsg;
      } catch {}
      throw new Error(`${errorMsg} (HTTP ${res.status})`);
    }

    console.log('✅ Organization deleted');
  } catch (error) {
    console.error('❌ deleteOrganization failed:', error);
    throw error instanceof Error ? error : new Error('Failed to delete organization');
  }
}

// ── FETCH ALL (only for SuperAdmin) ───────────────────────────────────────
export async function fetchOrganizations(): Promise<Organization[]> {
  try {
    console.log('🔍 Fetching all organizations (super-admin only?)');

    const res = await fetch('/api/v1/organisations', {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`fetchOrganizations: ${res.status} → returning empty array`);
      if (res.status === 403) {
        console.warn('403 Forbidden → likely not SuperAdmin');
      }
      return [];
    }

    const data = await res.json();
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
  } catch (error) {
    console.error('❌ fetchOrganizations failed:', error);
    return [];
  }
}

// ── NEW: Fetch single organization by ID (for OrgAdmin "my organization") ──
export async function fetchMyOrganization(orgId: string): Promise<Organization | null> {
  if (!orgId) {
    console.warn('fetchMyOrganization called without orgId');
    return null;
  }

  try {
    console.log('🔍 Fetching my organization:', orgId);

    const res = await fetch(`/api/v1/organisations/${orgId}`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`fetchMyOrganization: ${res.status}`);
      return null;
    }

    const data = await res.json();
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