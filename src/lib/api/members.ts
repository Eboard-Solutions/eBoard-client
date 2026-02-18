// src/lib/api/members.ts
// CRUD for users table (members are users)

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;           // computed if missing
  email: string;
  role: string;            // e.g. "OrgAdmin", "Admin"
  title?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  organizationId?: string;
  // committees removed — no endpoint exists
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  title?: string;
  phoneNumber?: string;
  // profilePictureUrl?: string;   // optional — add if needed
  organizationId?: string;         // optional — backend may assign
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  id: string;
}

export interface FetchUsersParams {
  search?: string;
  role?: string;
  organizationId?: string | null;
}

// ── LIST USERS (MEMBERS) ──────────────────────────────────────────
// From logs: most likely /api/v1/user/organisation-users or /api/v1/user
export async function fetchMembers(params?: FetchUsersParams): Promise<{ members: User[]; total: number }> {
  try {
    // Try this first — matches one of your logged routes
    let url = '/api/v1/user';

    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.organizationId && params.organizationId !== null) {
      query.set('organizationId', params.organizationId);
    }

    if (query.toString()) url += `?${query}`;

    console.log('🔍 Fetching members:', url);

    const res = await fetch(url, {
      credentials: 'omit',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`fetchMembers: ${res.status} → empty list`);
      return { members: [], total: 0 };
    }

    const data = await res.json();

    // Flexible parsing — backend might return users, members, or array
    const raw = data.users || data.members || data || [];
    const members = raw.map((u: any) => ({
      ...u,
      name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    }));

    return {
      members,
      total: data.total || members.length,
    };
  } catch (err) {
    console.error('❌ fetchMembers error:', err);
    return { members: [], total: 0 };
  }
}

// ── CREATE MEMBER ─────────────────────────────────────────────────
// POST /api/v1/user
export async function createMember(data: CreateUserDto): Promise<User> {
  try {
    const payload = { ...data };
    if (!payload.organizationId) delete payload.organizationId;

    console.log('📤 Creating user/member:', payload);

    const res = await fetch('/api/v1/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Failed to create member' }));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const user = result.user || result;

    return {
      ...user,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  } catch (err) {
    console.error('❌ createMember error:', err);
    throw err instanceof Error ? err : new Error('Failed to create member');
  }
}

// ── UPDATE MEMBER ─────────────────────────────────────────────────
// PATCH /api/v1/user/:id
export async function updateMember(data: UpdateUserDto): Promise<User> {
  const { id, ...updateData } = data;

  try {
    console.log('📤 Updating user/member:', id, updateData);

    const res = await fetch(`/api/v1/user/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Failed to update member' }));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const user = result.user || result;

    return {
      ...user,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  } catch (err) {
    console.error('❌ updateMember error:', err);
    throw err instanceof Error ? err : new Error('Failed to update member');
  }
}

// ── DELETE MEMBER ─────────────────────────────────────────────────
// DELETE /api/v1/user/:id
export async function deleteMember(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting user/member:', id);

    const res = await fetch(`/api/v1/user/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        Accept: 'application/json',
      },
      credentials: 'omit',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Failed to delete member' }));
      throw new Error(errData.message || `HTTP ${res.status}`);
    }

    console.log('✅ Member deleted');
  } catch (err) {
    console.error('❌ deleteMember error:', err);
    throw err instanceof Error ? err : new Error('Failed to delete member');
  }
}