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
import {
  Loader2, Users, Building2, CheckCircle, Clock, AlertTriangle,
  TrendingUp, BarChart3, Vote, ListTodo, Bell, X, Megaphone,
  ChevronDown, Circle, CheckCircle2, Calendar,
} from 'lucide-react';

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const STYLES = `
@keyframes db-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes db-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes db-pulse-ring {
  0%   { transform: scale(1);    opacity: 0.6; }
  100% { transform: scale(1.55); opacity: 0;   }
}
@keyframes db-count-in {
  from { opacity: 0; transform: scale(0.75); }
  to   { opacity: 1; transform: scale(1);    }
}
@keyframes db-slide-down {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0);    }
}
.db-fade-up   { animation: db-fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }
.db-count-in  { animation: db-count-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
.db-slide-down{ animation: db-slide-down 0.25s ease both; }
`;

function useStyleInject() {
  useEffect(() => {
    const id = 'dashboard-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = STYLES;
      document.head.appendChild(s);
    }
  }, []);
}

// ─── Data unwrap helpers ──────────────────────────────────────────────────────
function unwrapArray<T>(res: any): T[] {
  if (!res) return [];
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

// FIX: backend stores date in scheduledDate, not date
function isFutureMeeting(m: any): boolean {
  const raw = m.scheduledDate ?? m.date;
  if (!raw) return false;
  return new Date(raw) > new Date();
}

// FIX: transform real backend meeting shape for UpcomingMeetingsWidget
function transformMeeting(m: any) {
  const dateStr = m.scheduledDate ?? m.date ?? '';
  const startTime = m.startTime ?? '';
  // Build a combined ISO-ish string for the widget's formatDate/formatTime
  let startAt = dateStr;
  if (dateStr && startTime) {
    const d = dateStr.split('T')[0];
    const t = startTime.includes('T') ? startTime.split('T')[1] : startTime;
    startAt = `${d}T${t}`;
  }
  return {
    id:           m.meetingId ?? m.id ?? '',
    title:        m.title ?? 'Untitled',
    startAt,
    endAt:        m.endTime ?? '',
    timezone:     'local',
    location:     m.location ?? m.onlineMeetingLink ?? '',
    isRecurring:  m.meetingFrequency !== 'once',
    status:       (m.meetingStatus ?? m.status ?? 'upcoming') as any,
    agenda:       [],
    attendees:    m.attendees ?? [],
    createdBy:    m.creator?.userId ?? '',
    createdAt:    m.createdAt ?? '',
  };
}

// FIX: dueDate in Task type is Unix ms, not ISO string
function taskDueMs(t: any): string | undefined {
  const v = t.dueDate ?? t.deadline;
  if (!v) return undefined;
  if (typeof v === 'number') return new Date(v).toISOString();
  return v;
}

// ─── Announcement Bell dropdown ───────────────────────────────────────────────
interface AnnouncementBellProps {
  announcements: any[];
}

function AnnouncementBell({ announcements }: AnnouncementBellProps) {
  const [open, setOpen] = useState(false);
  const [read, setRead]   = useState<Set<string>>(new Set());
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
    if (diff < 1)  return 'just now';
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 hover:bg-muted transition-colors border border-border/50"
        aria-label="Announcements"
      >
        <Bell className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
        {unread > 0 && (
          <>
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              style={{ minWidth: 18, height: 18, fontSize: 10 }}>
              {unread > 9 ? '9+' : unread}
            </span>
            <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-primary opacity-50"
              style={{ minWidth: 18, height: 18, animation: 'db-pulse-ring 1.4s ease-out infinite' }} />
          </>
        )}
      </button>

      {open && (
        <div className="db-slide-down absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-border/60 bg-popover shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Announcements</span>
              {unread > 0 && (
                <Badge className="h-5 text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20 border">
                  {unread} new
                </Badge>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No announcements yet</p>
              </div>
            ) : (
              announcements.map((a, i) => {
                const isUnread = !read.has(a.id);
                return (
                  <button key={a.id} onClick={() => setRead(p => new Set([...p, a.id]))}
                    className={`w-full text-left px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors ${isUnread ? 'bg-primary/3' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isUnread ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate">{a.title}</span>
                          {a.isPinned && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 shrink-0">Pinned</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.content}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">{fmtTime(a.publishedAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {announcements.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
              <button className="w-full text-center text-xs text-primary hover:underline">
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
  userName: string; subtitle: string; role: 'super' | 'admin' | 'user';
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 3500);
    return () => clearInterval(t);
  }, []);

  const greetings = ['Good to see you', 'Welcome back', 'Ready to lead'];
  const greeting  = greetings[tick % greetings.length];

  const gradients: Record<string, string> = {
    super: 'from-violet-600 via-purple-500 to-fuchsia-500',
    admin: 'from-primary via-blue-500 to-cyan-400',
    user:  'from-emerald-500 via-teal-400 to-cyan-500',
  };

  return (
    <div className="db-fade-up relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 sm:p-8"
      style={{ animationDelay: '0ms' }}>
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-12 -right-12 h-48 w-48 rounded-full bg-gradient-to-br ${gradients[role]} opacity-10 blur-3xl`}
          style={{ animation: 'db-pulse-ring 4s ease-in-out infinite alternate' }} />
        <div className={`absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr ${gradients[role]} opacity-8 blur-2xl`}
          style={{ animation: 'db-pulse-ring 5s ease-in-out infinite alternate-reverse' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 24px,currentColor 24px,currentColor 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,currentColor 24px,currentColor 25px)' }} />
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          {/* Animated greeting */}
          <div className="flex items-center gap-2">
            <span key={tick}
              className="db-count-in text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {greeting}
            </span>
            <span className="h-px flex-1 max-w-[40px] bg-border/60" />
          </div>

          {/* Main name — shimmer gradient text */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight"
            style={{
              background: `linear-gradient(120deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)/0.7) 40%, hsl(var(--primary)) 60%, hsl(var(--foreground)) 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'db-shimmer 4s linear infinite',
            }}>
            {userName?.split(' ')[0] ?? 'Welcome'} <span style={{ WebkitTextFillColor: 'hsl(var(--foreground))' }}>👋</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{subtitle}</p>
        </div>

        {/* Live clock */}
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
    <div className="shrink-0 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-center min-w-[110px]">
      <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string; value: string | number; icon: LucideIcon;
  trend?: number; variant?: 'default' | 'warning' | 'success';
  delay?: number;
}

function StatCard({ title, value, icon: Icon, trend, variant = 'default', delay = 0 }: StatCardProps) {
  const variantMap = {
    default: { border: 'border-border/50',    icon: 'bg-primary/10 text-primary'          },
    warning: { border: 'border-amber-400/40',  icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    success: { border: 'border-emerald-400/40',icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  };
  const v = variantMap[variant];

  return (
    <div className={`db-fade-up rounded-2xl border ${v.border} bg-card p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="db-count-in text-3xl font-black tabular-nums tracking-tight"
            style={{ animationDelay: `${delay + 100}ms` }}>{value}</p>
          {trend !== undefined && (
            <p className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${v.icon}`}>
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
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="db-fade-up flex items-center gap-3" style={{ animationDelay: `${delay}ms` }}>
      <span className="h-px flex-1 bg-border/50" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/50" />
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/60 ${className ?? ''}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-4"><Skeleton className="h-56" /><Skeleton className="h-44" /></div>
        <div className="col-span-12 lg:col-span-5 space-y-4"><Skeleton className="h-56" /><Skeleton className="h-44" /></div>
        <div className="col-span-12 lg:col-span-3 space-y-4"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
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

  const role = currentUser.role?.toLowerCase() ?? '';

  if (role === 'superadmin' || role === 'super_admin') {
    return <SuperAdminDashboard currentUser={currentUser} />;
  }
  if (role === 'orgadmin' || role === 'org_admin' || role === 'admin') {
    return <OrgAdminDashboard currentUser={currentUser} />;
  }
  return <UserDashboard currentUser={currentUser} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function SuperAdminDashboard({ currentUser }: { currentUser: any }) {
  const { data: analyticsRes, isLoading: a } = useAnalytics();
  const { data: pendingRes,   isLoading: p } = usePendingOrganisations();
  const { data: orgsRes,      isLoading: o } = useOrganisations();
  const { data: announcementsRes }           = useAnnouncements();

  const isLoading = a || p || o;
  const analytics     = analyticsRes?.data;
  const pending       = unwrapArray(pendingRes);
  const orgs          = unwrapArray(orgsRes);
  const announcements = unwrapArray(announcementsRes);
  const userName      = currentUser.name ?? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim();

  return (
    <div className="space-y-7 pb-10">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <WelcomeBanner userName={userName} role="super"
            subtitle="System-wide overview — manage organisations, users and platform health." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      {isLoading ? <DashboardSkeleton /> : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Orgs"       value={orgs.length}                    icon={Building2}    delay={60}  />
            <StatCard title="Pending Approvals" value={pending.length}                 icon={Clock}        delay={120} variant={pending.length > 0 ? 'warning' : 'default'} />
            <StatCard title="Active Meetings"  value={analytics?.upcomingMeetings?.length ?? 0} icon={Calendar} delay={180} />
            <StatCard title="System Health"    value="Good"                            icon={CheckCircle}  delay={240} variant="success" />
          </div>

          {/* Pending orgs */}
          {pending.length > 0 && (
            <div className="db-fade-up" style={{ animationDelay: '280ms' }}>
              <Card className="border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Pending Organisation Approvals
                    <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 border">
                      {pending.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {pending.slice(0, 5).map((org: any) => (
                    <div key={org.organisationId}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border/50">
                      <div>
                        <p className="font-semibold text-sm">{org.organisationName ?? org.id}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{org.OrgEmail}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 rounded-xl">Approve</Button>
                        <Button size="sm" variant="outline" className="h-8 rounded-xl">Review</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          <SectionHeader delay={300}>Organisation Overview</SectionHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="db-fade-up" style={{ animationDelay: '320ms' }}>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />Registered Organisations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {orgs.slice(0, 6).map((org: any) => (
                    <div key={org.organisationId}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{org.organisationName ?? org.id}</p>
                        <p className="text-xs text-muted-foreground capitalize">{org.status ?? 'active'}</p>
                      </div>
                      <Badge variant={org.status === 'approved' || org.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize text-xs">{org.status ?? 'active'}</Badge>
                    </div>
                  ))}
                  {orgs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No organisations yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="db-fade-up" style={{ animationDelay: '360ms' }}>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />Platform Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityRow label="Registered organisations"   value={orgs.length} />
                  <ActivityRow label="Pending approvals"          value={pending.length} />
                  <ActivityRow label="Active meetings"            value={analytics?.upcomingMeetings?.length ?? 0} />
                  <ActivityRow label="Open tasks"                 value={analytics?.openTasks?.length ?? 0} />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function OrgAdminDashboard({ currentUser }: { currentUser: any }) {
  const { data: analyticsRes,     isLoading: al } = useAnalytics();
  const { data: financeRes,       isLoading: fl } = useFinanceOverview();
  const { data: meetingsRes,      isLoading: ml } = useMyMeetings();
  const { data: tasksRes,         isLoading: tl } = useTasks();
  const { data: pollsRes,         isLoading: pl } = usePolls();
  const { data: announcementsRes, isLoading: anl } = useAnnouncements();

  const isLoading = al || fl || ml || tl || pl || anl;

  const analytics     = analyticsRes?.data;
  const finance       = financeRes?.data;
  const meetings      = unwrapArray(meetingsRes);
  const tasks         = unwrapArray(tasksRes);
  const polls         = unwrapArray(pollsRes);
  const announcements = unwrapArray(announcementsRes);

  const upcoming = meetings.filter(isFutureMeeting).slice(0, 5).map(transformMeeting);
  const openTasks = tasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'completed');

  // Normalize tasks for widget — fix dueDate from Unix ms to ISO string
  const widgetTasks = tasks.slice(0, 5).map((t: any) => ({
    ...t,
    dueDate:  taskDueMs(t),
    deadline: undefined,
  }));

  // Finance
  const totalBudget = finance?.budget?.total?.amount ?? 0;
  const spentBudget = finance?.budget?.spent?.amount ?? 0;
  const budgetPct   = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;

  const userName = currentUser.name ?? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim();

  return (
    <div className="space-y-7 pb-10">
      {/* Top bar with bell */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <WelcomeBanner userName={userName} role="admin"
            subtitle="Manage your organisation, track meetings, tasks and board activity." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      {isLoading ? <DashboardSkeleton /> : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Upcoming Meetings" value={upcoming.length}          icon={Calendar}  delay={60}  />
            <StatCard title="Open Tasks"         value={openTasks.length}        icon={ListTodo}  delay={120} variant={openTasks.length > 5 ? 'warning' : 'default'} />
            <StatCard title="Active Polls"       value={polls.length}            icon={Vote}      delay={180} />
            <StatCard title="Budget Used"        value={`${budgetPct}%`}         icon={TrendingUp}delay={240} variant={budgetPct > 80 ? 'warning' : 'default'} />
          </div>

          <SectionHeader delay={280}>Board Activity</SectionHeader>

          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-4 space-y-5">
              <div className="db-fade-up" style={{ animationDelay: '300ms' }}>
                <UpcomingMeetingsWidget meetings={upcoming} />
              </div>
              <div className="db-fade-up" style={{ animationDelay: '340ms' }}>
                <AttendanceWidget attendanceTrend={
                  (analytics?.attendanceTrend ?? []).map((t: any) => ({ month: t.month, attendance: t.value }))
                } />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 space-y-5">
              <div className="db-fade-up" style={{ animationDelay: '360ms' }}>
                <OpenActionsWidget tasks={widgetTasks} />
              </div>
              <div className="db-fade-up" style={{ animationDelay: '400ms' }}>
                <VotingOverviewWidget polls={polls.slice(0, 4)} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3 space-y-5">
              <div className="db-fade-up" style={{ animationDelay: '420ms' }}>
                <BudgetSummaryWidget budgetSummary={{
                  totalAllocated: totalBudget,
                  totalSpent:     spentBudget,
                  percentage:     budgetPct,
                }} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function UserDashboard({ currentUser }: { currentUser: any }) {
  const { data: meetingsRes,      isLoading: ml  } = useMyMeetings();
  const { data: announcementsRes, isLoading: anl } = useAnnouncements();
  const { data: documentsRes,     isLoading: dl  } = useDocuments({ limit: 5 });
  const { data: tasksRes,         isLoading: tl  } = useTasks();
  const { data: pollsRes,         isLoading: pl  } = usePolls();

  const isLoading = ml || anl || dl || tl || pl;

  const meetings      = unwrapArray(meetingsRes);
  const announcements = unwrapArray(announcementsRes);
  const documents     = unwrapArray(documentsRes);
  const tasks         = unwrapArray(tasksRes);
  const polls         = unwrapArray(pollsRes);

  const upcoming   = meetings.filter(isFutureMeeting).slice(0, 5).map(transformMeeting);
  const widgetTasks = tasks.slice(0, 5).map((t: any) => ({
    ...t, dueDate: taskDueMs(t), deadline: undefined,
  }));
  const recentDocs = documents.slice(0, 5).map((d: any) => ({
    id: d.id, title: d.title, fileName: d.fileName, fileUrl: d.fileUrl,
    fileType: d.fileType, fileSize: d.fileSize, tags: d.tags ?? [],
    version: d.version ?? 1, uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt,
    accessLevel: d.accessLevel ?? 'VIEWER',
  }));

  const userName = currentUser.name ?? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim();

  return (
    <div className="space-y-7 pb-10">
      {/* Top bar */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <WelcomeBanner userName={userName} role="user"
            subtitle="Stay on top of your meetings, tasks and board commitments." />
        </div>
        <div className="mt-1 shrink-0">
          <AnnouncementBell announcements={announcements} />
        </div>
      </div>

      {isLoading ? <DashboardSkeleton /> : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Upcoming Meetings" value={upcoming.length}                                              icon={Calendar}    delay={60}  />
            <StatCard title="My Open Tasks"     value={tasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'completed').length} icon={ListTodo}    delay={120} />
            <StatCard title="Active Polls"      value={polls.length}                                                 icon={Vote}        delay={180} />
            <StatCard title="Recent Docs"       value={documents.length}                                             icon={TrendingUp}  delay={240} />
          </div>

          <SectionHeader delay={280}>My Board Activity</SectionHeader>

          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-4 space-y-5">
              <div className="db-fade-up" style={{ animationDelay: '300ms' }}>
                <UpcomingMeetingsWidget meetings={upcoming} />
              </div>
              <div className="db-fade-up" style={{ animationDelay: '340ms' }}>
                <AttendanceWidget attendanceTrend={[]} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 space-y-5">
              <div className="db-fade-up" style={{ animationDelay: '360ms' }}>
                <OpenActionsWidget tasks={widgetTasks} />
              </div>
              <div className="db-fade-up" style={{ animationDelay: '400ms' }}>
                <VotingOverviewWidget polls={polls.slice(0, 4)} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3 space-y-5">
              <div className="db-fade-up" style={{ animationDelay: '420ms' }}>
                <BudgetSummaryWidget budgetSummary={{ totalAllocated: 0, totalSpent: 0, percentage: 0 }} />
              </div>
              <div className="db-fade-up" style={{ animationDelay: '460ms' }}>
                <RecentDocumentsWidget documents={recentDocs} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}