// src/components/layout/Sidebar.tsx
import React, {
  useState, useEffect, useRef, useCallback, createContext, useContext,
} from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Calendar, Users, FileText,
  CheckSquare, Vote, Settings, ChevronLeft,
  ChevronRight, Bell, BarChart3, HelpCircle,
  LogOut, Building2, ChevronDown, Sun, Moon,
  UserCog, Lock, Menu, X, BookOpen,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR CONTEXT — lets page content know sidebar width so it can offset
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarCtx {
  collapsed:    boolean;
  mobileOpen:   boolean;
  setCollapsed: (v: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarCtx>({
  collapsed: false, mobileOpen: false,
  setCollapsed: () => {}, toggleMobile: () => {},
});

export function useSidebar() { return useContext(SidebarContext); }

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME BADGE COUNTS
// ─────────────────────────────────────────────────────────────────────────────

function useBadgeCounts() {
  // Meetings: count scheduled upcoming
  const { data: meetings } = useQuery({
    queryKey: ['sidebar', 'meetings'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.MEETINGS.BASE);
      const items = res.data?.data ?? res.data ?? [];
      return Array.isArray(items) ? items : items?.items ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Agendas: count published agendas with upcoming meetings
  const { data: agendas } = useQuery({
    queryKey: ['sidebar', 'agendas'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.AGENDAS?.BASE ?? '/agendas');
      const items = res.data?.data ?? res.data ?? [];
      return Array.isArray(items) ? items : items?.items ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Tasks: count pending / in-progress for current user
  const { data: tasks } = useQuery({
    queryKey: ['sidebar', 'tasks'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.TASKS.BASE);
      const items = res.data?.data ?? res.data ?? [];
      return Array.isArray(items) ? items : items?.items ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Announcements: count unread
  const { data: announcements } = useQuery({
    queryKey: ['sidebar', 'announcements'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.ANNOUNCEMENTS.BASE);
      const items = res.data?.data ?? res.data ?? [];
      return Array.isArray(items) ? items : items?.items ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Polls: count active unanswered
  const { data: polls } = useQuery({
    queryKey: ['sidebar', 'polls'],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.POLLS.BASE);
      const items = res.data?.data ?? res.data ?? [];
      return Array.isArray(items) ? items : items?.items ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const now = new Date();

  return {
    meetings:      (meetings  ?? []).filter((m: any) => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > now).length  || 0,
    agendas:       (agendas   ?? []).filter((a: any) => a.status === 'PUBLISHED').length || 0,
    tasks:         (tasks     ?? []).filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length || 0,
    announcements: (announcements ?? []).filter((a: any) => !a.isRead).length || 0,
    polls:         (polls     ?? []).filter((p: any) => p.status === 'ACTIVE' && !p.myResponse).length || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  icon:    React.ElementType;
  label:   string;
  href:    string;
  badgeKey?: keyof ReturnType<typeof useBadgeCounts>;
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eboard-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('eboard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: useCallback(() => setIsDark(p => !p), []) };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLICK OUTSIDE
// ─────────────────────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

// ─────────────────────────────────────────────────────────────────────────────
// BREAKPOINT HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useBreakpoint() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  useEffect(() => {
    let raf: number;
    const handler = () => {
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', handler, { passive: true });
    return () => { window.removeEventListener('resize', handler); cancelAnimationFrame(raf); };
  }, []);

  return {
    isMobile: width < 768,   // sm
    isTablet: width >= 768 && width < 1024,  // md
    isDesktop: width >= 1024, // lg+
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div className={cn(
        'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60]',
        'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap',
        'bg-gray-900 text-white dark:bg-gray-800 dark:text-gray-100',
        'border border-gray-700/60 shadow-xl',
        'opacity-0 translate-x-1.5 scale-95',
        'group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100',
        'transition-all duration-150 ease-out',
      )}>
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-800" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-3 h-px bg-gray-200/60 dark:bg-gray-800/60" />;
  return (
    <p className="px-4 pt-5 pb-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-600 select-none">
      {label}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────────────────────

function Badge({
  count, active, collapsed,
}: { count: number; active: boolean; collapsed: boolean }) {
  if (!count) return null;
  const display = count > 99 ? '99+' : String(count);

  if (collapsed) {
    return (
      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-950 px-0.5 z-10">
        {display}
      </span>
    );
  }

  return (
    <span className={cn(
      'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black transition-colors',
      active
        ? 'bg-white/25 text-white'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    )}>
      {display}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV LINK
// ─────────────────────────────────────────────────────────────────────────────

function NavLink({
  item, isActive, collapsed, badgeCount, onNavigate,
}: {
  item:        NavItem;
  isActive:    boolean;
  collapsed:   boolean;
  badgeCount:  number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const inner = (
    <div
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center rounded-xl cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        collapsed ? 'justify-center p-2.5 mx-1.5' : 'gap-3 px-3.5 py-2.5 mx-1',
        isActive
          ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30'
          : [
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100/80 dark:hover:bg-gray-800/60',
              'hover:text-indigo-600 dark:hover:text-indigo-400',
              'active:scale-[0.98]',
            ],
      )}
    >
      {/* Active left stripe */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-white/60" />
      )}

      {/* Icon + collapsed badge */}
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className={cn(
          'h-[18px] w-[18px] transition-colors',
          isActive
            ? 'text-white'
            : 'text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400',
        )} />
        {collapsed && <Badge count={badgeCount} active={isActive} collapsed />}
      </span>

      {/* Label + expanded badge */}
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-sm font-medium leading-none">
            {item.label}
          </span>
          <Badge count={badgeCount} active={isActive} collapsed={false} />
        </>
      )}

      {collapsed && <span className="sr-only">{item.label}</span>}
    </div>
  );

  return collapsed ? (
    <Tooltip label={badgeCount ? `${item.label} (${badgeCount})` : item.label}>
      <Link href={item.href}>{inner}</Link>
    </Tooltip>
  ) : (
    <Link href={item.href}>{inner}</Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR INNER
// ─────────────────────────────────────────────────────────────────────────────

function SidebarInner({
  collapsed, onNavigate,
}: {
  collapsed:   boolean;
  onNavigate?: () => void;
}) {
  const [location]            = useLocation();
  const { isDark, toggle }    = useTheme();
  const badges                = useBadgeCounts();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));

  const [user] = useState(() => {
    try { return authService.getUser(); } catch { return null; }
  });

  const initials = user
    ? `${(user as any).firstName?.[0] ?? ''}${(user as any).lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const fullName = user ? `${(user as any).firstName} ${(user as any).lastName}` : 'User';
  const email    = (user as any)?.email ?? '';
  const roleName = (user as any)?.role
    ? String((user as any).role).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Member';

  const mainNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard',  href: '/' },
    { icon: Calendar,        label: 'Meetings',   href: '/meetings',   badgeKey: 'meetings' },
{ icon: BookOpen,        label: 'Agendas',    href: '/agendas',    badgeKey: 'agendas' },
    { icon: FileText,       label: 'Minutes',    href: '/minutes' },
    { icon: Users,           label: 'Members',    href: '/members' },
    { icon: FileText,        label: 'Documents',  href: '/documents' },
    { icon: Vote,            label: 'Voting',     href: '/voting',     badgeKey: 'polls' },
    { icon: CheckSquare,     label: 'Tasks',      href: '/tasks',      badgeKey: 'tasks' },
  ];

  const adminNav: NavItem[] = [
    { icon: Building2,       label: 'Organisation', href: '/organisation' },
    { icon: Bell,            label: 'Announcements',href: '/announcements', badgeKey: 'announcements' },
    { icon: BarChart3,       label: 'Reports',      href: '/reports' },
  ];

  const bottomNav: NavItem[] = [
    { icon: Settings,    label: 'Settings', href: '/settings' },
    { icon: HelpCircle,  label: 'Help',     href: '/help' },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo bar ─────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex h-16 shrink-0 items-center border-b border-gray-200/70 dark:border-gray-800/70',
        collapsed ? 'justify-center px-2' : 'justify-between px-4',
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo mark */}
          <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden shadow-md shadow-indigo-500/20 bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-tight">EB</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-none">
              <p className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight">E-Board</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium tracking-wide uppercase">MIS Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav scroll area ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5
        scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">

        <SectionLabel label="Main" collapsed={collapsed} />
        {mainNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href || (item.href !== '/' && location.startsWith(item.href))}
            collapsed={collapsed}
            badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
            onNavigate={onNavigate}
          />
        ))}

        <SectionLabel label="Management" collapsed={collapsed} />
        {adminNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href || (item.href !== '/' && location.startsWith(item.href))}
            collapsed={collapsed}
            badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200/70 dark:border-gray-800/70 py-2 space-y-0.5">
        {/* Theme toggle */}
        {collapsed ? (
          <Tooltip label={isDark ? 'Light Mode' : 'Dark Mode'}>
            <button
              onClick={toggle}
              className="w-full flex justify-center items-center p-2.5 mx-1.5 rounded-xl text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 mx-1 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
          >
            {isDark
              ? <Sun className="h-[18px] w-[18px] text-amber-400 shrink-0" />
              : <Moon className="h-[18px] w-[18px] text-gray-500 shrink-0" />
            }
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        {bottomNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href}
            collapsed={collapsed}
            badgeCount={0}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {/* ── User section ─────────────────────────────────────────────────── */}
      <div ref={userMenuRef} className="border-t border-gray-200/70 dark:border-gray-800/70 p-2.5">
        {collapsed ? (
          <Tooltip label={`${fullName} · ${roleName}`}>
            <button className="mx-auto block p-0.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </Tooltip>
        ) : (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 border',
                userMenuOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-sm'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700/50',
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-none">{fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{roleName}</p>
              </div>

              <ChevronDown className={cn(
                'h-3.5 w-3.5 text-gray-400 transition-transform duration-200 shrink-0',
                userMenuOpen && 'rotate-180',
              )} />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className={cn(
                'absolute bottom-full left-0 right-0 mb-2 z-[60]',
                'bg-white dark:bg-gray-950 rounded-2xl overflow-hidden',
                'border border-gray-200/80 dark:border-gray-800/70',
                'shadow-2xl dark:shadow-[0_-20px_60px_rgba(0,0,0,0.5)]',
                'animate-in fade-in-60 zoom-in-95 slide-in-from-bottom-2 duration-150',
              )}>
                {/* Profile header */}
                <div className="px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-900 border-b border-gray-200/60 dark:border-gray-800/60">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-700/50">
                          <Building2 className="h-2.5 w-2.5" />{roleName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5 space-y-0.5">
                  {[
                    { icon: UserCog,  label: 'Profile Settings', href: '/settings/profile' },
                    { icon: Building2,label: 'Organisation',      href: '/organisation' },
                    { icon: Lock,     label: 'Security',          href: '/settings/security' },
                    { icon: Bell,     label: 'Notifications',     href: '/settings/notifications' },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link key={href} href={href}>
                      <div
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
                      >
                        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        {label}
                      </div>
                    </Link>
                  ))}

                  <div className="my-1 mx-2 h-px bg-gray-200/70 dark:bg-gray-800/50" />

                  <button
                    onClick={() => {
                      authService.logout();
                      setUserMenuOpen(false);
                      window.location.href = '/auth/signin';
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SIDEBAR EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar({ className }: { className?: string }) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Desktop collapsed state — persisted
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  }, []);

  const toggleMobile = useCallback(() => setMobileOpen(o => !o), []);

  // Auto-collapse on tablet, auto-close mobile drawer on route change
  const [location] = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close mobile drawer on escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // ── MOBILE (< 768px): slide-over drawer with backdrop ──
  if (isMobile) {
    return (
      <SidebarContext.Provider value={{ collapsed: false, mobileOpen, setCollapsed, toggleMobile }}>
        <>
          {/* Hamburger trigger — rendered outside sidebar so it's always visible */}
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              'fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl',
              'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
              'shadow-md hover:shadow-lg transition-all duration-200',
              mobileOpen && 'hidden',
            )}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 bg-gray-950/60 backdrop-blur-sm transition-opacity duration-300',
              mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )}
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-72 flex flex-col',
              'bg-white dark:bg-gray-950',
              'border-r border-gray-200/70 dark:border-gray-800/70',
              'shadow-2xl dark:shadow-[20px_0_60px_rgba(0,0,0,0.5)]',
              'transition-transform duration-300 ease-out',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
              className,
            )}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>

            <SidebarInner collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      </SidebarContext.Provider>
    );
  }

  // ── TABLET (768–1023px): always collapsed icon rail ──
  if (isTablet) {
    return (
      <SidebarContext.Provider value={{ collapsed: true, mobileOpen: false, setCollapsed, toggleMobile }}>
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[68px] flex flex-col',
            'bg-white dark:bg-gray-950',
            'border-r border-gray-200/70 dark:border-gray-800/70',
            'shadow-sm',
            className,
          )}
        >
          <SidebarInner collapsed />
        </aside>
      </SidebarContext.Provider>
    );
  }

  // ── DESKTOP (≥ 1024px): expandable sidebar ──
  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen: false, setCollapsed, toggleMobile }}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          'bg-white dark:bg-gray-950',
          'border-r border-gray-200/70 dark:border-gray-800/70',
          'shadow-sm dark:shadow-none',
          'transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-64',
          className,
        )}
      >
        {/* Collapse/expand pill */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'absolute -right-3.5 top-[72px] z-50',
            'flex h-7 w-7 items-center justify-center rounded-full',
            'bg-white dark:bg-gray-900',
            'border border-gray-300 dark:border-gray-700',
            'shadow-md hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600',
            'text-indigo-500 dark:text-indigo-400',
            'transition-all duration-200 hover:scale-110',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />
          }
        </button>

        <SidebarInner collapsed={collapsed} />
      </aside>
    </SidebarContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT WRAPPER — use this to wrap your page content
// Automatically offsets main content based on sidebar state
// ─────────────────────────────────────────────────────────────────────────────

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const { collapsed } = useSidebar();

  const marginLeft = isMobile
    ? 'ml-0'
    : isTablet
    ? 'ml-[68px]'
    : collapsed
    ? 'ml-[68px]'
    : 'ml-64';

  return (
    <main className={cn('min-h-screen transition-[margin-left] duration-300 ease-in-out', marginLeft)}>
      {/* Mobile top bar spacer so content doesn't sit under hamburger */}
      {isMobile && <div className="h-16" />}
      {children}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE TOP BAR — visible only on mobile, shows hamburger + page title
// Usage: <MobileTopBar title="Dashboard" />
// ─────────────────────────────────────────────────────────────────────────────

export function MobileTopBar({ title }: { title?: string }) {
  const { toggleMobile } = useSidebar();
  const { isMobile } = useBreakpoint();

  if (!isMobile) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-30 h-16 flex items-center gap-4 px-4 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200/70 dark:border-gray-800/70 shadow-sm">
      <button
        onClick={toggleMobile}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-black text-[10px]">EB</span>
        </div>
        <span className="text-base font-bold text-gray-900 dark:text-white">
          {title ?? 'E-Board'}
        </span>
      </div>
    </div>
  );
}