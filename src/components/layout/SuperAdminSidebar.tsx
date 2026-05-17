// src/components/layout/SuperAdminSidebar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Users, Building2, UserPlus,
  ChevronLeft, ChevronRight, Settings, LogOut,
  Sun, Moon, Shield, ChevronDown, DollarSign,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Administration',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',      href: '/super-admin' },
      { icon: Users,           label: 'Users',           href: '/super-admin/users' },
      { icon: Building2,       label: 'Organisations',   href: '/super-admin/organisations' },
      { icon: UserPlus,        label: 'Create Admin',    href: '/super-admin/create-admin' },
    ],
  },
  {
    label: 'Platform Data',
    items: [
      // { icon: Calendar,  label: 'Meetings',       href: '/super-admin/meetings' },
      // { icon: FileText,  label: 'Documents',      href: '/super-admin/documents' },
      // { icon: ListTodo,  label: 'Tasks',           href: '/super-admin/tasks' },
      // { icon: Vote,      label: 'Polls / Voting', href: '/super-admin/polls' },
      // { icon: Megaphone, label: 'Announcements',  href: '/super-admin/announcements' },
      { icon: DollarSign,label: 'Finance',         href: '/super-admin/finance' },
    ],
  },
];

const bottomNav: NavItem[] = [
  { icon: Settings, label: 'Settings', href: '/super-admin/settings' },
];

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eboard-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('eboard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = useCallback(() => setIsDark(p => !p), []);
  return { isDark, toggle };
}

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative">
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[300]',
          'rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold whitespace-nowrap',
          'bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100',
          'border border-white/10 shadow-xl',
          'opacity-0 translate-x-1.5 scale-95',
          'group-hover/tip:opacity-100 group-hover/tip:translate-x-0 group-hover/tip:scale-100',
          'transition-all duration-150',
        )}
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900 dark:border-r-gray-700" />
      </div>
    </div>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 mx-1.5 h-px bg-gray-200 dark:bg-gray-800" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[9px] font-black uppercase tracking-[0.16em] text-gray-400 dark:text-gray-600 select-none">
      {label}
    </p>
  );
}

function NavLink({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const inner = (
    <Link href={item.href}>
      <div
        className={cn(
          'group relative flex items-center gap-2.5 rounded-xl cursor-pointer select-none transition-all duration-150',
          collapsed ? 'justify-center p-2.5' : 'px-3 py-2',
          isActive
            ? 'bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-500/20'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100',
        )}
      >
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-0.5 rounded-r-full bg-white/60" />
        )}
        <span className="relative shrink-0 flex items-center justify-center">
          <Icon className={cn('h-[15px] w-[15px] transition-colors duration-150', isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-violet-500')} />
          {collapsed && item.badge && item.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-950">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[12.5px] font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className={cn('flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold', isActive ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300')}>
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

export function SuperAdminSidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sa-sidebar-collapsed') === 'true';
  });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef as React.RefObject<HTMLElement>, () => setUserMenuOpen(false));

  const [mounted] = useState(true);
  const [user] = useState<ReturnType<typeof authService.getUser>>(() => {
    try { return authService.getUser(); } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem('sa-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'SA';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Super Admin';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        'bg-white dark:bg-gray-950',
        'border-r border-gray-200 dark:border-gray-800',
        'shadow-[1px_0_0_rgba(0,0,0,0.04)] dark:shadow-none',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[248px]',
        mounted ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-[58px] shrink-0 items-center border-b border-gray-100 dark:border-gray-800', collapsed ? 'justify-center px-3' : 'justify-between px-4')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-[34px] w-[34px] shrink-0 rounded-[10px] bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.4)]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">E-Board</p>
              <p className="text-[10px] font-medium text-violet-500 dark:text-violet-400 mt-0.5 leading-none">Super Admin</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button aria-label="Collapse sidebar" onClick={() => setCollapsed(true)} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {collapsed && (
        <button aria-label="Expand sidebar" onClick={() => setCollapsed(false)} className={cn('absolute -right-3 top-[68px] z-50 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-700 transition-all')}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Nav */}
      <div className={cn('flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-none', collapsed ? 'px-2 space-y-0.5' : 'px-2.5 space-y-0.5')}>
        {navSections.map(section => (
          <div key={section.label}>
            <SectionLabel label={section.label} collapsed={collapsed} />
            {section.items.map(item => (
              <NavLink key={item.href} item={item} isActive={location === item.href || (item.href !== '/super-admin' && location.startsWith(item.href))} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className={cn('border-t border-gray-100 dark:border-gray-800 pt-2 pb-1 shrink-0', collapsed ? 'px-2 space-y-0.5' : 'px-2.5 space-y-0.5')}>
        {collapsed ? (
          <Tooltip label={isDark ? 'Light Mode' : 'Dark Mode'}>
            <button onClick={toggleTheme} className="w-full flex items-center justify-center rounded-xl p-2.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-500 dark:hover:text-amber-400 transition-all">
              {isDark ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
            </button>
          </Tooltip>
        ) : (
          <button onClick={toggleTheme} className="group w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-amber-600 dark:hover:text-amber-400 transition-all">
            {isDark ? <Sun className="h-[15px] w-[15px] shrink-0 text-amber-400" /> : <Moon className="h-[15px] w-[15px] shrink-0 text-gray-400 group-hover:text-amber-500 transition-colors" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}
        {bottomNav.map(item => (
          <NavLink key={item.href} item={item} isActive={location === item.href} collapsed={collapsed} />
        ))}
      </div>

      {/* User card */}
      <div ref={userMenuRef} className={cn('border-t border-gray-100 dark:border-gray-800 shrink-0', collapsed ? 'px-2 py-2.5' : 'px-2.5 py-2.5')}>
        {collapsed ? (
          <Tooltip label={`${fullName}  ·  Super Admin`}>
            <button className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[11px] font-extrabold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </Tooltip>
        ) : (
          <div className="relative">
            <button onClick={() => setUserMenuOpen(o => !o)} className={cn('w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 border transition-all duration-150', userMenuOpen ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/50' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:border-gray-100 dark:hover:border-gray-800')}>
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-violet-100 dark:ring-violet-900/60">
                  <AvatarFallback className="text-[11px] font-extrabold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-950" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate leading-none">{fullName}</p>
                <p className="text-[10px] text-violet-500 dark:text-violet-400 truncate mt-0.5 leading-none">Super Admin</p>
              </div>
              <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div role="menu" className={cn('absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden', 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/80', 'shadow-[0_-16px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-16px_50px_rgba(0,0,0,0.5)]', 'animate-in slide-in-from-bottom-2 fade-in duration-150')}>
                <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{fullName}</p>
                  <p className="text-[10.5px] text-gray-500 dark:text-gray-400">{user?.email ?? '—'}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/60 border border-violet-200 dark:border-violet-700 px-2 py-0.5 mt-1.5">
                    <Shield className="h-2.5 w-2.5 text-violet-500" />
                    <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300">Super Admin</span>
                  </span>
                </div>
                <div className="p-1.5">
                  <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
                  <button
                    role="menuitem"
                    onClick={() => { authService.logout(); setUserMenuOpen(false); window.location.href = '/auth/signin'; }}
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
