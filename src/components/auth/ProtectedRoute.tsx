import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { authService } from '@/lib/auth';
import { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  const isAuthenticated = authService.isAuthenticated?.() ?? false;
  const hasRequiredPermission = requiredRole
    ? authService.hasPermission?.(requiredRole) ?? false
    : true;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth/signin', { replace: true });
    } else if (!hasRequiredPermission) {
      setLocation('/unauthorized', { replace: true });
    }
  }, [isAuthenticated, hasRequiredPermission, setLocation]);

  if (!isAuthenticated || !hasRequiredPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {!isAuthenticated ? 'Authenticating...' : 'Checking access...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// If you prefer default export instead, use this instead of the line above:
export default ProtectedRoute;