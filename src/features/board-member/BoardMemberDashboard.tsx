"use client";

import { Link } from "wouter";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckSquare,
  Vote,
  BarChart3,
  Bell,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMyMeetings,
  useTasks,
  useResolutions,
  useAnnouncements,
  usePolls,
  useNotifications,
  useAnalytics,
  useCurrentUser,
} from "@/hooks/api";
import type { Poll } from "./types";
import { unwrapList, unwrap } from "./components/page-helpers";

type DashboardMeeting = {
  meetingId?: string;
  id?: string;
  title?: string;
  scheduledAt?: string;
  startTime?: string;
  location?: string;
  status?: string;
  attendees?: unknown[];
};

type DashboardTask = {
  taskId?: string;
  id?: string;
  title?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
};

type DashboardAnnouncement = {
  announcementId?: string;
  id?: string;
  title?: string;
  content?: string;
  createdAt?: string;
  isRead?: boolean;
};

function safeDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(value?: string) {
  const date = safeDate(value);
  return date ? format(date, 'MMM d') : 'TBD';
}

function formatShortTime(value?: string) {
  const date = safeDate(value);
  return date ? format(date, 'p') : 'TBD';
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accentClass,
  href,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accentClass: string;
  href: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="block">
      <div className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden group">
        <div
          className={`absolute top-0 right-0 w-20 h-20 rounded-full ${accentClass} opacity-10 translate-x-6 -translate-y-6`}
        />
        <div
          className={`h-9 w-9 rounded-xl ${accentClass} opacity-20 group-hover:opacity-30 flex items-center justify-center mb-3 transition-opacity`}
        >
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Link>
  );
}

function RingGauge({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="72" height="72" className="-rotate-90">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={color}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {value}%
        </span>
      </div>
      <p className="text-xs text-muted-foreground text-center leading-tight">
        {label}
      </p>
    </div>
  );
}

export default function BoardMemberDashboard() {
  const { data: meetingsData } = useMyMeetings();
  const { data: tasksData } = useTasks();
  const { data: resolutionsData } = useResolutions();
  const { data: announcementsData } = useAnnouncements();
  const { data: pollsData } = usePolls();
  const { data: notificationsData } = useNotifications();
  const { data: analyticsData } = useAnalytics();
  const { data: currentUser } = useCurrentUser();

  const meetings = unwrapList<DashboardMeeting>(meetingsData);
  const tasks = unwrapList<DashboardTask>(tasksData);
  const resolutions = unwrapList<any>(resolutionsData);
  const announcements = unwrapList<DashboardAnnouncement>(announcementsData);
  const polls = unwrapList<Poll>(pollsData);
  const notifications = unwrapList<any>(notificationsData);
  const analytics = unwrap<any>(analyticsData) ?? {
    attendanceRate: 0,
    taskCompletionRate: 0,
    votingParticipationRate: 0,
    meetingsThisQuarter: 0,
    documentsReviewed: 0,
    resolutionsPassed: 0,
  };

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  const upcomingMeetings = meetings
    .filter((meeting) => meeting.status === 'SCHEDULED' && safeDate(meeting.scheduledAt) && safeDate(meeting.scheduledAt)! > now)
    .sort((a, b) => {
      const left = safeDate(a.scheduledAt)?.getTime() ?? 0;
      const right = safeDate(b.scheduledAt)?.getTime() ?? 0;
      return left - right;
    })
    .slice(0, 4);
  const myTasks = tasks.filter((task) => task.status !== 'COMPLETED').slice(0, 4);
  const pendingVotes = resolutions.filter(
    (r: any) => r.status === "OPEN" && !r.myVote,
  );
  const unreadAnns = announcements.filter((a: any) => !a.isRead);
  const activePoll = polls.find(
    (p) => p.status === "ACTIVE" && !p.myResponse?.length,
  );
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const userName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : "User";

  const quickStats = [
    { label: 'Upcoming meetings', value: upcomingMeetings.length, color: 'bg-indigo-500', href: '/board/meetings' },
    { label: 'Open tasks', value: myTasks.length, color: 'bg-emerald-500', href: '/board/tasks' },
    { label: 'Unread alerts', value: unreadCount, color: 'bg-rose-500', href: '/board/notifications' },
    { label: 'Active polls', value: polls.filter((poll) => poll.status === 'ACTIVE').length, color: 'bg-violet-500', href: '/board/polls' },
    { label: 'Pending votes', value: pendingVotes.length, color: 'bg-amber-500', href: '/board/resolutions' },
    { label: 'Meeting completion', value: `${analytics.taskCompletionRate ?? 0}%`, color: 'bg-sky-500', href: '/board/compliance' },
  ];

  const attentionItems = [
    { title: 'Vote queue', value: `${pendingVotes.length} resolutions`, note: pendingVotes.length ? pendingVotes[0].title : 'No pending votes', href: '/board/resolutions' },
    { title: 'Unread announcements', value: `${unreadAnns.length} updates`, note: unreadAnns.length ? unreadAnns[0].title : 'All caught up', href: '/board/announcements' },
    { title: 'Notifications', value: `${unreadCount} unread`, note: unreadCount ? 'Open the latest alerts' : 'Nothing new right now', href: '/board/notifications' },
  ];

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-rose-500/10" />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.5fr_0.85fr] lg:items-center lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              Board member dashboard
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-balance">
                {greeting}, {userName}
              </h1>
              <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
                Your meetings, votes, tasks, and updates in one responsive view. Everything important is surfaced first so you can act faster on any device.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                {format(now, 'EEEE, MMM d')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                {analytics.meetingsThisQuarter ?? 0} meetings this quarter
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Link href="/board/notifications">
              <div className="group h-full rounded-2xl border border-indigo-200/80 bg-indigo-50/80 p-4 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                <Bell className="h-5 w-5 text-indigo-600" />
                <p className="mt-4 text-2xl font-black text-indigo-950 dark:text-indigo-100">{unreadCount}</p>
                <p className="text-sm font-medium text-indigo-700/90 dark:text-indigo-300">Unread notifications</p>
              </div>
            </Link>
            <Link href="/board/tasks">
              <div className="group h-full rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                <p className="mt-4 text-2xl font-black text-emerald-950 dark:text-emerald-100">{myTasks.length}</p>
                <p className="text-sm font-medium text-emerald-700/90 dark:text-emerald-300">Open tasks</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarDays}
          label="Upcoming"
          value={upcomingMeetings.length}
          accentClass="bg-indigo-500"
          href="/board/meetings"
        />
        <StatCard
          icon={Vote}
          label="Need My Vote"
          value="—"
          accentClass="bg-amber-500"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            toast("Resolutions are coming soon");
          }}
        />
        <StatCard
          icon={CheckSquare}
          label="My Tasks"
          value={myTasks.length}
          accentClass="bg-emerald-500"
          href="/board/tasks"
        />
        <StatCard
          icon={Bell}
          label="Unread"
          value={unreadAnns.length}
          accentClass="bg-rose-500"
          href="/board/notifications"
        />
        <StatCard
          icon={BarChart3}
          label="Active Polls"
          value={polls.filter((p) => p.status === "ACTIVE").length}
          accentClass="bg-violet-500"
          href="/board/polls"
        />
        <StatCard
          icon={Shield}
          label="Compliance"
          value={`${analytics.taskCompletionRate}%`}
          sub="completion"
          accentClass="bg-sky-500"
          href="/board/compliance"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Priority actions</h2>
              <p className="text-sm text-muted-foreground">Things that need attention now.</p>
            </div>
            <Link href="/board/analytics">
              <span className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View analytics</span>
            </Link>
          </div>

          <div className="space-y-3">
            {attentionItems.map((item) => (
              <Link key={item.title} href={item.href}>
                <div className="group rounded-2xl border border-border/60 bg-muted/20 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </div>
                    <span className="mt-2 inline-flex self-start rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm sm:mt-0">
                      {item.value}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Quick insights</h2>
              <p className="text-sm text-muted-foreground">At-a-glance board metrics.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quickStats.map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className={`h-9 w-9 rounded-xl ${stat.color} opacity-15 mb-3`} />
                  <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>

          {activePoll && (
            <Link href="/board/polls">
              <div className="mt-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 dark:from-violet-950/20 dark:via-indigo-950/20 dark:to-sky-950/20 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Active poll needs your response</p>
                    <p className="mt-1 text-sm text-violet-700 dark:text-violet-300 line-clamp-2">{activePoll.question}</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Upcoming meetings</h2>
              <p className="text-sm text-muted-foreground">Next sessions on your schedule.</p>
            </div>
            <Link href="/board/meetings">
              <span className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Open meetings</span>
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.meetingId ?? meeting.id ?? meeting.title} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate">{meeting.title ?? 'Untitled meeting'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatShortDate(meeting.scheduledAt)} at {formatShortTime(meeting.scheduledAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {meeting.location ?? 'Location TBD'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                No upcoming meetings right now.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-border/60 bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Tasks and updates</h2>
              <p className="text-sm text-muted-foreground">Your current workload and recent notices.</p>
            </div>
            <Link href="/board/tasks">
              <span className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Open tasks</span>
            </Link>
          </div>

          <div className="space-y-3">
            {myTasks.length > 0 ? (
              myTasks.map((task) => (
                <div key={task.taskId ?? task.id ?? task.title} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate">{task.title ?? 'Untitled task'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due {formatShortDate(task.dueDate)}
                      </p>
                    </div>
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold shadow-sm">
                      {task.priority ?? 'NORMAL'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                No open tasks to show.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Announcements</p>
                <p className="text-xs text-muted-foreground">Latest unread items from the board.</p>
              </div>
              <span className="text-sm font-black">{unreadAnns.length}</span>
            </div>
            {unreadAnns.slice(0, 2).map((ann) => (
              <div key={ann.announcementId ?? ann.id ?? ann.title} className="mt-3 rounded-xl bg-muted/20 p-3">
                <p className="text-sm font-medium line-clamp-1">{ann.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
