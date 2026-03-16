import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/api/client';
import { TokenService } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hasOrganisation: boolean;
  organisationStatus: string | null;
  orgCode: string | null;
  organisationId?: string | null;
  orgId?: string | null;
}

export type Permission =
  | 'members:view:any'
  | 'members:view:own'
  | 'members:invite'
  | 'members:update'
  | 'members:delete'
  | 'members:change_org'
  | 'members:assign:super-admin'
  | 'orgs:view:list'
  | 'org:manage';

export type ErrorKind =
  | 'unreachable'
  | 'invalid_token'
  | 'insufficient_role'
  | 'server_error'
  | 'unknown'
  | null;

// ─── Role normalisation ────────────────────────────────────────────────────────

const ROLE_ALIAS_MAP: Record<string, string> = {
  // Super Admin
  'super-admin': 'super-admin', superadmin:   'super-admin',
  super_admin:   'super-admin', superAdmin:   'super-admin',
  SuperAdmin:    'super-admin', SUPER_ADMIN:  'super-admin',
  'super admin': 'super-admin',

  // Org Admin
  'org-admin':          'org-admin', orgadmin:   'org-admin',
  org_admin:            'org-admin', orgAdmin:   'org-admin',
  OrgAdmin:             'org-admin', ORG_ADMIN:  'org-admin',
  'organization-admin': 'org-admin', 'org admin':'org-admin',

  // Board Member
  boardmember:    'board-member', 'board-member': 'board-member',
  BoardMember:    'board-member', BOARD_MEMBER:   'board-member',
  board_member:   'board-member', 'board member': 'board-member',

  // User
  user: 'user', User: 'user', USER: 'user',

  // Admin
  admin: 'admin', Admin: 'admin', ADMIN: 'admin',
};

function normalizeRole(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (ROLE_ALIAS_MAP[trimmed]) return ROLE_ALIAS_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  if (ROLE_ALIAS_MAP[lower]) return ROLE_ALIAS_MAP[lower];
  const stripped = lower.replace(/[_-\s]/g, '');
  if (ROLE_ALIAS_MAP[stripped]) return ROLE_ALIAS_MAP[stripped];
  return lower;
}

// ─── Permission matrix ────────────────────────────────────────────────────────

const SUPER_ADMIN_ROLE = 'super-admin';
const ORG_ADMIN_ROLE   = 'org-admin';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [SUPER_ADMIN_ROLE]: [
    'members:view:any', 'members:view:own', 'members:invite',
    'members:update',   'members:delete',   'members:change_org',
    'members:assign:super-admin', 'orgs:view:list', 'org:manage',
  ],
  [ORG_ADMIN_ROLE]: [
    'members:view:own', 'members:invite', 'members:update',
    'members:delete',   'org:manage',
  ],
  'board-member': ['members:view:own'],
  'user':         ['members:view:own'],
  'admin':        ['members:view:own', 'members:update'],
};

// ─── Error classifier ─────────────────────────────────────────────────────────

function classifyError(err: unknown, status?: number): { message: string; kind: ErrorKind } {
  if (status === 401)
    return { message: 'Your session has expired. Please sign in again.', kind: 'invalid_token' };
  if (status === 403)
    return { message: 'You do not have permission to access this resource.', kind: 'insufficient_role' };
  if (status !== undefined && status >= 500)
    return { message: 'The server is temporarily unavailable. Using cached session.', kind: 'server_error' };
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (err instanceof TypeError || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network Error'))
    return { message: 'Cannot reach the server. Check your connection.', kind: 'unreachable' };
  return { message: msg || 'Authentication check failed.', kind: 'unknown' };
}

// ─── Cache reader ─────────────────────────────────────────────────────────────

function readCachedUser(): AuthenticatedUser | null {
  try {
    // Primary: user object stored in localStorage on login
    const stored = TokenService.getUser<AuthenticatedUser>();
    if (stored && typeof stored.role === 'string' && stored.role) {
      return stored;
    }

    // Fallback: decode the JWT payload
    const token = TokenService.getAccessToken();
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const b64    = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length % 4) || 4);
    const payload = JSON.parse(atob(padded));

    if (!payload?.sub) return null;

    return {
      userId:             String(payload.sub),
      email:              String(payload.email ?? ''),
      firstName:          String(payload.firstName ?? ''),
      lastName:           String(payload.lastName ?? ''),
      role:               String(payload.role ?? ''),
      hasOrganisation:    Boolean(payload.hasOrganisation ?? false),
      organisationStatus: payload.organisationStatus ?? null,
      orgCode:            payload.orgCode ?? payload.organisationId ?? null,
      organisationId:     payload.organisationId ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePermissionsResult {
  can:                    (perm: Permission) => boolean;
  isSuperAdmin:           boolean;
  isOrgAdmin:             boolean;
  normalizedRole:         string;
  currentorganisationId:  string | null;
  user:                   AuthenticatedUser | null;
  isLoading:              boolean;
  authError:              string | null;
  authErrorKind:          ErrorKind;
  refresh:                () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
  const [user,      setUser]      = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorKind(null);

    // Not logged in
    const token = TokenService.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let status: number | undefined;

    try {
      // KEY FIX: use apiClient (Axios) instead of raw fetch.
      // Raw fetch('/api/v1/auth/me') is a RELATIVE URL that hits the Vite
      // dev server (localhost:3001), not the backend (localhost:3000).
      // apiClient uses API_CONFIG.BASE_URL which resolves to VITE_API_URL
      // (localhost:3000) and automatically attaches the Bearer token via
      // the request interceptor.
      const response = await apiClient.get<{ data: AuthenticatedUser }>('/auth/me');
      const data = response.data.data ?? response.data;
      setUser(data as AuthenticatedUser);
      // Keep localStorage in sync with fresh data
      TokenService.setUser(data);
      setError(null);
      setErrorKind(null);

    } catch (err: any) {
      status = err?.response?.status;

      if (status === 401 || status === 403) {
        // Genuine auth failure — apiClient interceptor already handles
        // token refresh for 401. If we still get here, the session is dead.
        TokenService.clearTokens();
        const { message, kind } = classifyError(err, status);
        setUser(null);
        setError(message);
        setErrorKind(kind);
        setIsLoading(false);
        return;
      }

      // 5xx or network error — fall back to cached user so UI keeps working
      const { message, kind } = classifyError(err, status);
      const cached = readCachedUser();
      setUser(cached);
      setError(message);
      setErrorKind(kind);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadUser(); }, [loadUser]);

  const _normalizedRole = useMemo(
    () => normalizeRole(user?.role ?? ''),
    [user?.role],
  );

  const isSuperAdmin = _normalizedRole === SUPER_ADMIN_ROLE;
  const isOrgAdmin   = _normalizedRole === ORG_ADMIN_ROLE;

  const currentorganisationId = useMemo((): string | null => {
    if (!user) return null;
    return user.orgCode ?? user.organisationId ?? user.orgId ?? null;
  }, [user]);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      const allowed = ROLE_PERMISSIONS[_normalizedRole];
      if (!allowed) return false;
      return allowed.includes(permission);
    },
    [user, _normalizedRole],
  );

  return {
    can,
    isSuperAdmin,
    isOrgAdmin,
    normalizedRole:        _normalizedRole,
    currentorganisationId,
    user,
    isLoading,
    authError:             error,
    authErrorKind:         errorKind,
    refresh:               loadUser,
  };
}