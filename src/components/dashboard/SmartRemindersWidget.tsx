// Smart reminders widget. Surfaces things that need attention in the next
// 24 hours so the user doesn't have to dig: overdue tasks, tasks due today
// or tomorrow, and meetings starting today. Pure derivation — no extra
// network calls, just reuses whatever the dashboard already fetched.

import { Link } from 'wouter';
import { AlertTriangle, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

type ReminderTask = {
  id?: string;
  taskId?: string;
  title?: string;
  status?: string;
  priority?: string;
  dueDate?: string | number;
};

type ReminderMeeting = {
  id?: string;
  meetingId?: string;
  title?: string;
  scheduledAt?: string;
  startTime?: string;
  startAt?: string;
  status?: string;
};

interface SmartRemindersWidgetProps {
  tasks: ReminderTask[];
  meetings: ReminderMeeting[];
  // Routes vary by role — board members live under /board/*. Caller passes
  // the right roots so the widget links to a page the user can actually open.
  taskRoute?: string;
  meetingRoute?: string;
}

function toDate(v?: string | number): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isActiveStatus(status?: string): boolean {
  const s = (status ?? '').toUpperCase();
  return s !== 'COMPLETED' && s !== 'CANCELLED';
}

export function SmartRemindersWidget({
  tasks,
  meetings,
  taskRoute = '/tasks',
  meetingRoute = '/meetings',
}: SmartRemindersWidgetProps) {
  const now = Date.now();

  const taskBuckets = (() => {
    const overdue: ReminderTask[] = [];
    const today: ReminderTask[] = [];
    const tomorrow: ReminderTask[] = [];
    for (const t of tasks) {
      if (!isActiveStatus(t.status)) continue;
      const d = toDate(t.dueDate);
      if (!d) continue;
      if (d.getTime() < now && !isToday(d)) overdue.push(t);
      else if (isToday(d)) today.push(t);
      else if (isTomorrow(d)) tomorrow.push(t);
    }
    return { overdue, today, tomorrow };
  })();

  const meetingsToday = meetings
    .filter((m) => {
      const status = (m.status ?? '').toUpperCase();
      if (status === 'CANCELLED' || status === 'COMPLETED') return false;
      const d = toDate(m.scheduledAt ?? m.startTime ?? m.startAt);
      return d ? isToday(d) : false;
    })
    .slice(0, 3);

  const totalAlerts =
    taskBuckets.overdue.length + taskBuckets.today.length + meetingsToday.length;

  if (totalAlerts === 0 && taskBuckets.tomorrow.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-foreground">Nothing urgent</p>
        <p className="text-xs text-muted-foreground mt-1">No deadlines in the next 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {taskBuckets.overdue.length > 0 && (
        <ReminderGroup
          tone="rose"
          icon={AlertTriangle}
          label={`${taskBuckets.overdue.length} overdue task${taskBuckets.overdue.length === 1 ? '' : 's'}`}
          items={taskBuckets.overdue.slice(0, 3).map((t) => ({
            id: t.id ?? t.taskId ?? t.title ?? '',
            title: t.title ?? 'Untitled task',
            meta: t.dueDate ? `Was due ${format(toDate(t.dueDate)!, 'MMM d')}` : 'No due date',
            href: taskRoute,
          }))}
          moreCount={Math.max(0, taskBuckets.overdue.length - 3)}
          moreHref={taskRoute}
        />
      )}

      {meetingsToday.length > 0 && (
        <ReminderGroup
          tone="indigo"
          icon={Calendar}
          label={`${meetingsToday.length} meeting${meetingsToday.length === 1 ? '' : 's'} today`}
          items={meetingsToday.map((m) => {
            const d = toDate(m.scheduledAt ?? m.startTime ?? m.startAt);
            return {
              id: m.id ?? m.meetingId ?? m.title ?? '',
              title: m.title ?? 'Untitled meeting',
              meta: d ? format(d, 'p') : 'Today',
              href: meetingRoute,
            };
          })}
          moreCount={0}
          moreHref={meetingRoute}
        />
      )}

      {taskBuckets.today.length > 0 && (
        <ReminderGroup
          tone="amber"
          icon={Clock}
          label={`${taskBuckets.today.length} task${taskBuckets.today.length === 1 ? '' : 's'} due today`}
          items={taskBuckets.today.slice(0, 3).map((t) => ({
            id: t.id ?? t.taskId ?? t.title ?? '',
            title: t.title ?? 'Untitled task',
            meta: t.priority ? `${t.priority.toLowerCase()} priority` : 'Today',
            href: taskRoute,
          }))}
          moreCount={Math.max(0, taskBuckets.today.length - 3)}
          moreHref={taskRoute}
        />
      )}

      {taskBuckets.tomorrow.length > 0 && (
        <ReminderGroup
          tone="slate"
          icon={Clock}
          label={`${taskBuckets.tomorrow.length} task${taskBuckets.tomorrow.length === 1 ? '' : 's'} due tomorrow`}
          items={taskBuckets.tomorrow.slice(0, 2).map((t) => ({
            id: t.id ?? t.taskId ?? t.title ?? '',
            title: t.title ?? 'Untitled task',
            meta: t.priority ? `${t.priority.toLowerCase()} priority` : 'Tomorrow',
            href: taskRoute,
          }))}
          moreCount={Math.max(0, taskBuckets.tomorrow.length - 2)}
          moreHref={taskRoute}
        />
      )}
    </div>
  );
}

const TONE_STYLES = {
  rose:   { bg: 'bg-rose-50 dark:bg-rose-950/20',     ring: 'border-rose-200 dark:border-rose-900/50',     text: 'text-rose-700 dark:text-rose-400',     icon: 'text-rose-600 dark:text-rose-400' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/20',   ring: 'border-amber-200 dark:border-amber-900/50',   text: 'text-amber-700 dark:text-amber-400',   icon: 'text-amber-600 dark:text-amber-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/20', ring: 'border-indigo-200 dark:border-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-400', icon: 'text-indigo-600 dark:text-indigo-400' },
  slate:  { bg: 'bg-slate-50 dark:bg-slate-900/40',   ring: 'border-slate-200 dark:border-slate-700/60',   text: 'text-slate-700 dark:text-slate-300',   icon: 'text-slate-500 dark:text-slate-400' },
} as const;

function ReminderGroup({
  tone, icon: Icon, label, items, moreCount, moreHref,
}: {
  tone: keyof typeof TONE_STYLES;
  icon: React.ElementType;
  label: string;
  items: { id: string; title: string; meta: string; href: string }[];
  moreCount: number;
  moreHref: string;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={`rounded-2xl border ${styles.ring} ${styles.bg} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${styles.icon}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>{label}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="block">
            <div className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-black/20 transition-colors">
              <span className="text-sm font-medium text-foreground truncate flex-1">{item.title}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{item.meta}</span>
            </div>
          </Link>
        ))}
        {moreCount > 0 && (
          <Link href={moreHref} className={`block text-[11px] font-semibold ${styles.text} hover:underline px-2 py-1`}>
            + {moreCount} more
          </Link>
        )}
      </div>
    </div>
  );
}
