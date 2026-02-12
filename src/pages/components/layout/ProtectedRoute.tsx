// src/components/layout/ProtectedRoute.tsx
import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import authService from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[]; // Optional role restriction
  requireAuth?: boolean;   // Default: true
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireAuth = true 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Check authentication
    if (requireAuth && !authService.isAuthenticated()) {
      console.warn('🚫 Not authenticated - redirecting to signin');
      setLocation('/auth/signin');
      return;
    }

    // Check role authorization if specified
    if (allowedRoles && allowedRoles.length > 0) {
      const user = authService.getUser();
      
      if (!user) {
        console.warn('🚫 No user data - redirecting to signin');
        setLocation('/auth/signin');
        return;
      }

      const userRole = user.role.toLowerCase();
      const hasPermission = allowedRoles.some(role => 
        userRole.includes(role.toLowerCase())
      );

      if (!hasPermission) {
        console.warn(`🚫 Unauthorized role: ${user.role} - redirecting`);
        
        // Redirect to appropriate dashboard based on actual role
        if (userRole.includes('superadmin')) {
          setLocation('/super-admin');
        } else if (userRole.includes('orgadmin')) {
          setLocation('/dashboard');
        } else if (userRole.includes('boardmember')) {
          setLocation('/dashboard/board-member');
        } else {
          // Unknown role - redirect to unauthorized page
          setLocation('/unauthorized');
        }
        return;
      }
    }
  }, [requireAuth, allowedRoles, setLocation]);

  // Only render if authenticated (and authorized if roles specified)
  if (!authService.isAuthenticated()) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const user = authService.getUser();
    if (!user) return null;

    const userRole = user.role.toLowerCase();
    const hasPermission = allowedRoles.some(role => 
      userRole.includes(role.toLowerCase())
    );

    if (!hasPermission) return null;
  }

  return <>{children}</>;
}