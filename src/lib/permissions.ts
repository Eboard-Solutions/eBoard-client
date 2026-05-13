// src/lib/permissions.ts
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
  const stripped = lower.replace(/[_\-\s]/g, '');
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
  if (
    err instanceof TypeError ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Network Error')
  )
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
      orgCode:            payload.orgCode ?? null,
      organisationId:     payload.organisationId ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Module-level singleton to prevent duplicate /auth/me calls ───────────────
//
// ROOT CAUSE of 4x /auth/me per page load:
// usePermissions() uses raw useState/useEffect. Every component that calls it
// mounts its own independent effect and fires a separate /auth/me request.
// With Dashboard (3 role-specific sub-components) + Layout, that's 4 mounts.
//
// FIX: Cache the in-flight promise at module level. All hook instances that
// call loadUser() within the same tick share one request. Resolved within
// 30s so a manual refresh() always re-fetches.

let _inflightPromise: Promise<AuthenticatedUser | null> | null = null;
let _inflightResolvedAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

function fetchMeOnce(): Promise<AuthenticatedUser | null> {
  const now = Date.now();

  // Return cached promise if it's still fresh
  if (_inflightPromise && now - _inflightResolvedAt < CACHE_TTL_MS) {
    return _inflightPromise;
  }

  _inflightPromise = (async () => {
    const token = TokenService.getAccessToken();
    if (!token) return null;

    try {
      const response = await apiClient.get<{ data: AuthenticatedUser }>('/auth/me');
      const data = (response.data as Record<string, unknown>).data ?? response.data;
      TokenService.setUser(data as AuthenticatedUser);
      _inflightResolvedAt = Date.now();
      return data as AuthenticatedUser;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        TokenService.clearTokens();
        _inflightPromise = null;
        return null;
      }
      // Network / 5xx — fall back to cache
      _inflightResolvedAt = Date.now();
      return readCachedUser();
    }
  })();

  return _inflightPromise;
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
  // Initialise synchronously from cache so the very first render already
  // knows the role — this eliminates the "all flags false for one frame" bug
  // that caused canManage to be false and showed the wrong screen briefly.
  const cachedInitial = readCachedUser();
  const [user,      setUser]      = useState<AuthenticatedUser | null>(() => cachedInitial);
  // PERF FIX: if we have a cached user, treat as "loaded" immediately and
  // revalidate in the background. Previously isLoading was always `true` on
  // first render, which gated downstream queries (e.g. useMyOrganisation) and
  // forced a sequential /auth/me → /organisations/my-organisation chain.
  const [isLoading, setIsLoading] = useState(!cachedInitial);
  const [error,     setError]     = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  const loadUser = useCallback(async (forceRefresh = false) => {
    const hadCache = !!readCachedUser();
    // Only show the loader when we have nothing to show. Background revalidate
    // for cached users keeps the UI snappy.
    if (!hadCache || forceRefresh) setIsLoading(true);
    setError(null);
    setErrorKind(null);

    const token = TokenService.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Force refresh: bust the module-level cache
    if (forceRefresh) {
      _inflightPromise = null;
      _inflightResolvedAt = 0;
    }

    try {
      const data = await fetchMeOnce();
      setUser(data);
      if (!data) {
        setError('Your session has expired. Please sign in again.');
        setErrorKind('invalid_token');
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const { message, kind } = classifyError(err, status);
      setError(message);
      setErrorKind(kind);
      setUser(readCachedUser());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Expose a refresh that always busts the cache and re-fetches
  const refresh = useCallback(async () => {
    await loadUser(true);
  }, [loadUser]);

  useEffect(() => { void loadUser(); }, [loadUser]);

  const _normalizedRole = useMemo(
    () => normalizeRole(user?.role ?? ''),
    [user?.role],
  );

  const isSuperAdmin = _normalizedRole === SUPER_ADMIN_ROLE;
  const isOrgAdmin   = _normalizedRole === ORG_ADMIN_ROLE;

  const currentorganisationId = useMemo((): string | null => {
    if (!user) return null;
    return user.organisationId ?? user.orgId ?? user.orgCode ?? null;
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
    refresh,
  };
}