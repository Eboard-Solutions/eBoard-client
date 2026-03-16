// src/components/layout/Topbar.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Bell, Plus, Search, Moon, Sun,
  Calendar, CheckSquare, Vote, User,
  LogOut, Settings, X, Inbox,
  Check, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import { useNotifications, useUnreadNotificationsCount } from '@/hooks/api/useNotifications';
import type { Notification } from '@/types/api.types';

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/** Returns e.g. "2h ago", "just now", "3d ago" */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec  = Math.floor(diff / 1000);
  if (sec < 60)  return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  const day = Math.floor(hr  / 24);
  if (day < 7)   return `${day}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Notification icon colour by type */
function notifDot(type?: string): string {
  switch (type) {
    case 'meeting':      return 'bg-indigo-500';
    case 'task':         return 'bg-amber-500';
    case 'vote':         return 'bg-rose-500';
    case 'announcement': return 'bg-emerald-500';
    default:             return 'bg-blue-500';
  }
}

// ─────────────────────────────────────────────────────────
// THEME SYNC HOOK
// Reads / writes the same 'eboard-theme' key the Sidebar uses.
// Default is light (ignores system preference unless already saved).
// ─────────────────────────────────────────────────────────
function useThemeSync() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eboard-theme') === 'dark';
  });

  useEffect(() => {
    // Keep in sync if Sidebar toggled the class externally
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('eboard-theme', next ? 'dark' : 'light');
    setIsDark(next);
  }, []);

  return { isDark, toggle };
}

// ─────────────────────────────────────────────────────────
// NOTIFICATION SKELETON
// ─────────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div className="px-4 py-3 space-y-1.5 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-700 mt-1.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TOPBAR
// ─────────────────────────────────────────────────────────
interface TopbarProps {
  sidebarCollapsed?: boolean;
}

export function Topbar({ sidebarCollapsed = false }: TopbarProps) {
  const [, setLocation] = useLocation();
  const { isDark, toggle: toggleDarkMode } = useThemeSync();

  // Scroll shadow
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = document.querySelector('main, [data-scroll-container]') ?? window;
    const onScroll = () => setScrolled((el as Window).scrollY > 4 || (el as Element).scrollTop > 4);
    (el as EventTarget).addEventListener('scroll', onScroll, { passive: true });
    return () => (el as EventTarget).removeEventListener('scroll', onScroll);
  }, []);

  // Search state
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    // Also respond to sidebar's custom event
    const sidebarHandler = () => {
      setTimeout(() => searchRef.current?.focus(), 320); // after sidebar expansion
    };
    window.addEventListener('eboard:focus-search', sidebarHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('eboard:focus-search', sidebarHandler);
    };
  }, []);

  // Notifications
  const { data: notificationsData, isLoading: notifsLoading } = useNotifications({ page: 1 });
  const { data: unreadCountData } = useUnreadNotificationsCount();

  const notificationsList: Notification[] = notificationsData?.items ?? [];
  const unreadCount: number =
    typeof unreadCountData === 'number'
      ? unreadCountData
      : notificationsList.filter(n => !n.isRead).length;

  // User — read after mount
  const [user] = useState<ReturnType<typeof authService.getUser>>(() => {
    try { return authService.getUser(); } catch { return null; }
  });

  if (!user) return null; // don't render topbar before auth resolves

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`;
  const roleName = user.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Member';

  const handleSignOut = async () => {
    try {
      if (user?.userId) {
        await authService.logout();
      } else {
        authService.clearAuth?.();
      }
      toast.success('Signed out successfully');
    } catch {
      authService.clearAuth?.();
      toast.error('Sign-out failed. You have been logged out locally.');
    }
    setLocation('/auth/signin');
  };

  const quickCreate = (type: 'meeting' | 'task' | 'poll' | 'announcement') => {
    const routes = {
      meeting:      '/meetings?action=create',
      task:         '/tasks?action=create',
      poll:         '/voting?action=create',
      announcement: '/announcements?action=create',
    };
    setLocation(routes[type]);
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-[58px]',
        'bg-white/95 dark:bg-gray-950/95',
        'backdrop-blur-md',
        'border-b border-gray-200 dark:border-gray-800',
        'transition-all duration-300 ease-in-out',
        // Dynamic left offset matches sidebar width
        sidebarCollapsed ? 'left-[68px]' : 'left-[248px]',
        // Scroll shadow
        scrolled
          ? 'shadow-[0_1px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.3)]'
          : 'shadow-none',
      )}
    >
      <div className="flex h-full items-center justify-between px-5 gap-4">

        {/* ══ SEARCH ════════════════════════════════════════ */}
        <div className="flex flex-1 items-center max-w-md">
          <div className={cn(
            'relative flex flex-1 items-center rounded-xl',
            'border border-gray-200 dark:border-gray-700/80',
            'bg-gray-50 dark:bg-gray-800/60',
            'focus-within:bg-white dark:focus-within:bg-gray-800',
            'focus-within:border-indigo-300 dark:focus-within:border-indigo-600/60',
            'focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]',
            'transition-all duration-200',
          )}>
            <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearchValue('')}
              placeholder="Search meetings, members, documents…"
              aria-label="Search"
              className={cn(
                'w-full h-[34px] bg-transparent pl-9 pr-16',
                'text-[13px] text-gray-700 dark:text-gray-300',
                'placeholder:text-gray-400 dark:placeholder:text-gray-600',
                'outline-none',
              )}
            />
            {/* Clear button */}
            {searchValue && (
              <button
                aria-label="Clear search"
                onClick={() => { setSearchValue(''); searchRef.current?.focus(); }}
                className="absolute right-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {/* ⌘K badge */}
            <kbd className="absolute right-2.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-1.5 py-0.5 font-mono text-[9px] text-gray-300 dark:text-gray-500 leading-none">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* ══ RIGHT ACTIONS ══════════════════════════════════ */}
        <div className="flex items-center gap-1.5">

          {/* Quick create */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
                aria-label="Quick create"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 dark:bg-gray-900 dark:border-gray-700">
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-2">
                Quick Create
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-gray-800" />
              {([
                { type: 'meeting',      icon: Calendar,     label: 'New Meeting',      shortcut: 'M' },
                { type: 'task',         icon: CheckSquare,  label: 'New Task',         shortcut: 'T' },
                { type: 'poll',         icon: Vote,         label: 'New Poll',         shortcut: 'P' },
                { type: 'announcement', icon: Bell,         label: 'New Announcement', shortcut: 'A' },
              ] as const).map(({ type, icon: Icon, label, shortcut }) => (
                <DropdownMenuItem
                  key={type}
                  onSelect={() => quickCreate(type)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                >
                  <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="flex-1">{label}</span>
                  <kbd className="text-[9px] font-mono text-gray-300 dark:text-gray-600 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5">
                    {shortcut}
                  </kbd>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark mode toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleDarkMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="h-8 w-8 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-500 dark:hover:text-amber-400 transition-all"
          >
            {isDark
              ? <Sun className="h-4 w-4 text-amber-400" />
              : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                className="relative h-8 w-8 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5 ring-2 ring-white dark:ring-gray-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 p-0 dark:bg-gray-900 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Notifications</p>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                    <Check className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[380px] overflow-y-auto">
                {notifsLoading ? (
                  <NotifSkeleton />
                ) : notificationsList.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <Inbox className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">All caught up!</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No new notifications right now.</p>
                  </div>
                ) : (
                  notificationsList.slice(0, 8).map(notif => (
                    <div
                      key={notif.id}
                      className={cn(
                        'group relative flex items-start gap-3 px-4 py-3 cursor-pointer',
                        'border-b border-gray-50 dark:border-gray-800/60 last:border-0',
                        'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                        !notif.isRead && 'bg-indigo-50/40 dark:bg-indigo-900/10',
                      )}
                    >
                      {/* Type dot */}
                      <span className={cn(
                        'mt-1.5 h-2 w-2 rounded-full shrink-0',
                        !notif.isRead ? notifDot((notif as any).type) : 'bg-gray-300 dark:bg-gray-700',
                      )} />

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[12.5px] leading-snug truncate',
                          !notif.isRead
                            ? 'font-semibold text-gray-900 dark:text-white'
                            : 'font-medium text-gray-700 dark:text-gray-300',
                        )}>
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
                          {notif.createdAt ? relativeTime(notif.createdAt) : ''}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.isRead && (
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notificationsList.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setLocation('/notifications')}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    View all notifications
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="User menu"
                className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Avatar className="h-8 w-8 ring-2 ring-indigo-100 dark:ring-indigo-900/60">
                  <AvatarImage src={(user as any)?.avatar} alt={fullName} />
                  <AvatarFallback className="text-[11px] font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                    {initials || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-950" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-0 dark:bg-gray-900 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-gray-700 shrink-0">
                    <AvatarImage src={(user as any)?.avatar} alt={fullName} />
                    <AvatarFallback className="text-xs font-extrabold bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                      {initials || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{fullName}</p>
                    <p className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-700 px-2 py-0.5">
                        <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">{roleName}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">Online</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <DropdownMenuItem
                  onSelect={() => setLocation('/profile')}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                >
                  <User className="h-[14px] w-[14px] text-gray-400 dark:text-gray-500 shrink-0" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setLocation('/settings')}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
                >
                  <Settings className="h-[14px] w-[14px] text-gray-400 dark:text-gray-500 shrink-0" />
                  Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator className="dark:bg-gray-800 my-1" />

                <DropdownMenuItem
                  onSelect={handleSignOut}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-semibold cursor-pointer text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600"
                >
                  <LogOut className="h-[14px] w-[14px] shrink-0" />
                  Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}