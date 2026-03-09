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
  | 'orgs:view:list';

const SUPER_ADMIN_ROLES = ['super-admin', 'superadmin', 'superadmin'] as const;
const ORG_ADMIN_ROLES = [
  'org-admin',
  'organization-admin',
  'admin',
  'orgadmin',  // Matches "OrgAdmin" after normalization
  'org-admin', // Additional variants for backend flexibility
] as const;

interface UsePermissionsResult {
  can: (perm: Permission) => boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  currentorganisationId: string | null;
  user: AuthenticatedUser | null;
  isLoading: boolean;
  authError: string | null;
  refresh: () => Promise<void>;
}

export function usePermissions(): UsePermissionsResult {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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

    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'omit',  // Avoid CORS issues; use Bearer token only
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          authService.logout();
          setError('Session expired. Please sign in again.');
          setUser(null);
          return;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as AuthenticatedUser;
      setUser(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load user:', err);
      const msg = err.message || 'Failed to verify authentication';
      setError(msg.includes('fetch') ? 'Cannot reach backend — is it running?' : msg);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const normalizedRole = useMemo(
    () => (user?.role ?? '').trim().toLowerCase(),
    [user?.role]
  );

  const isSuperAdmin = useMemo(
    () => SUPER_ADMIN_ROLES.some(r => normalizedRole === r),
    [normalizedRole]
  );

  // Ignore hasOrganisation for dev; focus on role
  const isOrgAdmin = useMemo(
    () => ORG_ADMIN_ROLES.some(r => normalizedRole === r),
    [normalizedRole]
  );

  // Fallback to null (not a dummy string) to avoid sending invalid organisationId to backend
  const currentorganisationId = user?.orgCode ?? null;

  const can = useCallback((permission: Permission): boolean => {
    if (isLoading || !user) return false;
    if (isSuperAdmin) return true;

    const orgAdminPerms: Permission[] = [
      'members:view:own',
      'members:invite',
      'members:update',
      'members:delete',
    ];

    if (orgAdminPerms.includes(permission)) {
      return isOrgAdmin;
    }

    // Super-admin only
    if ([
      'members:view:any',
      'members:change_org',
      'members:assign:super-admin',
      'orgs:view:list',
    ].includes(permission)) {
      return false;
    }

    console.warn(`Permission not defined: ${permission}`);
    return false;
  }, [isLoading, user, isSuperAdmin, isOrgAdmin]);

  return {
    can,
    isSuperAdmin,
    isOrgAdmin,
    currentorganisationId,
    user,
    isLoading,
    authError: error,
    refresh: loadUser,
  };
}