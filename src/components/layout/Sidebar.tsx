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
// TYPES
// ─────────────────────────────────────────────────────────
interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

// ─────────────────────────────────────────────────────────
// NAV STRUCTURE  (flat — no submenus)
// ─────────────────────────────────────────────────────────
const mainNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',     href: '/' },
  { icon: Calendar,        label: 'Meetings',      href: '/meetings',      badge: 2 },
  { icon: Users,           label: 'Members',       href: '/members' },
  { icon: FileText,        label: 'Documents',     href: '/documents' },
  { icon: Vote,            label: 'Voting',        href: '/voting',        badge: 1 },
  { icon: CheckSquare,     label: 'Tasks',         href: '/tasks',         badge: 5 },
];

const adminNav: NavItem[] = [
  { icon: DollarSign, label: 'Finance',       href: '/finance' },
  { icon: Bell,       label: 'Announcements', href: '/announcements', badge: 3 },
  { icon: BarChart3,  label: 'Reports',       href: '/reports' },
];

const bottomNav: NavItem[] = [
  { icon: Settings,   label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help',     href: '/help' },
];

// ─────────────────────────────────────────────────────────
// THEME HOOK
// Light is the strict default on first visit.
// System prefers-color-scheme is intentionally ignored unless
// the user has already saved a preference.
// ─────────────────────────────────────────────────────────
function useTheme() {
  // Read saved pref synchronously so no flash — but default to light
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('eboard-theme');
    // Only honour 'dark' if explicitly saved — never read system pref
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('eboard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = useCallback(() => setIsDark(p => !p), []);
  return { isDark, toggle };
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
// TOOLTIP  (collapsed mode)
// ─────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative">
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[300]',
          'rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold whitespace-nowrap',
          // Light: dark tooltip  |  Dark: lighter tooltip
          'bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100',
          'border border-white/10 shadow-xl',
          // Animation
          'opacity-0 translate-x-1.5 scale-95',
          'group-hover/tip:opacity-100 group-hover/tip:translate-x-0 group-hover/tip:scale-100',
          'transition-all duration-150',
        )}
      >
        {label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900 dark:border-r-gray-700" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────────────────
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 mx-1.5 h-px bg-gray-200 dark:bg-gray-800" />;
  }
  return (
    <p className="px-3 pt-4 pb-1 text-[9px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-gray-600 select-none">
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

  const inner = (
    <Link href={item.href}>
      <div
        className={cn(
          // Base
          'group relative flex items-center gap-2.5 rounded-xl cursor-pointer select-none',
          'transition-all duration-150',
          // Sizing
          collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
          // Active vs idle
          isActive
            ? [
                'bg-gradient-to-r from-indigo-600 to-blue-700',
                'text-white shadow-md shadow-indigo-500/20',
              ]
            : [
                'text-gray-600 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-800/70',
                'hover:text-gray-900 dark:hover:text-gray-100',
              ],
        )}
      >
        {/* ── Left accent bar (active, expanded only) ── */}
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-0.5 rounded-r-full bg-white/60" />
        )}

        {/* ── Icon ── */}
        <span className="relative shrink-0 flex items-center justify-center">
          <Icon
            className={cn(
              'h-[15px] w-[15px] transition-colors duration-150',
              isActive
                ? 'text-white'
                : 'text-gray-400 dark:text-gray-500 group-hover:text-indigo-500',
            )}
          />
          {/* Collapsed badge dot — shown as red pill on icon */}
          {collapsed && item.badge && item.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-950">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </span>

        {/* ── Label + badge (expanded) ── */}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[12.5px] font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span
                className={cn(
                  'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5',
                  'text-[9px] font-bold',
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}

        {collapsed && <span className="sr-only">{item.label}</span>}
      </div>
    </Link>
  );

  return collapsed ? <Tooltip label={item.label}>{inner}</Tooltip> : inner;
}

// ─────────────────────────────────────────────────────────
// MAIN SIDEBAR
// ─────────────────────────────────────────────────────────
export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();

  // ── Collapsed state — persisted in localStorage ─────────
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // ── User menu ────────────────────────────────────────────
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef as React.RefObject<HTMLElement>, () => setUserMenuOpen(false));

  // ── User — read during initialization, not in useEffect ───
  const [mounted] = useState(true);
  const [user] = useState<ReturnType<typeof authService.getUser>>(() => {
    try { return authService.getUser(); } catch { return null; }
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  // ── ⌘K / Ctrl+K — expand sidebar and focus search ───────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCollapsed(false);
        // Dispatch a custom event so Topbar search can also react
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
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        // Background
        'bg-white dark:bg-gray-950',
        // Border
        'border-r border-gray-200 dark:border-gray-800',
        // Shadow — subtle, doesn't bleed into page
        'shadow-[1px_0_0_rgba(0,0,0,0.04)] dark:shadow-none',
        // Width transition
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[248px]',
        // Mount fade
        mounted ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >

      {/* ══ LOGO BAR ══════════════════════════════════════════ */}
      <div
        className={cn(
          'flex h-[58px] shrink-0 items-center border-b border-gray-100 dark:border-gray-800',
          collapsed ? 'justify-center px-3' : 'justify-between px-4',
        )}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-[34px] w-[34px] shrink-0 rounded-[10px] overflow-hidden shadow-[0_4px_14px_rgba(79,70,229,0.4)]">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="E-Board"
              className="h-full w-full object-cover"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">
                E-Board
              </p>
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5 leading-none">
                MIS Portal
              </p>
            </div>
          )}
        </div>

        {/* Collapse button */}
        {!collapsed && (
          <button
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ══ EXPAND PILL (collapsed only) ═════════════════════ */}
      {collapsed && (
        <button
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className={cn(
            'absolute -right-3 top-[68px] z-50',
            'flex h-6 w-6 items-center justify-center rounded-full',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700 shadow-md',
            'text-gray-400 dark:text-gray-500',
            'hover:text-indigo-600 dark:hover:text-indigo-400',
            'hover:border-indigo-200 dark:hover:border-indigo-700',
            'transition-all',
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ══ MAIN NAV ══════════════════════════════════════════ */}
      <div
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-none',
          collapsed ? 'px-2 space-y-0.5' : 'px-2.5 space-y-0.5',
        )}
      >
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

      {/* ══ BOTTOM UTILITIES ══════════════════════════════════ */}
      <div
        className={cn(
          'border-t border-gray-100 dark:border-gray-800 pt-2 pb-1 shrink-0',
          collapsed ? 'px-2 space-y-0.5' : 'px-2.5 space-y-0.5',
        )}
      >
        {/* Theme toggle */}
        {collapsed ? (
          <Tooltip label={isDark ? 'Light Mode' : 'Dark Mode'}>
            <button
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
              className="w-full flex items-center justify-center rounded-xl p-2.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-500 dark:hover:text-amber-400 transition-all"
            >
              {isDark
                ? <Sun className="h-[15px] w-[15px]" />
                : <Moon className="h-[15px] w-[15px]" />}
            </button>
          </Tooltip>
        ) : (
          <button
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            className="group w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-amber-600 dark:hover:text-amber-400 transition-all"
          >
            {isDark
              ? <Sun className="h-[15px] w-[15px] shrink-0 text-amber-400" />
              : <Moon className="h-[15px] w-[15px] shrink-0 text-gray-400 group-hover:text-amber-500 transition-colors" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        {/* Settings / Help */}
        {bottomNav.map(item => (
          <NavLink
            key={item.href}
            item={item}
            isActive={location === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* ══ USER CARD ════════════════════════════════════════= */}
      <div
        ref={userMenuRef}
        className={cn(
          'border-t border-gray-100 dark:border-gray-800 shrink-0',
          collapsed ? 'px-2 py-2.5' : 'px-2.5 py-2.5',
        )}
      >
        {collapsed ? (
          /* Collapsed: just avatar with tooltip */
          <Tooltip label={`${fullName}  ·  ${roleName}`}>
            <button
              aria-label="User menu"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[11px] font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </Tooltip>
        ) : (
          /* Expanded: full user card with dropdown */
          <div className="relative">
            <button
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen(o => !o)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 border transition-all duration-150',
                userMenuOpen
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:border-gray-100 dark:hover:border-gray-800',
              )}
            >
              {/* Avatar + online dot */}
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-indigo-100 dark:ring-indigo-900/60">
                  <AvatarFallback className="text-[11px] font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-950" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate leading-none">
                  {fullName}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 leading-none">
                  {roleName}
                </p>
              </div>

              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200',
                  userMenuOpen && 'rotate-180',
                )}
              />
            </button>

            {/* ── User dropdown ─────────────────────────────── */}
            {userMenuOpen && (
              <div
                role="menu"
                className={cn(
                  'absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden',
                  'bg-white dark:bg-gray-900',
                  'rounded-2xl border border-gray-200 dark:border-gray-700/80',
                  'shadow-[0_-16px_40px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]',
                  'dark:shadow-[0_-16px_50px_rgba(0,0,0,0.5)]',
                  'animate-in slide-in-from-bottom-2 fade-in duration-150',
                )}
              >
                {/* Gradient header — matches screenshot exactly */}
                <div className="px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-indigo-100 dark:ring-indigo-900">
                      <AvatarFallback className="text-sm font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{fullName}</p>
                      <p className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">{user?.email ?? '—'}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {/* Role chip */}
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-700 px-2 py-0.5">
                          <Building2 className="h-2.5 w-2.5 text-indigo-500" />
                          <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                            {roleName}
                          </span>
                        </span>
                        {/* Online chip */}
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">Online</span>
                        </span>
                        {/* Org code if present */}
                        {user?.orgCode && (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-mono px-2 py-0.5">
                            #{user.orgCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5 space-y-0.5">
                  {([
                    { icon: UserCog,   label: 'Profile Settings',   href: '/settings/profile' },
                    { icon: Building2, label: 'Organization',       href: '/settings/org' },
                    { icon: Lock,      label: 'Security & Privacy', href: '/settings/security' },
                    { icon: Bell,      label: 'Notifications',      href: '/settings/notifications' },
                  ] as const).map(({ icon: Icon, label, href }) => (
                    <Link key={href} href={href}>
                      <div
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-[9px] text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
                      >
                        <Icon className="h-[14px] w-[14px] text-gray-400 dark:text-gray-500 shrink-0" />
                        {label}
                      </div>
                    </Link>
                  ))}

                  <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />

                  <button
                    role="menuitem"
                    onClick={() => {
                      authService.logout();
                      setUserMenuOpen(false);
                      window.location.href = '/auth/signin';
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-[9px] text-[12px] font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-[14px] w-[14px] shrink-0" />
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