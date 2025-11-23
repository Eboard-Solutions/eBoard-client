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
  const isAuthenticated = authService.isUserAuthenticated();
  const hasRequiredPermission = requiredRole 
    ? authService.hasPermission(requiredRole)
    : true;

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth/signin');
    } else if (!hasRequiredPermission) {
      setLocation('/unauthorized');
    }
  }, [isAuthenticated, hasRequiredPermission, setLocation]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!hasRequiredPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}