// src/pages/Dashboard.tsx
import { useState, useEffect, useRef } from 'react';
import { useMyMeetings } from '@/hooks/api/useMeetings';
import { useAnnouncements } from '@/hooks/api/useAnnouncements';
import { useDocuments } from '@/hooks/api/useDocuments';
import { useTasks } from '@/hooks/api/useTasks';
import { usePolls } from '@/hooks/api/usePolls';
import { useAnalytics, useFinanceOverview } from '@/hooks/api/useOverview';
import { usePendingOrganisations, useOrganisations } from '@/hooks/api/useOrganisations';
import { authService } from '@/api/services';
import { UpcomingMeetingsWidget } from '@/components/dashboard/UpcomingMeetingsWidget';
import { OpenActionsWidget } from '@/components/dashboard/OpenActionsWidget';
import { BudgetSummaryWidget } from '@/components/dashboard/BudgetSummaryWidget';
import { VotingOverviewWidget } from '@/components/dashboard/VotingOverviewWidget';
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget';
import { RecentDocumentsWidget } from '@/components/dashboard/RecentDocumentsWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';
import type { Poll } from '@/types';
import {
  Building2, CheckCircle, Clock, AlertTriangle,
  TrendingUp, BarChart3, Vote, ListTodo, Bell,
  Megaphone, Circle, Calendar,
} from 'lucide-react';

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const STYLES = `
@keyframes db-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes db-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes db-pulse-ring {
  0%   { transform: scale(1);    opacity: 0.5; }
  100% { transform: scale(1.6);  opacity: 0;   }
}
@keyframes db-count-in {
  from { opacity: 0; transform: scale(0.8) translateY(6px); }
  to   { opacity: 1; transform: scale(1)   translateY(0);   }
}
@keyframes db-slide-down {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);     }
}
@keyframes db-orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(12px, -10px) scale(1.06); }
  66%       { transform: translate(-8px, 8px) scale(0.96); }
}
.db-fade-up    { animation: db-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
.db-count-in   { animation: db-count-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
.db-slide-down { animation: db-slide-down 0.28s cubic-bezier(0.22,1,0.36,1) both; }
`;

function useStyleInject() {
  useEffect(() => {
    const id = 'dashboard-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = STYLES;
      document.head.appendChild(s);
    }
  }, []);
}

// ─── Data unwrap helpers ──────────────────────────────────────────────────────
function unwrapArray<T>(res: unknown): T[] {
  if (!res) return [];
  const r = res as Record<string, unknown>;
  const d = r?.data ?? r;
  if (Array.isArray(d)) return d as T[];
  const dd = (d as Record<string, unknown>);
  if (Array.isArray(dd?.data)) return dd.data as T[];
  if (Array.isArray(dd?.items)) return dd.items as T[];
  return [];
}

function isFutureMeeting(m: Record<string, unknown>): boolean {
  const raw = (m.scheduledDate ?? m.date) as string | undefined;
  if (!raw) return false;
  return new Date(raw) > new Date();
}

function transformMeeting(m: Record<string, unknown>) {
  const dateStr = ((m.scheduledDate ?? m.date) as string) ?? '';
  const startTime = (m.startTime as string) ?? '';
  let startAt = dateStr;
  if (dateStr && startTime) {
    const d = dateStr.split('T')[0];
    const t = startTime.includes('T') ? startTime.split('T')[1] : startTime;
    startAt = `${d}T${t}`;
  }
  return {
    id:          (m.meetingId ?? m.id ?? '') as string,
    title:       (m.title ?? 'Untitled') as string,
    startAt,
    endAt:       (m.endTime ?? '') as string,
    timezone:    'local',
    location:    ((m.location ?? m.onlineMeetingLink) ?? '') as string,
    isRecurring: (m.meetingFrequency as string) !== 'once',
    status:      ((m.meetingStatus ?? m.status ?? 'upcoming')) as 'upcoming' | 'completed' | 'cancelled',
    agenda:      [],
    attendees:   (m.attendees ?? []) as unknown[],
    createdBy:   ((m.creator as Record<string, unknown>)?.userId ?? '') as string,
    createdAt:   (m.createdAt ?? '') as string,
  };
}

function taskDueMs(t: Record<string, unknown>): string | undefined {
  const v = t.dueDate ?? t.deadline;
  if (!v) return undefined;
  if (typeof v === 'number') return new Date(v).toISOString();
  return v as string;
}

// ─── Announcement Bell dropdown ───────────────────────────────────────────────
interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned?: boolean;
  publishedAt?: number;
}

interface AnnouncementBellProps {
  announcements: Announcement[];
}

function AnnouncementBell({ announcements }: AnnouncementBellProps) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const unread = announcements.filter(a => !read.has(a.id)).length;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function markAllRead() {
    setRead(new Set(announcements.map(a => a.id)));
  }

  function fmtTime(ts?: number) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 hover:bg-muted transition-all duration-200 border border-border/60 hover:border-border shadow-sm hover:shadow"
        aria-label="Announcements"
      >
        <Bell style={{ width: 17, height: 17 }} />
        {unread > 0 && (
          <>
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
              style={{ minWidth: 18, height: 18, fontSize: 10, padding: '0 3px' }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
            <span
              className="absolute -top-1 -right-1 rounded-full bg-primary"
              style={{ minWidth: 18, height: 18, opacity: 0.4, animation: 'db-pulse-ring 1.6s ease-out infinite' }}
            />
          </>
        )}
      </button>

      {open && (
        <div className="db-slide-down absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-border/70 bg-popover shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/40">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold tracking-tight">Announcements</span>
              {unread > 0 && (
                <Badge className="h-5 text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20 border">
                  {unread} new
                </Badge>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-25" />
                <p className="text-sm font-medium">No announcements yet</p>
              </div>
            ) : (
              announcements.map((a) => {
                const isUnread = !read.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setRead(p => new Set([...p, a.id]))}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors ${isUnread ? 'bg-primary/[0.03]' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${isUnread ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold truncate">{a.title}</span>
                          {a.isPinned && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 shrink-0">Pinned</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.content}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1.5">{fmtTime(a.publishedAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {announcements.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
              <button className="w-full text-center text-xs text-primary hover:underline font-medium">
                View all announcements
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Welcome banner ───────────────────────────────────────────────────────────
function WelcomeBanner({ userName, subtitle, role }: {
  userName: string;
  subtitle: string;
  role: 'super' | 'admin' | 'user';
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const greetings = ['Good to see you', 'Welcome back', 'Ready to lead'];
  const greeting = greetings[tick % greetings.length];

  const gradients: Record<string, string> = {
    super: 'from-violet-500 via-purple-400 to-fuchsia-400',
    admin: 'from-blue-500 via-primary to-cyan-400',
    user:  'from-emerald-500 via-teal-400 to-cyan-400',
  };

  const orbColors: Record<string, { a: string; b: string }> = {
    super: { a: 'rgba(139,92,246,0.12)', b: 'rgba(217,70,239,0.08)' },
    admin: { a: 'rgba(59,130,246,0.12)', b: 'rgba(6,182,212,0.08)' },
    user:  { a: 'rgba(16,185,129,0.12)', b: 'rgba(6,182,212,0.08)' },
  };

  return (
    <div
      className="db-fade-up relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 sm:p-7"
      style={{ animationDelay: '0ms' }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: orbColors[role].a, animation: 'db-orb-float 8s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full blur-2xl"
          style={{ background: orbColors[role].b, animation: 'db-orb-float 11s ease-in-out infinite reverse' }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span
              key={tick}
              className="db-count-in text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
            >
              {greeting}
            </span>
            <span className="h-px w-8 bg-border/70 shrink-0" />
          </div>

          <h1
            className="text-3xl sm:text-[2.1rem] font-black tracking-tight leading-none"
            style={{
              background: `linear-gradient(125deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)/0.65) 35%, hsl(var(--primary)) 55%, hsl(var(--foreground)) 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'db-shimmer 5s linear infinite',
            }}
          >
            {userName?.split(' ')[0] ?? 'Welcome'}{' '}
            <span style={{ WebkitTextFillColor: 'hsl(var(--foreground))' }}>👋</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{subtitle}</p>
        </div>

        <LiveClock />
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="shrink-0 rounded-xl border border-border/60 bg-muted/40 px-5 py-3.5 text-center min-w-[120px] shadow-sm">
      <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  variant?: 'default' | 'warning' | 'success';
  delay?: number;
}

function StatCard({ title, value, icon: Icon, trend, variant = 'default', delay = 0 }: StatCardProps) {
  const variantMap = {
    default: {
      border: 'border-border/60',
      icon: 'bg-primary/10 text-primary',
      glow: '',
    },
    warning: {
      border: 'border-amber-400/50',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      glow: 'shadow-amber-100 dark:shadow-amber-900/10',
    },
    success: {
      border: 'border-emerald-400/50',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      glow: 'shadow-emerald-100 dark:shadow-emerald-900/10',
    },
  };
  const v = variantMap[variant];

  return (
    <div
      className={`db-fade-up group rounded-2xl border ${v.border} bg-card p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-default ${v.glow}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground truncate">{title}</p>
          <p
            className="db-count-in text-3xl font-black tabular-nums tracking-tight"
            style={{ animationDelay: `${delay + 120}ms` }}
          >
            {value}
          </p>
          {trend !== undefined && (
            <p className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${v.icon} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums text-sm">{value}</span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="db-fade-up flex items-center gap-3" style={{ animationDelay: `${delay}ms` }}>
      <span className="h-px flex-1 bg-border/50" />
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap px-1">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/50" />
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/70 ${className ?? ''}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-44" />
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-44" />
        </div>
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
export function Dashboard() {
  useStyleInject();
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Circle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Not signed in</h2>
        <p className="text-sm text-muted-foreground mt-1">Please sign in to view the dashboard.</p>
      </div>
    );
  }

  const role = (currentUser.role?.toLowerCase() as string) ?? '';

  if (role === 'superadmin' || role === 'super_admin') {
    return <SuperAdminDashboard currentUser={currentUser} />;
  }
  if (role === 'orgadmin' || role === 'org_admin' || role === 'admin') {
    return <OrgAdminDashboard currentUser={currentUser} />;
  }
  return <UserDashboard currentUser={currentUser} />;
}

// ─── Widget skeleton (inline, lightweight) ────────────────────────────────────
function WidgetSkeleton({ rows = 3, height = 'h-10' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2.5 p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function SuperAdminDashboard({ currentUser }: { currentUser: Record<string, unknown> }) {
  const { data: analyticsRes, isLoading: loadingAnalytics } = useAnalytics();
  const { data: pendingRes,   isLoading: loadingPending    } = usePendingOrganisations();
  const { data: orgsRes,      isLoading: loadingOrgs       } = useOrganisations();
  const { data: announcementsRes }                           = useAnnouncements();

  const analytics     = (analyticsRes as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const pending       = unwrapArray<Record<string, unknown>>(pendingRes);
  const orgs          = unwrapArray<Record<string, unknown>>(orgsRes);
  const announcements = unwrapArray<Announcement>(announcementsRes);

  const firstName = currentUser.firstName as string | undefined;
  const lastName  = currentUser.lastName  as string | undefined;
  const userName  = (currentUser.name as string) ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();

  // Stats resolve independently — show placeholder values while loading
  const statsLoading = loadingAnalytics || loadingPending || loadingOrgs;

  return (
    <div className="space-y-7 pb-10">
      {/* Banner renders immediately — no data dependency */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <WelcomeBanner
            userName={userName}
            role="super"
            subtitle="System-wide overview — manage organisations, users and platform health."
          />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      {/* Stats — each card shows a skeleton independently */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          [0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard title="Total Orgs"        value={orgs.length}                                              icon={Building2}   delay={0}   />
            <StatCard title="Pending Approvals" value={pending.length}                                           icon={Clock}       delay={60}  variant={pending.length > 0 ? 'warning' : 'default'} />
            <StatCard title="Active Meetings"   value={(analytics?.upcomingMeetings as unknown[])?.length ?? 0} icon={Calendar}    delay={120} />
            <StatCard title="System Health"     value="Good"                                                     icon={CheckCircle} delay={180} variant="success" />
          </>
        )}
      </div>

      {/* Pending orgs — only shows when data is ready, doesn't block other sections */}
      {!loadingPending && pending.length > 0 && (
        <div className="db-fade-up" style={{ animationDelay: '0ms' }}>
          <Card className="border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Pending Organisation Approvals
                <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 border text-xs">
                  {pending.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {pending.slice(0, 5).map((org) => (
                <div
                  key={org.organisationId as string}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-background/70 border border-border/50 hover:border-border transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm">{(org.organisationName ?? org.id) as string}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{org.OrgEmail as string}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 rounded-lg text-xs px-3">Approve</Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs px-3">Review</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <SectionHeader>Organisation Overview</SectionHeader>

      {/* Org cards — each loads independently */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="db-fade-up" style={{ animationDelay: '60ms' }}>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Building2 className="h-4 w-4" />Registered Organisations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {loadingOrgs ? <WidgetSkeleton rows={4} /> : (
                <>
                  {orgs.slice(0, 6).map((org) => (
                    <div
                      key={org.organisationId as string}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm">{(org.organisationName ?? org.id) as string}</p>
                        <p className="text-xs text-muted-foreground capitalize">{(org.status ?? 'active') as string}</p>
                      </div>
                      <Badge
                        variant={org.status === 'approved' || org.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize text-xs"
                      >
                        {(org.status ?? 'active') as string}
                      </Badge>
                    </div>
                  ))}
                  {orgs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No organisations yet.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="db-fade-up" style={{ animationDelay: '100ms' }}>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <BarChart3 className="h-4 w-4" />Platform Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnalytics || loadingOrgs || loadingPending ? <WidgetSkeleton rows={4} height="h-8" /> : (
                <>
                  <ActivityRow label="Registered organisations" value={orgs.length} />
                  <ActivityRow label="Pending approvals"        value={pending.length} />
                  <ActivityRow label="Active meetings"          value={(analytics?.upcomingMeetings as unknown[])?.length ?? 0} />
                  <ActivityRow label="Open tasks"               value={(analytics?.openTasks as unknown[])?.length ?? 0} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function OrgAdminDashboard({ currentUser }: { currentUser: Record<string, unknown> }) {
  const { data: analyticsRes, isLoading: loadingAnalytics } = useAnalytics();
  const { data: financeRes,   isLoading: loadingFinance   } = useFinanceOverview();
  const { data: meetingsRes,  isLoading: loadingMeetings  } = useMyMeetings();
  const { data: tasksRes,     isLoading: loadingTasks     } = useTasks();
  const { data: pollsRes,     isLoading: loadingPolls     } = usePolls();
  const { data: announcementsRes }                          = useAnnouncements();

  const analytics     = (analyticsRes as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const finance       = (financeRes   as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const meetings      = unwrapArray<Record<string, unknown>>(meetingsRes);
  const tasks         = unwrapArray<Record<string, unknown>>(tasksRes);
  const polls         = unwrapArray<Poll>(pollsRes);
  const announcements = unwrapArray<Announcement>(announcementsRes);

  const upcoming    = meetings.filter(isFutureMeeting).slice(0, 5).map(transformMeeting);
  const openTasks   = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'completed');
  const widgetTasks = tasks.slice(0, 5).map((t) => ({ ...t, dueDate: taskDueMs(t), deadline: undefined }));

  const budget      = finance?.budget as Record<string, unknown> | undefined;
  const totalBudget = ((budget?.total as Record<string, unknown>)?.amount as number) ?? 0;
  const spentBudget = ((budget?.spent as Record<string, unknown>)?.amount as number) ?? 0;
  const budgetPct   = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;

  const firstName = currentUser.firstName as string | undefined;
  const lastName  = currentUser.lastName  as string | undefined;
  const userName  = (currentUser.name as string) ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const attendanceTrend = ((analytics?.attendanceTrend as Record<string, unknown>[]) ?? []).map(
    (t) => ({ month: t.month as string, attendance: t.value as number })
  );

  const statsReady = !loadingMeetings && !loadingTasks && !loadingPolls && !loadingFinance;

  return (
    <div className="space-y-7 pb-10">
      {/* Banner renders immediately — no data needed */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <WelcomeBanner userName={userName} role="admin"
            subtitle="Manage your organisation, track meetings, tasks and board activity." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      {/* Stats — skeleton until all 4 sources ready */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {!statsReady ? (
          [0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard title="Upcoming Meetings" value={upcoming.length}  icon={Calendar}   delay={0}   />
            <StatCard title="Open Tasks"        value={openTasks.length} icon={ListTodo}   delay={50}  variant={openTasks.length > 5 ? 'warning' : 'default'} />
            <StatCard title="Active Polls"      value={polls.length}     icon={Vote}       delay={100} />
            <StatCard title="Budget Used"       value={`${budgetPct}%`}  icon={TrendingUp} delay={150} variant={budgetPct > 80 ? 'warning' : 'default'} />
          </>
        )}
      </div>

      <SectionHeader>Board Activity</SectionHeader>

      {/* Each widget loads and fades in independently */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="db-fade-up" style={{ animationDelay: '0ms' }}>
            {loadingMeetings
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={4} height="h-12" /></Card>
              : <UpcomingMeetingsWidget meetings={upcoming} />}
          </div>
          <div className="db-fade-up" style={{ animationDelay: '40ms' }}>
            {loadingAnalytics
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={3} /></Card>
              : <AttendanceWidget attendanceTrend={attendanceTrend} />}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-5">
          <div className="db-fade-up" style={{ animationDelay: '40ms' }}>
            {loadingTasks
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={4} height="h-12" /></Card>
              : <OpenActionsWidget tasks={widgetTasks} />}
          </div>
          <div className="db-fade-up" style={{ animationDelay: '80ms' }}>
            {loadingPolls
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={3} /></Card>
              : <VotingOverviewWidget polls={polls.slice(0, 4)} />}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-5">
          <div className="db-fade-up" style={{ animationDelay: '80ms' }}>
            {loadingFinance
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={4} /></Card>
              : <BudgetSummaryWidget budgetSummary={{ totalAllocated: totalBudget, totalSpent: spentBudget, percentage: budgetPct }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function UserDashboard({ currentUser }: { currentUser: Record<string, unknown> }) {
  const { data: meetingsRes,      isLoading: loadingMeetings      } = useMyMeetings();
  const { data: announcementsRes                                   } = useAnnouncements();
  const { data: documentsRes,     isLoading: loadingDocuments      } = useDocuments({ limit: 5 });
  const { data: tasksRes,         isLoading: loadingTasks          } = useTasks();
  const { data: pollsRes,         isLoading: loadingPolls          } = usePolls();

  const meetings      = unwrapArray<Record<string, unknown>>(meetingsRes);
  const announcements = unwrapArray<Announcement>(announcementsRes);
  const documents     = unwrapArray<Record<string, unknown>>(documentsRes);
  const tasks         = unwrapArray<Record<string, unknown>>(tasksRes);
  const polls         = unwrapArray<Poll>(pollsRes);

  const upcoming    = meetings.filter(isFutureMeeting).slice(0, 5).map(transformMeeting);
  const widgetTasks = tasks.slice(0, 5).map((t) => ({ ...t, dueDate: taskDueMs(t), deadline: undefined }));
  const recentDocs  = documents.slice(0, 5).map((d) => ({
    id: d.id, title: d.title, fileName: d.fileName, fileUrl: d.fileUrl,
    fileType: d.fileType, fileSize: d.fileSize,
    tags: (d.tags as string[]) ?? [], version: (d.version as number) ?? 1,
    uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt,
    accessLevel: (d.accessLevel as string) ?? 'VIEWER',
  }));

  const openTaskCount = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'completed'
  ).length;

  const firstName = currentUser.firstName as string | undefined;
  const lastName  = currentUser.lastName  as string | undefined;
  const userName  = (currentUser.name as string) ?? `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const statsReady = !loadingMeetings && !loadingTasks && !loadingPolls && !loadingDocuments;

  return (
    <div className="space-y-7 pb-10">
      {/* Banner renders immediately */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <WelcomeBanner userName={userName} role="user"
            subtitle="Stay on top of your meetings, tasks and board commitments." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {!statsReady ? (
          [0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard title="Upcoming Meetings" value={upcoming.length}  icon={Calendar}   delay={0}   />
            <StatCard title="My Open Tasks"     value={openTaskCount}    icon={ListTodo}   delay={50}  />
            <StatCard title="Active Polls"      value={polls.length}     icon={Vote}       delay={100} />
            <StatCard title="Recent Docs"       value={documents.length} icon={TrendingUp} delay={150} />
          </>
        )}
      </div>

      <SectionHeader>My Board Activity</SectionHeader>

      {/* Progressive widget grid */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="db-fade-up" style={{ animationDelay: '0ms' }}>
            {loadingMeetings
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={4} height="h-12" /></Card>
              : <UpcomingMeetingsWidget meetings={upcoming} />}
          </div>
          <div className="db-fade-up" style={{ animationDelay: '40ms' }}>
            <AttendanceWidget attendanceTrend={[]} />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-5">
          <div className="db-fade-up" style={{ animationDelay: '40ms' }}>
            {loadingTasks
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={4} height="h-12" /></Card>
              : <OpenActionsWidget tasks={widgetTasks} />}
          </div>
          <div className="db-fade-up" style={{ animationDelay: '80ms' }}>
            {loadingPolls
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={3} /></Card>
              : <VotingOverviewWidget polls={polls.slice(0, 4)} />}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-5">
          <div className="db-fade-up" style={{ animationDelay: '80ms' }}>
            <BudgetSummaryWidget budgetSummary={{ totalAllocated: 0, totalSpent: 0, percentage: 0 }} />
          </div>
          <div className="db-fade-up" style={{ animationDelay: '120ms' }}>
            {loadingDocuments
              ? <Card className="border-border/60 p-5"><WidgetSkeleton rows={3} /></Card>
              : <RecentDocumentsWidget documents={recentDocs} />}
          </div>
        </div>
      </div>
    </div>
  );
}