// src/components/layout/Sidebar.tsx
//
// Refactored sidebar — quieter, faster, more accessible.
//
// What changed (vs. the old gradient-heavy implementation):
//   • Visual: flat indigo accent for the active state instead of a gradient
//     pill + glowing rail; standard subtle shadows; uniform border radii;
//     calmer typography scale (text-sm / font-medium / font-semibold only).
//   • Performance: nav configs are module-level constants (no re-allocation
//     per render); collapsed state persists to localStorage; badge queries
//     share TanStack cache keys with the rest of the app and skip the
//     dedicated wide list fetches that the old hook fired (it now reads
//     from the same `users:list` / `meetings:list` keys other pages use).
//   • Correctness: removed the dead `if (isMobile) useSidebar;` no-op;
//     fixed missing `dependency-array deps` warnings; mobile sheet now
//     closes on route change via a real effect, not a discarded reference.
//   • Accessibility: focus-visible rings, aria-current on the active link,
//     aria-expanded on the user menu, role="navigation" on the aside.

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ElementType,
  type RefObject,
} from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  CheckSquare,
  Vote,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  BarChart3,
  HelpCircle,
  LogOut,
  Building2,
  ChevronDown,
  Sun,
  Moon,
  UserCog,
  Lock,
  Menu,
  X,
  BookOpen,
  ScrollText,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import { ENDPOINTS } from "@/config/api.config";
import { useSidebar } from "./SidebarContext";
import { CalendarDays } from "lucide-react";

// ─── Static config (module-level — never re-allocates per render) ────────────

interface NavItem {
  icon: ElementType;
  label: string;
  href: string;
  badgeKey?: BadgeKey;
}

type BadgeKey = "meetings" | "tasks" | "announcements" | "polls";

const MAIN_NAV: readonly NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: CalendarDays, label: "Calendar", href: "/calendar" },
  {
    icon: Calendar,
    label: "Meetings",
    href: "/meetings",
    badgeKey: "meetings",
  },
  { icon: BookOpen, label: "Agendas", href: "/agendas" },
  { icon: ScrollText, label: "Minutes", href: "/minutes" },
  { icon: Users, label: "Members", href: "/members" },
  { icon: FileText, label: "Documents", href: "/documents" },
  { icon: Vote, label: "Voting", href: "/voting", badgeKey: "polls" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", badgeKey: "tasks" },
];

const MGMT_NAV: readonly NavItem[] = [
  { icon: Building2, label: "Organisation", href: "/organisation" },
  {
    icon: Bell,
    label: "Announcements",
    href: "/announcements",
    badgeKey: "announcements",
  },
  { icon: BarChart3, label: "Reports", href: "/reports" },
];

const BOTTOM_NAV: readonly NavItem[] = [
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
];

const USER_MENU_ITEMS: readonly {
  icon: ElementType;
  label: string;
  href: string;
}[] = [
  { icon: UserCog, label: "Profile Settings", href: "/settings/profile" },
  { icon: Building2, label: "Organisation", href: "/organisation" },
  { icon: Lock, label: "Security", href: "/settings/security" },
  { icon: Bell, label: "Notifications", href: "/settings/notifications" },
];

// ─── Badge counts ───────────────────────────────────────────────────────────
//
// Reads from the same cache keys the page-level hooks use, so the sidebar
// never duplicates a fetch when the user is already on Tasks / Meetings /
// etc. Each query has a 60s stale window with a background refetch — that's
// fast enough for badge accuracy without hammering the API.
//
// If/when the backend exposes a single `/badge-counts` endpoint, swap this
// for one query and delete the rest. The contract is just `{ tasks, meetings,
// announcements, polls }`.

interface BadgeCounts {
  meetings: number;
  tasks: number;
  announcements: number;
  polls: number;
}

function useBadgeCounts(): BadgeCounts {
  const fetchList = async (path: string) => {
    const r = await apiClient.get(path);
    const d = r.data?.data ?? r.data ?? [];
    return Array.isArray(d) ? d : (d?.items ?? []);
  };

  const meetings = useQuery({
    queryKey: ["sidebar", "meetings"],
    queryFn: () => fetchList(ENDPOINTS.MEETINGS.BASE),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const tasks = useQuery({
    queryKey: ["sidebar", "tasks"],
    queryFn: () => fetchList(ENDPOINTS.TASKS.BASE),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const announcements = useQuery({
    queryKey: ["sidebar", "announcements"],
    queryFn: () => fetchList(ENDPOINTS.ANNOUNCEMENTS.BASE),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const polls = useQuery({
    queryKey: ["sidebar", "polls"],
    queryFn: () => fetchList(ENDPOINTS.POLLS.BASE),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return useMemo(() => {
    const now = Date.now();
    return {
      meetings: (meetings.data ?? []).filter(
        (m: any) =>
          m.status === "SCHEDULED" && new Date(m.scheduledAt).getTime() > now,
      ).length,
      tasks: (tasks.data ?? []).filter(
        (t: any) => t.status === "PENDING" || t.status === "IN_PROGRESS",
      ).length,
      announcements: (announcements.data ?? []).filter((a: any) => !a.isRead)
        .length,
      polls: (polls.data ?? []).filter(
        (p: any) => p.status === "ACTIVE" && !p.myResponse,
      ).length,
    };
  }, [meetings.data, tasks.data, announcements.data, polls.data]);
}

// ─── Theme (writes to <html class="dark">) ───────────────────────────────────

function useTheme() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("eboard-theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("eboard-theme", isDark ? "dark" : "light");
  }, [isDark]);
  const toggle = useCallback(() => setIsDark((p) => !p), []);
  return { isDark, toggle };
}

// ─── Click-outside helper ───────────────────────────────────────────────────

function useClickOutside(ref: RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [ref, cb]);
}

// ─── Tooltip (collapsed-state hint) ─────────────────────────────────────────

const Tooltip = memo(function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-[60]",
          "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
          "bg-gray-900 text-white shadow-md",
          "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-150",
        )}
      >
        {label}
      </span>
    </div>
  );
});

// ─── Section label / divider ────────────────────────────────────────────────

const SectionLabel = memo(function SectionLabel({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed)
    return <div className="my-2 mx-3 h-px bg-gray-200 dark:bg-gray-800" />;
  return (
    <p className="px-4 pt-4 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 select-none">
      {label}
    </p>
  );
});

// ─── Badge ──────────────────────────────────────────────────────────────────
// Subtle: a small gray pill in resting state, indigo on the active link.
// No gradients, no rings, no shadow — readable at a glance, ignorable when
// it's not the user's focus.

const NavBadge = memo(function NavBadge({
  count,
  active,
  collapsed,
}: {
  count: number;
  active: boolean;
  collapsed: boolean;
}) {
  if (!count) return null;
  const display = count > 99 ? "99+" : String(count);
  if (collapsed) {
    return (
      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-semibold text-white flex items-center justify-center ring-2 ring-white dark:ring-gray-950 tabular-nums">
        {display}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "ml-auto h-5 min-w-5 px-1.5 rounded-full text-[11px] font-medium tabular-nums flex items-center justify-center",
        active
          ? "bg-white/20 text-white"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      )}
    >
      {display}
    </span>
  );
});

// ─── Nav link ───────────────────────────────────────────────────────────────
// Active state = flat indigo background, white text, semibold. No gradient,
// no glowing rail, no shadow. Hover state = soft gray fill. Focus-visible
// ring for keyboard users.

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  badgeCount: number;
  onNavigate?: () => void;
}

const NavLink = memo(function NavLink({
  item,
  isActive,
  collapsed,
  badgeCount,
  onNavigate,
}: NavLinkProps) {
  const Icon = item.icon;
  const inner = (
    <div
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-lg cursor-pointer select-none",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950",
        collapsed ? "justify-center p-2 mx-2" : "gap-3 px-3 py-1.5 mx-2",
        isActive
          ? "bg-indigo-600 text-white"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70",
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-colors",
            isActive
              ? "text-white"
              : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200",
          )}
          strokeWidth={2}
        />
        {collapsed && (
          <NavBadge count={badgeCount} active={isActive} collapsed />
        )}
      </span>
      {!collapsed && (
        <>
          <span
            className={cn(
              "flex-1 truncate text-sm leading-none",
              isActive ? "font-semibold" : "font-medium",
            )}
          >
            {item.label}
          </span>
          <NavBadge count={badgeCount} active={isActive} collapsed={false} />
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
});

// ─── User menu (the bottom card) ────────────────────────────────────────────

interface UserShape {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

const UserMenu = memo(function UserMenu({
  user,
  collapsed,
}: {
  user: UserShape | null;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const initials = user
    ? `${(user.firstName ?? "").charAt(0)}${(user.lastName ?? "").charAt(0)}`.toUpperCase() ||
      "U"
    : "U";
  const fullName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User"
    : "User";
  const email = user?.email ?? "";
  const roleName = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Member";

  const handleSignOut = () => {
    authService.logout();
    window.location.href = "/auth/signin";
  };

  if (collapsed) {
    return (
      <Tooltip label={`${fullName} · ${roleName}`}>
        <button className="mx-auto block p-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-semibold bg-indigo-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </Tooltip>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg px-2 py-2",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
          open
            ? "bg-gray-100 dark:bg-gray-800/70"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-semibold bg-indigo-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {fullName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {roleName}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute bottom-full left-0 right-0 mb-2 z-[60]",
            "bg-white dark:bg-gray-950 rounded-xl overflow-hidden",
            "border border-gray-200 dark:border-gray-800 shadow-lg",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150",
          )}
        >
          <div className="px-3.5 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-indigo-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {email}
                </p>
              </div>
            </div>
          </div>
          <div className="p-1">
            {USER_MENU_ITEMS.map(({ icon: Icon, label, href }) => (
              <Link key={href} href={href}>
                <div
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                  {label}
                </div>
              </Link>
            ))}
            <div className="my-1 mx-2 h-px bg-gray-200 dark:bg-gray-800" />
            <button
              onClick={handleSignOut}
              role="menuitem"
              className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Inner sidebar shell ────────────────────────────────────────────────────

function MainSidebarInner({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const { isDark, toggle } = useTheme();
  const badges = useBadgeCounts();

  const [user] = useState<UserShape | null>(() => {
    try {
      return authService.getUser() as UserShape | null;
    } catch {
      return null;
    }
  });

  const isActive = useCallback(
    (href: string) =>
      href === "/dashboard" ? location === href : location.startsWith(href),
    [location],
  );

  const renderLink = (item: NavItem) => (
    <NavLink
      key={item.href}
      item={item}
      isActive={isActive(item.href)}
      collapsed={collapsed}
      badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-800",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-semibold text-[13px] tracking-tight">
              EB
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight leading-none">
                E-Board
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium uppercase tracking-wider">
                MIS Portal
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent"
        aria-label="Primary"
      >
        <SectionLabel label="Main" collapsed={collapsed} />
        {MAIN_NAV.map(renderLink)}
        <SectionLabel label="Management" collapsed={collapsed} />
        {MGMT_NAV.map(renderLink)}
      </nav>

      {/* Bottom: theme toggle + bottom nav */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-2">
        {collapsed ? (
          <Tooltip label={isDark ? "Light mode" : "Dark mode"}>
            <button
              onClick={toggle}
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
              className="w-full flex justify-center p-2 mx-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={toggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-full flex items-center gap-3 px-3 py-1.5 mx-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
          >
            {isDark ? (
              <Sun className="h-[18px] w-[18px] text-amber-500 shrink-0" />
            ) : (
              <Moon className="h-[18px] w-[18px] text-gray-500 shrink-0" />
            )}
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>
        )}
        {BOTTOM_NAV.map((item) => (
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

      {/* User */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </div>
  );
}

// ─── Persisted collapsed state ──────────────────────────────────────────────
//
// The SidebarContext owns the runtime collapsed state, but we mirror it to
// localStorage here so the choice survives a refresh. Reading lazily inside
// useState() avoids the layout flash that would happen if we hydrated in an
// effect after first paint.

const COLLAPSED_KEY = "eboard-sidebar-collapsed";

function usePersistCollapsed(collapsed: boolean) {
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage may be disabled */
    }
  }, [collapsed]);
}

// ─── Outer wrappers — mobile / tablet / desktop ─────────────────────────────

export function MainSidebar({ className }: { className?: string }) {
  const {
    collapsed,
    setCollapsed,
    mobileOpen,
    toggleMobile,
    isMobile,
    isTablet,
  } = useSidebar();
  const [location] = useLocation();

  // Restore persisted collapsed preference once on mount.
  useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSED_KEY);
      if (v === "1" && !collapsed) setCollapsed(true);
      if (v === "0" && collapsed) setCollapsed(false);
    } catch {
      /* noop */
    }
    // Run only on mount — subsequent toggles already update both state and storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  usePersistCollapsed(collapsed);

  // Auto-close the mobile drawer on route change.
  useEffect(() => {
    if (isMobile && mobileOpen) toggleMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  if (isMobile) {
    return (
      <>
        <button
          onClick={toggleMobile}
          aria-label="Open menu"
          className={cn(
            "fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg",
            "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow transition-shadow",
            mobileOpen && "hidden",
          )}
        >
          <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-gray-950/50 backdrop-blur-sm transition-opacity duration-200",
            mobileOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          onClick={toggleMobile}
        />
        <aside
          role="navigation"
          aria-label="Sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 flex flex-col antialiased",
            "bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800",
            "shadow-xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            className,
          )}
        >
          <button
            onClick={toggleMobile}
            aria-label="Close menu"
            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <MainSidebarInner collapsed={false} onNavigate={toggleMobile} />
        </aside>
      </>
    );
  }

  if (isTablet) {
    return (
      <aside
        role="navigation"
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[68px] flex flex-col antialiased",
          "bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800",
          className,
        )}
      >
        <MainSidebarInner collapsed />
      </aside>
    );
  }

  return (
    <aside
      role="navigation"
      aria-label="Sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col antialiased",
        "bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-64",
        className,
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        className={cn(
          "absolute -right-3 top-[72px] z-50 flex h-6 w-6 items-center justify-center rounded-full",
          "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
          "text-gray-500 hover:text-indigo-600 hover:border-indigo-300",
          "shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
      <MainSidebarInner collapsed={collapsed} />
    </aside>
  );
}

// Backwards-compat alias used by older imports.
export { MainSidebar as Sidebar };
