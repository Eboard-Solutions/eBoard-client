// src/lib/api/members.ts (Example API functions)
export async function fetchMembers(params: { search?: string; role?: string; organizationId?: string }) {
  const query = new URLSearchParams(params as any);
  const res = await fetch(`/api/members?${query}`);
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export async function fetchCommittees(orgId: string) {
  const res = await fetch(`/api/committees?orgId=${orgId}`);
  if (!res.ok) throw new Error('Failed to fetch committees');
  return res.json();
}

export async function createMember(data: CreateUserDto & { organizationId: string }) {
  const res = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create member');
  return res.json();
}

export async function updateMember({ id, ...data }: { id: string } & Partial<CreateUserDto>) {
  const res = await fetch(`/api/members/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update member');
  return res.json();
}

export async function deleteMember(id: string) {
  const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete member');
  return res.json();
}

// fetchOrganizations as before