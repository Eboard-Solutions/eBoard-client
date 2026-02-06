import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

import authService from '@/lib/auth'; // ← using default export (most common & recommended)
import { UserRole } from '@/types';

// ────────────────────────────────────────────────
// Optional: if your authService uses named export, change to:
// import { authService } from '@/lib/auth';
// ────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  const currentUser = authService?.getCurrentUser?.() ?? null;

  // Safe boolean checks with fallback
  const isAuthenticated = !!currentUser;

  // Role/permission check – safe even if method doesn't exist
  let hasRequiredPermission = true;

  if (requiredRole && authService?.hasPermission) {
    hasRequiredPermission = authService.hasPermission(requiredRole);
  } else if (requiredRole && currentUser?.role) {
    // Fallback: direct role comparison if hasPermission is missing
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    hasRequiredPermission = required.includes(currentUser.role as UserRole);
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth/signin', { replace: true });
    } else if (!hasRequiredPermission) {
      setLocation('/unauthorized', { replace: true });
    } else {
      // Only stop showing loader when we know user is allowed
      setIsChecking(false);
    }
  }, [isAuthenticated, hasRequiredPermission, setLocation]);

  // Show loading state while deciding (prevents flash of unauthorized content)
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-lg">
            {isAuthenticated ? 'Verifying access...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    );
  }

  // Only render children when we are sure the user is authenticated & authorized
  if (!isAuthenticated || !hasRequiredPermission) {
    return null; // Should not reach here due to redirect, but safety net
  }

  return <>{children}</>;
}

// If you prefer to use default export in most places:
export default ProtectedRoute;