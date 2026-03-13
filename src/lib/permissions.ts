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
  | 'org:manage';           // ← was missing; caused console spam

// ---------------------------------------------------------------------------
// Role normalization
// ---------------------------------------------------------------------------
// Centralise all known role strings → canonical internal key.
// Backend may send "super-admin", "SuperAdmin", "superadmin" etc.
// We normalise to lowercase-hyphenated before comparing.

const ROLE_ALIAS_MAP: Record<string, string> = {
  // super-admin variants
  'super-admin':  'super-admin',
  'superadmin':   'super-admin',
  'super_admin':  'super-admin',
  'superAdmin':   'super-admin',   // camelCase leaks
  'SuperAdmin':   'super-admin',

  // org-admin variants
  'org-admin':         'org-admin',
  'orgadmin':          'org-admin',
  'org_admin':         'org-admin',
  'orgAdmin':          'org-admin',
  'OrgAdmin':          'org-admin',
  'organization-admin':'org-admin',
  'admin':             'org-admin',  // treat bare "admin" as org-admin

  // board / member
  'boardmember':  'board-member',
  'board-member': 'board-member',
  'BoardMember':  'board-member',

  // plain user
  'user':  'user',
  'User':  'user',
};

function normalizeRole(raw: string): string {
  const trimmed = (raw ?? '').trim();
  // Exact-match lookup first
  if (ROLE_ALIAS_MAP[trimmed]) return ROLE_ALIAS_MAP[trimmed];
  // Lowercase fallback
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
  'board-member': [
    'members:view:own',
  ],
  'user': [
    'members:view:own',
  ],
};

// ---------------------------------------------------------------------------
// Hook result shape
// ---------------------------------------------------------------------------

interface UsePermissionsResult {
  can: (perm: Permission) => boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  currentorganisationId: string | null;
  user: AuthenticatedUser | null;
  isLoading: boolean;
  authError: string | null;
  authErrorKind: 'unreachable' | 'invalid_token' | 'insufficient_role' | 'unknown' | null;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Classify fetch errors into human-readable kinds
// ---------------------------------------------------------------------------

type ErrorKind = UsePermissionsResult['authErrorKind'];

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
        if (status === 401 || status === 403) {
          authService.logout();
        }
        let serverMessage: string | undefined;
        try {
          const errData = await response.json();
          serverMessage = errData?.message;
        } catch {
          // ignore JSON parse failure
        }
        const { message, kind } = classifyError(
          new Error(serverMessage ?? `HTTP ${status}`),
          status,
        );
        setError(message);
        setErrorKind(kind);
        setUser(null);
        return;
      }

      const data = (await response.json()) as AuthenticatedUser;
      setUser(data);
      setError(null);
      setErrorKind(null);
    } catch (err: unknown) {
      console.error('[usePermissions] Failed to load user:', err);
      const { message, kind } = classifyError(err, status);
      setError(message);
      setErrorKind(kind);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // Derive normalised role once
  const normalizedRole = useMemo(
    () => normalizeRole(user?.role ?? ''),
    [user?.role],
  );

  const isSuperAdmin = normalizedRole === SUPER_ADMIN_ROLE;
  const isOrgAdmin   = normalizedRole === ORG_ADMIN_ROLE;

  const currentorganisationId = user?.orgCode ?? null;

  const can = useCallback(
    (permission: Permission): boolean => {
      if (isLoading || !user) return false;

      const allowed = ROLE_PERMISSIONS[normalizedRole];
      if (!allowed) {
        // Unknown role → deny but don't spam the console for known app permissions
        return false;
      }
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