// src/components/layout/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Calendar, Users, FileText,
  CheckSquare, Vote, DollarSign, Settings,
  ChevronLeft, ChevronRight, Bell, BarChart3,
  HelpCircle, LogOut, Building2, ChevronDown, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',     href: '/' },
  { icon: Calendar,        label: 'Meetings',      href: '/meetings',      badge: 2 },
  { icon: Users,           label: 'Members',       href: '/members' },
  { icon: FileText,        label: 'Documents',     href: '/documents' },
  { icon: Vote,            label: 'Voting',        href: '/voting',        badge: 1 },
  { icon: CheckSquare,     label: 'Tasks',         href: '/tasks',         badge: 5 },
  { icon: DollarSign,      label: 'Finance',       href: '/finance' },
  { icon: Bell,            label: 'Announcements', href: '/announcements', badge: 3 },
  { icon: BarChart3,       label: 'Reports',       href: '/reports' },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings,   label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help',     href: '/help' },
];

/* ── Tooltip (collapsed state) ── */
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative flex items-center">
      {children}
      <div className={cn(
        'pointer-events-none absolute left-full ml-3.5 z-50',
        'rounded-lg bg-gray-800 px-2.5 py-1.5',
        'text-[11px] font-semibold text-white whitespace-nowrap',
        'shadow-xl border border-white/10',
        'opacity-0 translate-x-2 scale-95',
        'group-hover/tip:opacity-100 group-hover/tip:translate-x-0 group-hover/tip:scale-100',
        'transition-all duration-200',
      )}>
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-800" />
      </div>
    </div>
  );
}

/* ── NavLink ── */
function NavLink({
  item, isActive, collapsed,
}: {
  item: NavItem; isActive: boolean; collapsed: boolean;
}) {
  const Icon = item.icon;

  const inner = (
    <Link href={item.href}>
      <div className={cn(
        'group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium',
        'transition-all duration-150 cursor-pointer select-none',
        isActive
          ? 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-500/25'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        collapsed && 'justify-center px-0',
      )}>
        {/* active left accent */}
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-white/55" />
        )}

        {/* icon */}
        <span className={cn(
          'relative flex shrink-0 items-center justify-center transition-colors duration-150',
          isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600',
        )}>
          <Icon className="h-[15px] w-[15px]" />
          {/* collapsed badge dot */}
          {collapsed && item.badge && item.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white">
              {item.badge}
            </span>
          )}
        </span>

        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                isActive
                  ? 'bg-white/25 text-white'
                  : 'bg-indigo-100 text-indigo-600',
              )}>
                {item.badge}
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

/* ── Section label ── */
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1.5 mx-2 h-px bg-gray-200" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-gray-400">
      {label}
    </p>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const user = authService.getUser();
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const roleName = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Member';

  const mainNav  = navItems.slice(0, 6);
  const adminNav = navItems.slice(6);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        'bg-white border-r border-gray-200',
        'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.06)]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]',
        !mounted && 'opacity-0',
        mounted  && 'opacity-100',
        className,
      )}
    >
      {/* ── Logo ── */}
      <div className={cn(
        'flex h-16 items-center border-b border-gray-100 shrink-0',
        collapsed ? 'justify-center' : 'justify-between px-4',
      )}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-600 to-blue-700 shadow-[0_4px_12px_rgba(79,70,229,0.35)] overflow-hidden">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="E-Board"
              className="h-full w-full object-cover"
            />
          </div>
          {!collapsed && (
            <div className="leading-none">
              <p className="font-bold text-gray-900 text-sm tracking-tight">E-Board</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Portal</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-[72px] z-50 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Search (expanded only) ── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 cursor-pointer hover:border-indigo-200 transition-colors group">
            <Search className="h-3 w-3 text-gray-400 group-hover:text-indigo-400 transition-colors" />
            <span className="flex-1 text-[11px] text-gray-400">Search...</span>
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-gray-300">⌘K</kbd>
          </div>
        </div>
      )}

      {/* ── Scrollable nav ── */}
      <div className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5 scrollbar-none',
        collapsed ? 'px-2' : 'px-2.5',
      )}>
        <SectionLabel label="Main" collapsed={collapsed} />
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={location === item.href} collapsed={collapsed} />
        ))}

        <SectionLabel label="Management" collapsed={collapsed} />
        {adminNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={location === item.href} collapsed={collapsed} />
        ))}
      </div>

      {/* ── Bottom nav ── */}
      <div className={cn(
        'border-t border-gray-100 pt-2 pb-2 space-y-0.5 shrink-0',
        collapsed ? 'px-2' : 'px-2.5',
      )}>
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} isActive={location === item.href} collapsed={collapsed} />
        ))}
      </div>

      {/* ── User card ── */}
      <div className="border-t border-gray-100 p-2.5 shrink-0">
        {collapsed ? (
          <Tooltip label={`${fullName} · ${roleName}`}>
            <button className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </Tooltip>
        ) : (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-150 border border-transparent',
                'hover:bg-gray-50',
                userMenuOpen && 'bg-gray-50 border-gray-100',
              )}
            >
              {/* Avatar + online indicator */}
              <div className="relative shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-indigo-100">
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-none mb-0.5">{fullName}</p>
                <p className="text-[10px] text-gray-400 truncate leading-none">{roleName}</p>
              </div>

              <ChevronDown className={cn(
                'h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform duration-200',
                userMenuOpen && 'rotate-180',
              )} />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className={cn(
                'absolute bottom-full left-0 right-0 mb-2 z-50',
                'bg-white rounded-xl border border-gray-200',
                'shadow-[0_-8px_32px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]',
                'overflow-hidden',
                'animate-in slide-in-from-bottom-2 fade-in duration-150',
              )}>
                {/* Header */}
                <div className="px-3.5 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">{fullName}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {/* Role chip */}
                    <span className="flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 px-2 py-0.5">
                      <Building2 className="h-2.5 w-2.5 text-indigo-500" />
                      <span className="text-[9px] font-semibold text-indigo-700">{roleName}</span>
                    </span>
                    {/* Online chip */}
                    <span className="flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      <span className="text-[9px] font-semibold text-green-700">Online</span>
                    </span>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <Link href="/settings">
                    <div
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-3.5 w-3.5 text-gray-400" />
                      Account Settings
                    </div>
                  </Link>

                  <div className="my-1 h-px bg-gray-100 mx-1" />

                  <button
                    onClick={() => {
                      authService.logout();
                      setUserMenuOpen(false);
                      window.location.href = '/auth/signin';
                    }}
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
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