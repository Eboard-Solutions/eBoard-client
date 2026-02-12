import { authService } from '@/lib/auth';

export type Permission =
  | 'members:view:any'            // super admin only — cross org
  | 'members:view:own'            // view members in own org
  | 'members:invite'              // invite/create in own org
  | 'members:update'
  | 'members:delete'
  | 'members:change_org'          // reassign to another org
  | 'members:assign:super-admin'  // promote to global super admin
  | 'orgs:view:list';             // list all organizations

export function usePermissions() {
  const { user, isLoading, error } = authService.useUser?.() || authService; // adjust depending on your authService shape

  const isSuperAdmin = user?.role?.toLowerCase() === 'super-admin';

  // Be generous with org admin role names — normalize
  const normalizedRole = (user?.role || '').trim().toLowerCase();
  const possibleOrgAdminRoles = [
    'orgadmin',
    'org-admin',
    'organizationadmin',
    'organization-admin',
    'admin',
    'owner',
    'administrator',
  ];

  const isOrgAdmin = !!user?.organizationId && possibleOrgAdminRoles.includes(normalizedRole);

  const can = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    if (!user || isLoading || error) return false;

    switch (permission) {
      case 'members:view:any':
      case 'members:change_org':
      case 'members:assign:super-admin':
      case 'orgs:view:list':
        return false; // super admin only

      case 'members:view:own':
      case 'members:invite':
      case 'members:update':
      case 'members:delete':
        return isOrgAdmin;

      default:
        return false;
    }
  };

  return {
    can,
    isSuperAdmin,
    isOrgAdmin,
    currentOrgId: user?.organizationId ?? null,
    isLoading,
    authError: error,
  };
}