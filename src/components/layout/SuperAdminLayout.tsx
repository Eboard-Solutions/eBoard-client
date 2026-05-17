// src/components/layout/SuperAdminLayout.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

// Mirror the SA sidebar's collapsed pref so the main content padding tracks
// it live. We re-read on a custom event the sidebar fires when it toggles
// (browser `storage` events don't fire in the same tab).
function useSaCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sa-sidebar-collapsed') === 'true';
  });
  useEffect(() => {
    const sync = () => setCollapsed(localStorage.getItem('sa-sidebar-collapsed') === 'true');
    window.addEventListener('storage', sync);
    window.addEventListener('eboard:sa-sidebar-toggle', sync);
    // Poll once a second as a final safety net; cheap and covers same-tab
    // toggles in the SA sidebar that don't dispatch the event.
    const id = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('eboard:sa-sidebar-toggle', sync);
      window.clearInterval(id);
    };
  }, []);
  return collapsed;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { isMobile, isTablet } = useSidebar();
  const saCollapsed = useSaCollapsed();
  const width = isMobile ? 0 : isTablet ? 68 : saCollapsed ? 68 : 248;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SuperAdminSidebar />
      <main
        className={cn('transition-[padding] duration-300 min-h-screen')}
        style={{ paddingLeft: width }}
      >
        <div className={cn(
          'mx-auto max-w-7xl',
          // Leave room on top for the hamburger on mobile.
          isMobile ? 'pt-16 px-3 pb-6' : 'p-4 sm:p-6',
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
