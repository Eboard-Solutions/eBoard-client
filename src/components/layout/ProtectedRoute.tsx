// src/components/layout/ProtectedRoute.tsx
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { authService } from '@/api/services';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  const isAuth = authService.isAuthenticated();
  const user = authService.getUser();

  // Compute auth state synchronously
  const authState = useMemo(() => {
    if (!isAuth) {
      return { valid: false, redirect: '/auth/signin' };
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!user) {
        return { valid: false, redirect: '/auth/signin' };
      }

      const userRole = user.role?.toLowerCase() || '';
      const hasPermission = allowedRoles.some(
        (role) => userRole === role.toLowerCase()
      );

      if (!hasPermission) {
        return { valid: false, redirect: '/unauthorized' };
      }
    }

    return { valid: true, redirect: null };
  }, [isAuth, user, allowedRoles]);

  // Handle redirect in effect
  useEffect(() => {
    if (!authState.valid && authState.redirect) {
      setLocation(authState.redirect);
    }
  }, [authState, setLocation]);

  // Block rendering until auth check passes
  if (!authState.valid) {
    return null;
  }

  return <>{children}</>;
}