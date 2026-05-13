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

  const meetings = unwrapList<any>(meetingsData);
  const tasks = unwrapList<any>(tasksData);
  const resolutions = unwrapList<any>(resolutionsData);
  const announcements = unwrapList<any>(announcementsData);
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
    .filter(
      (m: any) => m.status === "SCHEDULED" && new Date(m.scheduledAt) > now,
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    .slice(0, 3);
  const myTasks = tasks
    .filter((t: any) => t.status !== "COMPLETED")
    .slice(0, 4);
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

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(now, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Link href="/board/notifications">
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 cursor-pointer hover:shadow-sm transition-shadow">
              <Bell className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {unreadCount} new notifications
              </span>
            </div>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
      </div>

      {activePoll && (
        <Link href="/board/polls">
          <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                Active Poll — Your response needed
              </p>
              <p className="text-sm text-violet-700 dark:text-violet-300 truncate">
                {activePoll.question}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-3 py-1.5 rounded-full">
              Respond →
            </span>
          </div>
        </Link>
      )}

      {pendingVotes.length > 0 && (
        <Link href="/board/resolutions">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Vote className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {pendingVotes.length} resolution
                {pendingVotes.length > 1 ? "s" : ""} awaiting your vote
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 truncate">
                {pendingVotes[0].title}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
              Vote now →
            </span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The remainder of the dashboard body can stay as-is using existing data above */}
      </div>
    </div>
  );
}
