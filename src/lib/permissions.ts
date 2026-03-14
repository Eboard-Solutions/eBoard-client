import { useState, useEffect, useCallback, useMemo } from 'react';
import authService from './auth';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hasOrganisation: boolean;
  organisationStatus: string | null;
  orgCode: string | null;
  // Some backends also return these field names — accept both
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

// ---------------------------------------------------------------------------
// Role normalization
// ---------------------------------------------------------------------------

const ROLE_ALIAS_MAP: Record<string, string> = {
  'super-admin':        'super-admin',
  'superadmin':         'super-admin',
  'super_admin':        'super-admin',
  'superAdmin':         'super-admin',
  'SuperAdmin':         'super-admin',

  'org-admin':          'org-admin',
  'orgadmin':           'org-admin',
  'org_admin':          'org-admin',
  'orgAdmin':           'org-admin',
  'OrgAdmin':           'org-admin',
  'organization-admin': 'org-admin',
  // NOTE: bare 'admin' intentionally NOT mapped to org-admin here
  // to avoid false positives — use explicit OrgAdmin from backend

  'boardmember':        'board-member',
  'board-member':       'board-member',
  'BoardMember':        'board-member',

  'user':               'user',
  'User':               'user',
};

function normalizeRole(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (ROLE_ALIAS_MAP[trimmed]) return ROLE_ALIAS_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  return ROLE_ALIAS_MAP[lower] ?? lower;
}

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

const SUPER_ADMIN_ROLE = 'super-admin';
const ORG_ADMIN_ROLE   = 'org-admin';

type PermissionMap = Record<string, Permission[]>;

const ROLE_PERMISSIONS: PermissionMap = {
  [SUPER_ADMIN_ROLE]: [
    'members:view:any',
    'members:view:own',
    'members:invite',
    'members:update',
    'members:delete',
    'members:change_org',
    'members:assign:super-admin',
    'orgs:view:list',
    'org:manage',
  ],
  [ORG_ADMIN_ROLE]: [
    'members:view:own',
    'members:invite',
    'members:update',
    'members:delete',
    'org:manage',
  ],
  'board-member': ['members:view:own'],
  'user':         ['members:view:own'],
};

// ---------------------------------------------------------------------------
// Hook result
// ---------------------------------------------------------------------------

interface UsePermissionsResult {
  can: (perm: Permission) => boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  currentorganisationId: string | null;
  user: AuthenticatedUser | null;
  isLoading: boolean;
  authError: string | null;
  authErrorKind: 'unreachable' | 'invalid_token' | 'insufficient_role' | 'server_error' | 'unknown' | null;
  refresh: () => Promise<void>;
}

type ErrorKind = UsePermissionsResult['authErrorKind'];

// ---------------------------------------------------------------------------
// Error classifier
// ---------------------------------------------------------------------------

function classifyError(err: unknown, status?: number): { message: string; kind: ErrorKind } {
  if (status === 401) {
    return {
      message: 'Your session token is invalid or has expired. Please sign in again.',
      kind: 'invalid_token',
    };
  }
  if (status === 403) {
    return {
      message: 'Your account does not have permission to access this resource.',
      kind: 'insufficient_role',
    };
  }
  // ── FIX: 500 is a server crash — do NOT log the user out.
  // Show a soft warning and fall back to cached token data so the
  // app stays functional even when /auth/me is temporarily broken.
  if (status !== undefined && status >= 500) {
    return {
      message: 'The server encountered an error. Some features may be limited.',
      kind: 'server_error',
    };
  }
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return {
      message: 'Cannot reach the backend server. Check that it is running and accessible.',
      kind: 'unreachable',
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('Connection terminated') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('NetworkError') ||
    msg.includes('Failed to fetch')
  ) {
    return {
      message: 'Backend is unreachable or crashed. Check server logs for database/connection errors.',
      kind: 'unreachable',
    };
  }
  return {
    message: msg || 'Failed to verify authentication.',
    kind: 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Build a best-effort AuthenticatedUser from the cached token payload
// so the app stays functional when /auth/me returns 500.
// ---------------------------------------------------------------------------

function buildUserFromCache(): AuthenticatedUser | null {
  try {
    const cached = authService.getUser?.();
    if (cached) return cached as AuthenticatedUser;

    // Fallback: decode JWT payload if getUser isn't available
    const token = authService.getToken?.();
    if (!token) return null;
    const parts   = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      userId:             payload.sub ?? payload.userId ?? '',
      email:              payload.email ?? '',
      firstName:          payload.firstName ?? '',
      lastName:           payload.lastName ?? '',
      role:               payload.role ?? '',
      hasOrganisation:    payload.hasOrganisation ?? false,
      organisationStatus: payload.organisationStatus ?? null,
      orgCode:            payload.orgCode ?? payload.organisationId ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePermissions(): UsePermissionsResult {
  const [user, setUser]           = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorKind(null);

    if (!authService.isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const token = authService.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let status: number | undefined;

    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      status = response.status;

      if (!response.ok) {
        // ── FIX: only log out on auth failures (401/403), NOT on server errors (5xx).
        // A 500 means the backend crashed — the user's token is still valid.
        if (status === 401 || status === 403) {
          authService.logout();
          let serverMessage: string | undefined;
          try { const e = await response.json(); serverMessage = e?.message; } catch { /* ignore */ }
          const { message, kind } = classifyError(new Error(serverMessage ?? `HTTP ${status}`), status);
          setError(message);
          setErrorKind(kind);
          setUser(null);
          return;
        }

        // 5xx or other unexpected status — use cached user so app still works
        const { message, kind } = classifyError(new Error(`HTTP ${status}`), status);
        const cached = buildUserFromCache();
        if (cached) {
          // We have cached data — set user so permissions work, but surface a soft warning
          setUser(cached);
          setError(message);
          setErrorKind(kind);
        } else {
          setUser(null);
          setError(message);
          setErrorKind(kind);
        }
        return;
      }

      const data = (await response.json()) as AuthenticatedUser;
      setUser(data);
      setError(null);
      setErrorKind(null);
    } catch (err: unknown) {
      console.error('[usePermissions] Failed to load user:', err);
      const { message, kind } = classifyError(err, status);
      // Network error — try to stay functional with cached data
      const cached = buildUserFromCache();
      if (cached) {
        setUser(cached);
      } else {
        setUser(null);
      }
      setError(message);
      setErrorKind(kind);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const normalizedRole = useMemo(
    () => normalizeRole(user?.role ?? ''),
    [user?.role],
  );

  const isSuperAdmin = normalizedRole === SUPER_ADMIN_ROLE;
  const isOrgAdmin   = normalizedRole === ORG_ADMIN_ROLE;

  // ── FIX: accept multiple field names the backend might return for the org ID
  const currentorganisationId = useMemo(() => {
    if (!user) return null;
    return (
      user.orgCode         ??
      user.organisationId  ??
      user.orgId           ??
      null
    );
  }, [user]);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (isLoading || !user) return false;
      const allowed = ROLE_PERMISSIONS[normalizedRole];
      if (!allowed) return false;
      return allowed.includes(permission);
    },
    [isLoading, user, normalizedRole],
  );

  return {
    can,
    isSuperAdmin,
    isOrgAdmin,
    currentorganisationId,
    user,
    isLoading,
    authError: error,
    authErrorKind: errorKind,
    refresh: loadUser,
  };
}