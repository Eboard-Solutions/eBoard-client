// src/components/layout/SuperAdminLayout.tsx
import type { ReactNode } from 'react';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { cn } from '@/lib/utils';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SuperAdminSidebar />
      <main className={cn('transition-all duration-300 min-h-screen pl-[248px]')}>
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
