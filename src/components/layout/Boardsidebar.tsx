// src/components/layout/BoardSidebar.tsx
// Dedicated sidebar for Board Members — uses localStorage store for badge counts.
// Completely separate from the OrgAdmin sidebar.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, CalendarDays, FileText, Vote, CheckSquare,
  BarChart3, Megaphone, MessageSquare, Bell, Shield, Archive,
  UserCircle, ChevronLeft, ChevronRight, Sun, Moon,
  ChevronDown, LogOut, Menu, X, TrendingUp,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { useSidebar } from './SidebarContext';

// ─── Badge counts from localStorage store ────────────────────────────────────

function useBoardBadges() {
  const [counts, setCounts] = useState({ resolutions: 0, tasks: 0, announcements: 0, polls: 0, messages: 0, notifications: 0, compliance: 0 });

  function compute() {
    try {
      const parse = (key: string) => { try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; } };
      const resolutions   = parse('bm:resolutions').filter((r: any) => r.status === 'OPEN' && !r.myVote).length;
      const tasks         = parse('bm:tasks').filter((t: any) => ['PENDING','IN_PROGRESS','OVERDUE'].includes(t.status)).length;
      const announcements = parse('bm:announcements').filter((a: any) => !a.isRead).length;
      const polls         = parse('bm:polls').filter((p: any) => p.status === 'ACTIVE' && !(p.myResponse?.length)).length;
      const threads       = parse('bm:threads');
      const messages      = threads.reduce((acc: number, t: any) =>
        acc + (t.messages ?? []).filter((m: any) => !m.readBy?.includes('user-001') && m.senderId !== 'user-001').length, 0);
      const notifications = parse('bm:notifications').filter((n: any) => !n.isRead).length;
      const compliance    = parse('bm:compliance').filter((c: any) => !c.isAcknowledged).length;
      setCounts({ resolutions, tasks, announcements, polls, messages, notifications, compliance });
    } catch {}
  }

  useEffect(() => {
    compute();
    // Recompute on storage change (other tabs) or every 10s
    const interval = setInterval(compute, 10_000);
    window.addEventListener('storage', compute);
    return () => { clearInterval(interval); window.removeEventListener('storage', compute); };
  }, []);

  return counts;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  icon:  React.ElementType;
  label: string;
  href:  string;
  badge?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useTheme() {
  const [isDark, setIsDark] = useState(() => typeof window !== 'undefined' && localStorage.getItem('eboard-theme') === 'dark');
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); localStorage.setItem('eboard-theme', isDark ? 'dark' : 'light'); }, [isDark]);
  return { isDark, toggle: useCallback(() => setIsDark(p => !p), []) };
}

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div className={cn('pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap bg-gray-900 text-white border border-gray-700/60 shadow-xl opacity-0 translate-x-1.5 scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 transition-all duration-150')}>
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-3 h-px bg-gray-200/60 dark:bg-gray-800/60" />;
  return <p className="px-4 pt-5 pb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 select-none">{label}</p>;
}

function NavLink({ item, isActive, collapsed, onNavigate }: { item: NavItem; isActive: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const badge = item.badge ?? 0;

  const inner = (
    <div onClick={onNavigate} className={cn('group relative flex items-center rounded-xl cursor-pointer select-none transition-all duration-200', collapsed ? 'justify-center p-2.5 mx-1.5' : 'gap-3 px-3.5 py-2.5 mx-1', isActive
      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-[0.98]')}>
      {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-white/60" />}
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className={cn('h-[18px] w-[18px] transition-colors', isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-500')} />
        {collapsed && badge > 0 && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-950 px-0.5 z-10">{badge > 99 ? '99+' : badge}</span>}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-sm font-medium leading-none">{item.label}</span>
          {badge > 0 && <span className={cn('ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black', isActive ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300')}>{badge > 99 ? '99+' : badge}</span>}
        </>
      )}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </div>
  );

  return collapsed
    ? <Tooltip label={badge ? `${item.label} (${badge})` : item.label}><Link href={item.href}>{inner}</Link></Tooltip>
    : <Link href={item.href}>{inner}</Link>;
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function BoardSidebarInner({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const [location] = useLocation();
  const { isDark, toggle } = useTheme();
  const badges = useBoardBadges();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));

  // Read from localStorage store (board member profile)
  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('bm:profile') ?? 'null'); } catch { return null; }
  })();
  const firstName = profile?.firstName ?? 'Alex';
  const lastName  = profile?.lastName  ?? 'Johnson';
  const email     = profile?.email     ?? '';
  const title     = profile?.title     ?? 'Board Member';
  const initials  = `${firstName[0]}${lastName[0]}`.toUpperCase();

  const mainNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Overview',       href: '/board' },
    { icon: CalendarDays,    label: 'Meetings',       href: '/board/meetings' },
    { icon: FileText,        label: 'Documents',      href: '/board/documents' },
    { icon: Vote,            label: 'Resolutions',    href: '/board/resolutions',  badge: badges.resolutions },
    { icon: CheckSquare,     label: 'Tasks',          href: '/board/tasks',        badge: badges.tasks },
    { icon: BarChart3,       label: 'Polls',          href: '/board/polls',        badge: badges.polls },
  ];

  const communicationsNav: NavItem[] = [
    { icon: Megaphone,       label: 'Announcements',  href: '/board/announcements',badge: badges.announcements },
    { icon: MessageSquare,   label: 'Messages',       href: '/board/messages',     badge: badges.messages },
    { icon: Bell,            label: 'Notifications',  href: '/board/notifications',badge: badges.notifications },
  ];

  const governanceNav: NavItem[] = [
    { icon: Shield,          label: 'Compliance',     href: '/board/compliance',   badge: badges.compliance },
    { icon: TrendingUp,      label: 'Analytics',      href: '/board/analytics' },
    { icon: Archive,         label: 'Archives',       href: '/board/archives' },
  ];

  const isActive = (href: string) => href === '/board' ? location === href : location.startsWith(href);

  return (
    <div className="flex flex-col h-full">
      {/* Logo — board member branding */}
      <div className={cn('flex h-16 shrink-0 items-center border-b border-gray-200/70 dark:border-gray-800/70', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <span className="text-white font-black text-sm">BM</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight">E-Board</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold tracking-wide uppercase">Board Member</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
        <SectionLabel label="Board" collapsed={collapsed} />
        {mainNav.map(item => <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />)}

        <SectionLabel label="Communications" collapsed={collapsed} />
        {communicationsNav.map(item => <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />)}

        <SectionLabel label="Governance" collapsed={collapsed} />
        {governanceNav.map(item => <NavLink key={item.href} item={item} isActive={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />)}
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-200/70 dark:border-gray-800/70 py-2">
        {/* Profile link */}
        <NavLink item={{ icon: UserCircle, label: 'My Profile', href: '/board/profile' }} isActive={location === '/board/profile'} collapsed={collapsed} onNavigate={onNavigate} />

        {/* Theme toggle */}
        {collapsed
          ? <Tooltip label={isDark ? 'Light Mode' : 'Dark Mode'}><button onClick={toggle} className="w-full flex justify-center p-2.5 mx-1.5 rounded-xl text-gray-500 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button></Tooltip>
          : <button onClick={toggle} className="w-full flex items-center gap-3 px-3.5 py-2.5 mx-1 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-amber-600 transition-all">{isDark ? <Sun className="h-[18px] w-[18px] text-amber-400 shrink-0" /> : <Moon className="h-[18px] w-[18px] text-gray-500 shrink-0" />}<span>{isDark ? 'Light Mode' : 'Dark Mode'}</span></button>
        }
      </div>

      {/* User */}
      <div ref={userMenuRef} className="border-t border-gray-200/70 dark:border-gray-800/70 p-2.5">
        {collapsed
          ? <Tooltip label={`${firstName} ${lastName} · ${title}`}><button className="mx-auto block p-0.5"><Avatar className="h-9 w-9"><AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">{initials}</AvatarFallback></Avatar></button></Tooltip>
          : (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(o => !o)} className={cn('w-full flex items-center gap-3 rounded-xl px-3 py-2 transition-all border', userMenuOpen ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200')}>
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9"><AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">{initials}</AvatarFallback></Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-none">{firstName} {lastName}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{title}</p>
                </div>
                <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-200 shrink-0', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <div className={cn('absolute bottom-full left-0 right-0 mb-2 z-[60] bg-white dark:bg-gray-950 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800/70 shadow-2xl animate-in fade-in-60 zoom-in-95 slide-in-from-bottom-2 duration-150')}>
                  <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-900 border-b border-gray-200/60 dark:border-gray-800/60">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">{initials}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{firstName} {lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{email}</p>
                        <span className="inline-flex items-center mt-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{title}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link href="/board/profile">
                      <div onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer">
                        <UserCircle className="h-4 w-4 text-gray-400 shrink-0" />My Profile
                      </div>
                    </Link>
                    <Link href="/board/notifications">
                      <div onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer">
                        <Bell className="h-4 w-4 text-gray-400 shrink-0" />Notifications
                        {badges.notifications > 0 && <span className="ml-auto text-xs font-bold text-rose-600">{badges.notifications}</span>}
                      </div>
                    </Link>
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

// ─── Board Sidebar export ─────────────────────────────────────────────────────

export function BoardSidebar({ className }: { className?: string }) {
  const { collapsed, setCollapsed, mobileOpen, toggleMobile, isMobile, isTablet } = useSidebar();
  const [location] = useLocation();

  useEffect(() => { /* close mobile on navigate — handled by context */ }, [location]);

  if (isMobile) {
    return (
      <>
        <button onClick={toggleMobile} className={cn('fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all', mobileOpen && 'hidden')} aria-label="Open menu">
          <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className={cn('fixed inset-0 z-40 bg-gray-950/60 backdrop-blur-sm transition-opacity duration-300', mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')} onClick={toggleMobile} />
        <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200/70 dark:border-gray-800/70 shadow-2xl transition-transform duration-300', mobileOpen ? 'translate-x-0' : '-translate-x-full', className)}>
          <button onClick={toggleMobile} className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Close"><X className="h-4 w-4" /></button>
          <BoardSidebarInner collapsed={false} onNavigate={toggleMobile} />
        </aside>
      </>
    );
  }

  if (isTablet) {
    return (
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-[68px] flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200/70 dark:border-gray-800/70 shadow-sm', className)}>
        <BoardSidebarInner collapsed />
      </aside>
    );
  }

  return (
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-950 border-r border-gray-200/70 dark:border-gray-800/70 shadow-sm transition-[width] duration-300', collapsed ? 'w-[68px]' : 'w-64', className)}>
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3.5 top-[72px] z-50 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-md hover:border-emerald-400 text-emerald-500 transition-all hover:scale-110" aria-label={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
      <BoardSidebarInner collapsed={collapsed} />
    </aside>
  );
}