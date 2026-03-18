// src/components/layout/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { TokenService } from '@/api/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[]; // ✅ renamed to match App.tsx
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    const token = TokenService.getAccessToken();
    const user = TokenService.getUser<{ role: string }>();

    if (!token) {
      setLocation('/auth/signin');
      setStatus('denied');
      return;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!user) {
        setLocation('/auth/signin');
        setStatus('denied');
        return;
      }
      const userRole = user.role?.toLowerCase().replace(/[_\s-]/g, '') ?? '';
      const hasPermission = requiredRoles.some(
        (r) => userRole === r.toLowerCase().replace(/[_\s-]/g, '')
      );
      if (!hasPermission) {
        setLocation('/unauthorized');
        setStatus('denied');
        return;
      }
    }

    setStatus('allowed');
  }, []); // runs once on mount after localStorage is populated

  if (status === 'checking') return null;
  if (status === 'denied')   return null;
  return <>{children}</>;
}