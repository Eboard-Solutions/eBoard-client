// src/components/layout/Sidebar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Calendar, Users, FileText,
  CheckSquare, Vote, DollarSign, Settings,
  ChevronLeft, ChevronRight, Bell, BarChart3,
  HelpCircle, LogOut, Building2, ChevronDown,
  Sun, Moon, UserCog, Lock,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';

// ─────────────────────────────────────────────────────────
// TYPES & NAV STRUCTURE
// ─────────────────────────────────────────────────────────
interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Calendar, label: 'Meetings', href: '/meetings', badge: 2 },
  { icon: FileText, label: 'Agendas', href: '/agendas', badge: 3 },
  { icon: Users, label: 'Members', href: '/members' },
  { icon: FileText, label: 'Documents', href: '/documents' },
  { icon: Vote, label: 'Voting', href: '/voting', badge: 1 },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks', badge: 5 },
];

const adminNav: NavItem[] = [
  { icon: DollarSign, label: 'Finance', href: '/finance' },
  { icon: Building2, label: 'Organisation', href: '/organisation' },  // ← NEW
  { icon: Bell, label: 'Announcements', href: '/announcements', badge: 3 },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

const bottomNav: NavItem[] = [
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help', href: '/help' },
];

// ─────────────────────────────────────────────────────────
// THEME HOOK
// ─────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('eboard-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('eboard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: useCallback(() => setIsDark(p => !p), []) };
}

// ─────────────────────────────────────────────────────────
// CLICK OUTSIDE
// ─────────────────────────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

// ─────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div
        className={cn(
          'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50',
          'rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap',
          'bg-gray-900/95 text-white dark:bg-gray-800/95 dark:text-gray-100',
          'border border-gray-700/50 shadow-xl backdrop-blur-sm',
          'opacity-0 translate-x-2 scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100',
          'transition-all duration-200 ease-out'
        )}
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900/95 dark:border-r-gray-800/95" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-3 h-px bg-gray-200/70 dark:bg-gray-800/50 mx-3" />;
  return (
    <p className="px-3.5 pt-5 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-500/90 dark:text-gray-500 select-none">
      {label}
    </p>
  );
}

// ─────────────────────────────────────────────────────────
// NAV LINK
// ─────────────────────────────────────────────────────────
function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <div
        className={cn(
          'group relative flex items-center gap-3 rounded-xl cursor-pointer select-none transition-all duration-200',
          collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5',
          isActive
            ? 'bg-gradient-to-r from-indigo-600/90 to-blue-700/90 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-[1.02] hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950'
        )}
      >
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-white/70" />
        )}

        <span className="relative flex items-center justify-center shrink-0">
          <Icon
            className={cn(
              'h-5 w-5 transition-colors',
              isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-indigo-500'
            )}
          />
          {collapsed && item.badge ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-950 px-1">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          ) : null}
        </span>

        {!collapsed && (
          <>
            <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                  isActive
                    ? 'bg-white/30 text-white'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </>
        )}

        {collapsed && <span className="sr-only">{item.label}</span>}
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN SIDEBAR
// ─────────────────────────────────────────────────────────
export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true' || window.innerWidth < 768;
  });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));

  // ── User — read during initialization, not in useEffect ───
  const [mounted] = useState(true);
  const [user] = useState<ReturnType<typeof authService.getUser>>(() => {
    try { return authService.getUser(); } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCollapsed(false);
        window.dispatchEvent(new CustomEvent('eboard:focus-search'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const roleName = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Member';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col',
        'bg-white dark:bg-gray-950',
        'border-r border-gray-200/80 dark:border-gray-800/80',
        'shadow-sm dark:shadow-none',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]',
        mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
        className
      )}
    >
      {/* Logo Bar */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-gray-200/70 dark:border-gray-800/70',
          collapsed ? 'justify-center px-4' : 'justify-between px-5'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/30">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="E-Board"
              className="h-full w-full object-cover"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                E-Board
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                MIS Portal
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Expand pill when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className={cn(
            'absolute -right-3 top-16 z-50 flex h-7 w-7 items-center justify-center rounded-full',
            'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700',
            'shadow-md hover:shadow-lg hover:border-indigo-400 text-indigo-500',
            'transition-all duration-200'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <SectionLabel label="Main" collapsed={collapsed} />
        {mainNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href}
            collapsed={collapsed}
          />
        ))}

        <SectionLabel label="Management" collapsed={collapsed} />
        {adminNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-200/70 dark:border-gray-800/70 pt-3 pb-2">
        {/* Theme Toggle */}
        {collapsed ? (
          <Tooltip label={isDark ? 'Light Mode' : 'Dark Mode'}>
            <button
              onClick={toggleTheme}
              className="mx-auto block rounded-xl p-3 text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-500 group-hover:text-amber-500" />
            )}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        {bottomNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* User Section */}
      <div ref={userMenuRef} className="border-t border-gray-200/70 dark:border-gray-800/70 py-3 px-3">
        {collapsed ? (
          <Tooltip label={`${fullName} · ${roleName}`}>
            <button className="mx-auto block">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
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
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 border',
                userMenuOpen
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/50 shadow-sm'
                  : 'border-transparent hover:bg-gray-50/70 dark:hover:bg-gray-800/50 hover:border-gray-200/70 dark:hover:border-gray-700/50'
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-indigo-100/60 dark:ring-indigo-900/40">
                  <AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{roleName}</p>
              </div>

              <ChevronDown className={cn('h-4 w-4 transition-transform', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div
                className={cn(
                  'absolute bottom-full left-0 right-0 mb-3 z-50',
                  'bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/80 dark:border-gray-800/70',
                  'shadow-2xl dark:shadow-[0_-20px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm',
                  'animate-in fade-in-60 zoom-in-95 slide-in-from-bottom-3 duration-200'
                )}
              >
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-gray-900/80 dark:to-gray-900/80 border-b border-gray-200/70 dark:border-gray-800/70 rounded-t-2xl">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-indigo-200/40 dark:ring-indigo-800/40">
                      <AvatarFallback className="text-base font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-gray-900 dark:text-white truncate">{fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email ?? '—'}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 dark:bg-indigo-900/50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-700/50">
                          <Building2 className="h-3 w-3" />
                          {roleName}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/60 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2 space-y-1">
                  {[
                    { icon: UserCog, label: 'Profile Settings', href: '/settings/profile' },
                    { icon: Building2, label: 'Organisation', href: '/organisation' },
                    { icon: Lock, label: 'Security & Privacy', href: '/settings/security' },
                    { icon: Bell, label: 'Notifications', href: '/settings/notifications' },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link key={href} href={href}>
                      <div
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
                      >
                        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        {label}
                      </div>
                    </Link>
                  ))}

                  <div className="my-2 h-px bg-gray-200/70 dark:bg-gray-800/50" />

                  <button
                    onClick={() => {
                      authService.logout();
                      setUserMenuOpen(false);
                      window.location.href = '/auth/signin';
                    }}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}