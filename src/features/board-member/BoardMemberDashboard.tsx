'use client';

import { Link } from 'wouter';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import {
  CalendarDays, FileText, CheckSquare, Megaphone, Vote,
  BarChart3, Clock, MapPin, ChevronRight, Bell, TrendingUp,
  Shield, MessageSquare, AlertCircle, CheckCircle2, Users,
  BookOpen, Activity, Award, Target,
} from 'lucide-react';
import {
  useMeetings, useTasks, useResolutions,
  useAnnouncements, usePolls, useNotifications, useAnalytics,
} from './useBoardStore';
import { CURRENT_USER } from './store';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accentClass, href }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; accentClass: string; href: string;
}) {
  return (
    <Link href={href}>
      <div className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden group">
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${accentClass} opacity-10 translate-x-6 -translate-y-6`} />
        <div className={`h-9 w-9 rounded-xl ${accentClass} opacity-20 group-hover:opacity-30 flex items-center justify-center mb-3 transition-opacity`}>
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Link>
  );
}

// ─── Analytics ring ───────────────────────────────────────────────────────────

function RingGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            className={color} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{value}%</span>
      </div>
      <p className="text-xs text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoardMemberDashboard() {
  const { meetings }       = useMeetings();
  const { tasks }          = useTasks();
  const { resolutions }    = useResolutions();
  const { announcements }  = useAnnouncements();
  const { polls }          = usePolls();
  const { notifications, unreadCount } = useNotifications();
  const analytics          = useAnalytics();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Derived
  const upcomingMeetings = meetings.filter(m => m.status === 'SCHEDULED' && new Date(m.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).slice(0, 3);
  const myTasks        = tasks.filter(t => t.status !== 'COMPLETED').sort((a, b) => {
    const p = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
  }).slice(0, 4);
  const pendingVotes   = resolutions.filter(r => r.status === 'OPEN' && !r.myVote);
  const unreadAnns     = announcements.filter(a => !a.isRead);
  const activePoll     = polls.find(p => p.status === 'ACTIVE' && !p.myResponse?.length);

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {CURRENT_USER.firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(now, 'EEEE, MMMM d, yyyy')} · {CURRENT_USER.title}
          </p>
        </div>
        {unreadCount > 0 && (
          <Link href="/board/notifications">
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 cursor-pointer hover:shadow-sm transition-shadow">
              <Bell className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{unreadCount} new notifications</span>
            </div>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={CalendarDays} label="Upcoming"      value={upcomingMeetings.length} accentClass="bg-indigo-500"  href="/board/meetings" />
        <StatCard icon={Vote}         label="Need My Vote"  value={pendingVotes.length}     accentClass="bg-amber-500"   href="/board/resolutions" />
        <StatCard icon={CheckSquare}  label="My Tasks"      value={myTasks.length}           accentClass="bg-emerald-500" href="/board/tasks" />
        <StatCard icon={Bell}         label="Unread"        value={unreadAnns.length}        accentClass="bg-rose-500"    href="/board/notifications" />
        <StatCard icon={BarChart3}    label="Active Polls"  value={polls.filter(p => p.status === 'ACTIVE').length} accentClass="bg-violet-500" href="/board/polls" />
        <StatCard icon={Shield}       label="Compliance"    value={`${analytics.taskCompletionRate}%`} sub="completion" accentClass="bg-sky-500" href="/board/compliance" />
      </div>

      {/* Active poll banner */}
      {activePoll && (
        <Link href="/board/polls">
          <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-4 flex items-center gap-4 hover:shadow-sm transition cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Active Poll — Your response needed</p>
              <p className="text-sm text-violet-700 dark:text-violet-300 truncate">{activePoll.question}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-3 py-1.5 rounded-full">
              Respond →
            </span>
          </div>
        </Link>
      )}

      {/* Pending votes banner */}
      {pendingVotes.length > 0 && (
        <Link href="/board/resolutions">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 flex items-center gap-4 hover:shadow-sm transition cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Vote className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {pendingVotes.length} resolution{pendingVotes.length > 1 ? 's' : ''} awaiting your vote
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 truncate">{pendingVotes[0].title}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
              Vote now →
            </span>
          </div>
        </Link>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming meetings */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-500" />Upcoming Meetings</h2>
            <Link href="/board/meetings"><span className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors">View all →</span></Link>
          </div>
          <div className="p-3 space-y-1">
            {upcomingMeetings.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground"><CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-20" />No upcoming meetings</div>
            ) : upcomingMeetings.map(m => {
              const isT = isToday(new Date(m.scheduledAt));
              const isTo = isTomorrow(new Date(m.scheduledAt));
              return (
                <Link key={m.meetingId} href={`/board/meetings`}>
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group cursor-pointer">
                    <div className={`shrink-0 rounded-xl p-2.5 text-center min-w-[52px] ${isT || isTo ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'}`}>
                      <p className="text-[10px] font-bold uppercase">{format(new Date(m.scheduledAt), 'MMM')}</p>
                      <p className="text-lg font-black leading-none">{format(new Date(m.scheduledAt), 'd')}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{m.title}</p>
                        {(isT || isTo) && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full">{isT ? 'Today' : 'Tomorrow'}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(m.scheduledAt), 'h:mm a')}</span>
                        {m.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          m.myRsvp === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                          m.myRsvp === 'DECLINED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{m.myRsvp ?? 'PENDING'}</span>
                        <span className="text-[10px] text-muted-foreground">{m.meetingType}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Analytics gauges */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-500" />My Performance</h2>
            <Link href="/board/analytics"><span className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors">Details →</span></Link>
          </div>
          <div className="p-5 grid grid-cols-3 gap-3">
            <RingGauge value={analytics.attendanceRate}         label="Attendance"  color="text-indigo-500" />
            <RingGauge value={analytics.taskCompletionRate}     label="Tasks"       color="text-emerald-500" />
            <RingGauge value={analytics.votingParticipationRate}label="Voting"      color="text-amber-500" />
          </div>
          <div className="px-5 pb-5 space-y-2.5 border-t border-border/40 pt-4 mt-1">
            {[
              { label: 'Meetings this quarter', value: analytics.meetingsThisQuarter, icon: CalendarDays },
              { label: 'Documents reviewed',    value: analytics.documentsReviewed,   icon: FileText },
              { label: 'Resolutions passed',    value: analytics.resolutionsPassed,   icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{label}</span>
                <span className="text-sm font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* My tasks */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4 text-emerald-500" />My Tasks</h2>
            <Link href="/board/tasks"><span className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors">All tasks →</span></Link>
          </div>
          <div className="p-3 space-y-1">
            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/40" />All caught up!</div>
            ) : myTasks.map(t => (
              <Link key={t.taskId} href="/board/tasks">
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    t.status === 'OVERDUE' ? 'bg-red-500' : t.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{t.title}</p>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${t.status === 'OVERDUE' ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${t.progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      t.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      t.priority === 'HIGH'     ? 'bg-orange-100 text-orange-700' :
                      t.priority === 'MEDIUM'   ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>{t.priority}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4 text-rose-500" />Announcements</h2>
            <Link href="/board/announcements"><span className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors">All →</span></Link>
          </div>
          <div className="p-3 space-y-1">
            {announcements.slice(0, 4).map(a => (
              <Link key={a.announcementId} href="/board/announcements">
                <div className={`flex items-start gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer ${!a.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/10' : ''}`}>
                  {!a.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                  {a.isRead  && <span className="h-2 w-2 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium line-clamp-1 ${a.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                    a.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                    a.priority === 'HIGH'   ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                  }`}>{a.priority}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick access */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="px-5 py-4 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-sky-500" />Quick Access</h2>
          </div>
          <div className="p-3 space-y-1">
            {[
              { icon: CalendarDays, label: 'Meetings',       href: '/board/meetings',      color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
              { icon: FileText,     label: 'Documents',      href: '/board/documents',     color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' },
              { icon: Vote,         label: 'Resolutions',    href: '/board/resolutions',   color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
              { icon: BarChart3,    label: 'Polls',          href: '/board/polls',         color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' },
              { icon: MessageSquare,label: 'Messages',       href: '/board/messages',      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' },
              { icon: TrendingUp,   label: 'Analytics',      href: '/board/analytics',     color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
              { icon: Shield,       label: 'Compliance',     href: '/board/compliance',    color: 'bg-slate-100 dark:bg-slate-800 text-slate-600' },
              { icon: Target,       label: 'Archives',       href: '/board/archives',      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors group cursor-pointer">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}><Icon className="h-4 w-4" /></div>
                  <span className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}