// src/components/layout/Sidebar.tsx
// OrgAdmin / Admin sidebar — uses real backend badge counts.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Calendar, Users, FileText,
  CheckSquare, Vote, Settings, ChevronLeft, ChevronRight,
  Bell, BarChart3, HelpCircle, LogOut, Building2,
  ChevronDown, Sun, Moon, UserCog, Lock, Menu, X, BookOpen,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import { useSidebar } from './SidebarContext';

// ─── Badge counts from backend ────────────────────────────────────────────────

function useBadgeCounts() {
  const { data: meetings } = useQuery({
    queryKey: ['sidebar', 'meetings'],
    queryFn: async () => { const r = await apiClient.get(ENDPOINTS.MEETINGS.BASE); const d = r.data?.data ?? r.data ?? []; return Array.isArray(d) ? d : d?.items ?? []; },
    staleTime: 60_000, refetchInterval: 60_000,
  });
  const { data: tasks } = useQuery({
    queryKey: ['sidebar', 'tasks'],
    queryFn: async () => { const r = await apiClient.get(ENDPOINTS.TASKS.BASE); const d = r.data?.data ?? r.data ?? []; return Array.isArray(d) ? d : d?.items ?? []; },
    staleTime: 30_000, refetchInterval: 30_000,
  });
  const { data: announcements } = useQuery({
    queryKey: ['sidebar', 'announcements'],
    queryFn: async () => { const r = await apiClient.get(ENDPOINTS.ANNOUNCEMENTS.BASE); const d = r.data?.data ?? r.data ?? []; return Array.isArray(d) ? d : d?.items ?? []; },
    staleTime: 30_000, refetchInterval: 30_000,
  });
  const { data: polls } = useQuery({
    queryKey: ['sidebar', 'polls'],
    queryFn: async () => { const r = await apiClient.get(ENDPOINTS.POLLS.BASE); const d = r.data?.data ?? r.data ?? []; return Array.isArray(d) ? d : d?.items ?? []; },
    staleTime: 60_000, refetchInterval: 60_000,
  });
  const now = new Date();
  return {
    meetings:      (meetings      ?? []).filter((m: any) => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > now).length || 0,
    tasks:         (tasks         ?? []).filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length || 0,
    announcements: (announcements ?? []).filter((a: any) => !a.isRead).length || 0,
    polls:         (polls         ?? []).filter((p: any) => p.status === 'ACTIVE' && !p.myResponse).length || 0,
    agendas: 0,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badgeKey?: keyof ReturnType<typeof useBadgeCounts>;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => typeof window !== 'undefined' && localStorage.getItem('eboard-theme') === 'dark');
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); localStorage.setItem('eboard-theme', isDark ? 'dark' : 'light'); }, [isDark]);
  return { isDark, toggle: useCallback(() => setIsDark(p => !p), []) };
}

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div className={cn('pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60]', 'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap', 'bg-gray-900 text-white border border-gray-700/60 shadow-xl', 'opacity-0 translate-x-1.5 scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 transition-all duration-150')}>
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2.5 mx-3 h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-gray-800/80" />;
  return <p className="px-4 pt-5 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-400/90 dark:text-gray-500/80 select-none">{label}</p>;
}

function NavBadge({ count, active, collapsed }: { count: number; active: boolean; collapsed: boolean }) {
  if (!count) return null;
  const d = count > 99 ? '99+' : String(count);
  if (collapsed) return <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-950 px-0.5 z-10 shadow-sm shadow-rose-500/40 tabular-nums">{d}</span>;
  return <span className={cn('ml-auto flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums tracking-tight', active ? 'bg-white/25 text-white shadow-inner shadow-black/10' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/70 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-900/50')}>{d}</span>;
}

function NavLink({ item, isActive, collapsed, badgeCount, onNavigate }: { item: NavItem; isActive: boolean; collapsed: boolean; badgeCount: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  const inner = (
    <div onClick={onNavigate} className={cn(
      'group relative flex items-center rounded-xl cursor-pointer select-none transition-all duration-200 ease-out',
      collapsed ? 'justify-center p-2.5 mx-1.5' : 'gap-3 px-3 py-2 mx-2',
      isActive
        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-inset ring-white/10'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-[0.98]'
    )}>
      {isActive && !collapsed && <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className={cn('h-[18px] w-[18px] transition-all duration-200', isActive ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]' : 'text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 group-hover:scale-110')} strokeWidth={isActive ? 2.25 : 2} />
        {collapsed && <NavBadge count={badgeCount} active={isActive} collapsed />}
      </span>
      {!collapsed && <><span className={cn('flex-1 truncate text-[13.5px] leading-none tracking-tight', isActive ? 'font-semibold' : 'font-medium')}>{item.label}</span><NavBadge count={badgeCount} active={isActive} collapsed={false} /></>}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </div>
  );
  return collapsed
    ? <Tooltip label={badgeCount ? `${item.label} (${badgeCount})` : item.label}><Link href={item.href}>{inner}</Link></Tooltip>
    : <Link href={item.href}>{inner}</Link>;
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function MainSidebarInner({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const [location] = useLocation();
  const { isDark, toggle } = useTheme();
  const badges = useBadgeCounts();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));
  const [user] = useState(() => { try { return authService.getUser(); } catch { return null; } });

  const initials = user ? `${(user as any).firstName?.[0] ?? ''}${(user as any).lastName?.[0] ?? ''}`.toUpperCase() : 'U';
  const fullName = user ? `${(user as any).firstName} ${(user as any).lastName}` : 'User';
  const email    = (user as any)?.email ?? '';
  const roleName = (user as any)?.role ? String((user as any).role).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Member';

  const mainNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard',     href: '/dashboard' },
    { icon: Calendar,        label: 'Meetings',      href: '/meetings',      badgeKey: 'meetings' },
    { icon: BookOpen,        label: 'Agendas',       href: '/agendas' },
    { icon: Users,           label: 'Members',       href: '/members' },
    { icon: FileText,        label: 'Documents',     href: '/documents' },
    { icon: Vote,            label: 'Voting',        href: '/voting',        badgeKey: 'polls' },
    { icon: CheckSquare,     label: 'Tasks',         href: '/tasks',         badgeKey: 'tasks' },
  ];

  const mgmtNav: NavItem[] = [
    { icon: Building2,       label: 'Organisation',  href: '/organisation' },
    { icon: Bell,            label: 'Announcements', href: '/announcements', badgeKey: 'announcements' },
    { icon: BarChart3,       label: 'Reports',       href: '/reports' },
  ];

  const bottomNav: NavItem[] = [
    { icon: Settings,        label: 'Settings',      href: '/settings' },
    { icon: HelpCircle,      label: 'Help',          href: '/help' },
  ];

  const isActive = (href: string) => href === '/dashboard' ? location === href : location.startsWith(href);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex h-16 shrink-0 items-center border-b border-gray-200/70 dark:border-gray-800/70', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
            <span className="text-white font-black text-[13px] tracking-tight drop-shadow-sm">EB</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          {!collapsed && <div className="min-w-0">
            <p className="text-[15.5px] font-black text-gray-900 dark:text-white tracking-tight leading-none">E-Board</p>
            <p className="text-[9.5px] text-gray-400 dark:text-gray-500 mt-1 font-bold tracking-[0.16em] uppercase">MIS · Portal</p>
          </div>}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
        <SectionLabel label="Main" collapsed={collapsed} />
        {mainNav.map(item => <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0} onNavigate={onNavigate} />)}
        <SectionLabel label="Management" collapsed={collapsed} />
        {mgmtNav.map(item => <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0} onNavigate={onNavigate} />)}
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-200/70 dark:border-gray-800/70 py-2">
        {collapsed
          ? <Tooltip label={isDark ? 'Light Mode' : 'Dark Mode'}><button onClick={toggle} className="w-full flex justify-center p-2.5 mx-1.5 rounded-xl text-gray-500 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button></Tooltip>
          : <button onClick={toggle} className="group w-full flex items-center gap-3 px-3 py-2 mx-2 rounded-xl text-[13.5px] font-medium tracking-tight text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-amber-600 transition-all">{isDark ? <Sun className="h-[18px] w-[18px] text-amber-400 shrink-0 group-hover:rotate-45 transition-transform duration-300" /> : <Moon className="h-[18px] w-[18px] text-gray-500 shrink-0 group-hover:-rotate-12 transition-transform duration-300" />}<span>{isDark ? 'Light Mode' : 'Dark Mode'}</span></button>
        }
        {bottomNav.map(item => <NavLink key={item.href} item={item} isActive={location === item.href} collapsed={collapsed} badgeCount={0} onNavigate={onNavigate} />)}
      </div>

      {/* User */}
      <div ref={userMenuRef} className="border-t border-gray-200/70 dark:border-gray-800/70 p-2.5">
        {collapsed
          ? <Tooltip label={`${fullName} · ${roleName}`}><button className="mx-auto block p-0.5"><Avatar className="h-9 w-9"><AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">{initials}</AvatarFallback></Avatar></button></Tooltip>
          : (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(o => !o)} className={cn('w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200 border', userMenuOpen ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60 shadow-sm shadow-indigo-500/5' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200/70 dark:hover:border-gray-800')}>
                <div className="relative shrink-0"><Avatar className="h-9 w-9 ring-2 ring-white dark:ring-gray-900 shadow-sm"><AvatarFallback className="text-[11px] font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white tracking-wide">{initials}</AvatarFallback></Avatar><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" /></div>
                <div className="flex-1 text-left min-w-0"><p className="text-[13px] font-bold text-gray-900 dark:text-white truncate leading-tight tracking-tight">{fullName}</p><p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">{roleName}</p></div>
                <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-200 shrink-0', userMenuOpen && 'rotate-180')} />
              </button>
              {userMenuOpen && (
                <div className={cn('absolute bottom-full left-0 right-0 mb-2 z-[60]', 'bg-white dark:bg-gray-950 rounded-2xl overflow-hidden', 'border border-gray-200/80 dark:border-gray-800/70 shadow-2xl', 'animate-in fade-in-60 zoom-in-95 slide-in-from-bottom-2 duration-150')}>
                  <div className="px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-900 border-b border-gray-200/60 dark:border-gray-800/60">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">{initials}</AvatarFallback></Avatar>
                      <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{fullName}</p><p className="text-xs text-gray-500 truncate">{email}</p></div>
                    </div>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {[{ icon: UserCog, label: 'Profile Settings', href: '/settings/profile' }, { icon: Building2, label: 'Organisation', href: '/organisation' }, { icon: Lock, label: 'Security', href: '/settings/security' }, { icon: Bell, label: 'Notifications', href: '/settings/notifications' }].map(({ icon: Icon, label, href }) => (
                      <Link key={href} href={href}><div onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"><Icon className="h-4 w-4 text-gray-400 shrink-0" />{label}</div></Link>
                    ))}
                    <div className="my-1 mx-2 h-px bg-gray-200/70 dark:bg-gray-800/50" />
                    <button onClick={() => { authService.logout(); window.location.href = '/auth/signin'; }} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                      <LogOut className="h-4 w-4 shrink-0" />Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ─── Main Sidebar export ──────────────────────────────────────────────────────

export function MainSidebar({ className }: { className?: string }) {
  const { collapsed, setCollapsed, mobileOpen, toggleMobile, isMobile, isTablet } = useSidebar();
  const [location] = useLocation();

  useEffect(() => {
    if (isMobile) useSidebar; // close handled by context
  }, [location]);

  if (isMobile) {
    return (
      <>
        <button onClick={toggleMobile} className={cn('fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all', mobileOpen && 'hidden')} aria-label="Open menu">
          <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className={cn('fixed inset-0 z-40 bg-gray-950/60 backdrop-blur-sm transition-opacity duration-300', mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} onClick={toggleMobile} />
        <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200/80 dark:border-gray-800/70 antialiased shadow-2xl transition-transform duration-300', mobileOpen ? 'translate-x-0' : '-translate-x-full', className)}>
          <button onClick={toggleMobile} className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Close"><X className="h-4 w-4" /></button>
          <MainSidebarInner collapsed={false} onNavigate={toggleMobile} />
        </aside>
      </>
    );
  }

  if (isTablet) {
    return (
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-[68px] flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200/80 dark:border-gray-800/70 antialiased shadow-sm', className)}>
        <MainSidebarInner collapsed />
      </aside>
    );
  }

  return (
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200/80 dark:border-gray-800/70 antialiased shadow-sm transition-[width] duration-300', collapsed ? 'w-[68px]' : 'w-64', className)}>
      <button onClick={() => setCollapsed(!collapsed)} className={cn('absolute -right-3.5 top-[72px] z-50 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-md hover:border-indigo-400 text-indigo-500 transition-all hover:scale-110')} aria-label={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
      <MainSidebarInner collapsed={collapsed} />
    </aside>
  );
}

// Keep old export name for backward compat
export { MainSidebar as Sidebar };