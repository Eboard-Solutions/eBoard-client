// src/components/layout/SidebarContext.tsx
/* eslint-disable react-refresh/only-export-components */
// Shared context consumed by AppLayout (for margin offset) and both sidebars.

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SidebarCtx {
  collapsed:    boolean;
  mobileOpen:   boolean;
  isMobile:     boolean;
  isTablet:     boolean;
  isDesktop:    boolean;
  setCollapsed: (v: boolean) => void;
  toggleMobile: () => void;
}

export const SidebarContext = createContext<SidebarCtx>({
  collapsed: false, mobileOpen: false,
  isMobile: false, isTablet: false, isDesktop: true,
  setCollapsed: () => {}, toggleMobile: () => {},
});

export function useSidebar() { return useContext(SidebarContext); }

// ── Provider ──────────────────────────────────────────────────────────────────

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  useEffect(() => {
    let raf: number;
    const handler = () => { raf = requestAnimationFrame(() => setWidth(window.innerWidth)); };
    window.addEventListener('resize', handler, { passive: true });
    return () => { window.removeEventListener('resize', handler); cancelAnimationFrame(raf); };
  }, []);

  const isMobile  = width < 768;
  const isTablet  = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  }, []);

  const toggleMobile = useCallback(() => setMobileOpen(o => !o), []);

  return (
    <SidebarContext.Provider value={{
      collapsed, mobileOpen, isMobile, isTablet, isDesktop,
      setCollapsed, toggleMobile,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}