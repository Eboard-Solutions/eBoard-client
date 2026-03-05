// src/lib/api/members.ts
// CRUD for users table (members are users)

import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';

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
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  title?: string;
  phoneNumber?: string;
  organizationId?: string;
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
export async function fetchMembers(params?: FetchUsersParams): Promise<{ members: User[]; total: number }> {
  try {
    const queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.role) queryParams.role = params.role;
    if (params?.organizationId) queryParams.organizationId = params.organizationId;

    console.log('🔍 Fetching members with params:', queryParams);

    const response = await apiClient.get(ENDPOINTS.USERS.ORGANISATION_USERS, { params: queryParams });
    const data = response.data.data || response.data;

    // Flexible parsing — backend might return different shapes
    const raw = Array.isArray(data) ? data : (data.users || data.members || []);
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
export async function createMember(data: CreateUserDto): Promise<User> {
  try {
    const payload = { ...data };
    if (!payload.organizationId) delete payload.organizationId;

    console.log('📤 Creating user/member:', payload);

    const response = await apiClient.post(ENDPOINTS.USERS.BASE, payload);
    const result = response.data.data || response.data;
    const user = result.user || result;

    return {
      ...user,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  } catch (err: any) {
    console.error('❌ createMember error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to create member');
  }
}

// ── UPDATE MEMBER ─────────────────────────────────────────────────
export async function updateMember(data: UpdateUserDto): Promise<User> {
  const { id, ...updateData } = data;

  try {
    console.log('📤 Updating user/member:', id, updateData);

    const response = await apiClient.patch(ENDPOINTS.USERS.BY_ID(id), updateData);
    const result = response.data.data || response.data;
    const user = result.user || result;

    return {
      ...user,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  } catch (err: any) {
    console.error('❌ updateMember error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to update member');
  }
}

// ── DELETE MEMBER ─────────────────────────────────────────────────
export async function deleteMember(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting user/member:', id);

    await apiClient.delete(ENDPOINTS.USERS.BY_ID(id));

    console.log('✅ Member deleted');
  } catch (err: any) {
    console.error('❌ deleteMember error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to delete member');
  }
}