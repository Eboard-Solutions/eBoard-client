// src/components/layout/AppLayout.tsx
import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { MainSidebar } from './Sidebar';
import { BoardSidebar } from './BoardSidebar';
import { Topbar } from './Topbar';
import { useSidebar } from './SidebarContext';

interface AppLayoutProps {
  children:   ReactNode;
  fullWidth?: boolean;
}

export function AppLayout({ children, fullWidth }: AppLayoutProps) {
  const [location] = useLocation();
  const isBoardRoute = location.startsWith('/board');

  return (
    <div className="min-h-screen bg-background">
      {/* Render the correct sidebar based on route */}
      {isBoardRoute ? <BoardSidebar /> : <MainSidebar />}

      {/* Topbar sits above main content */}
      <Topbar />

      {/* Main content — margin is handled by SidebarOffset */}
      <SidebarOffset>
        <main className="pt-16 min-h-screen">
          <div className={fullWidth ? '' : 'p-6'}>
            {children}
          </div>
        </main>
      </SidebarOffset>
    </div>
  );
}

// ── SidebarOffset ─────────────────────────────────────────────────────────────
// Reads collapsed state from context and applies the correct left margin.
// This replaces the hardcoded pl-16 lg:pl-64 in the old AppLayout.

function SidebarOffset({ children }: { children: ReactNode }) {
  const { collapsed, isMobile, isTablet } = useSidebar();

  const marginLeft = isMobile
    ? 'ml-0'
    : isTablet
    ? 'ml-[68px]'
    : collapsed
    ? 'ml-[68px]'
    : 'ml-64';

  return (
    <div className={`${marginLeft} transition-[margin-left] duration-300 ease-in-out`}>
      {children}
    </div>
  );
}