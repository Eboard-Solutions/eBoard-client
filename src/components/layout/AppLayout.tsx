import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      
      <main className="pt-16 pl-16 lg:pl-64 transition-all duration-300 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}