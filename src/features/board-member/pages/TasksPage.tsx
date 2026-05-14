'use client';

import { useState, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';
import { CheckSquare, Clock, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasks, useUpdateTask } from '@/hooks/api';
import type { Task as ApiTask, TaskStatus, TaskPriority, UpdateTaskData } from '@/types/api.types';
import { SearchBar, EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { cn } from '@/lib/utils';

// View model. `status` mirrors the backend enum exactly; `isOverdue` is
// derived at adapt time because the wire format has no OVERDUE status —
// anything past `dueDate` that isn't COMPLETED or CANCELLED counts.
type TaskView = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: number;
  assigneeId?: string;
  createdBy?: string;
  completedAt?: number;
  createdAt?: string;
  updatedAt?: string;
  isOverdue: boolean;
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  REVIEW: 'bg-violet-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-zinc-500',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_CHIP: Record<TaskPriority, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const PRIORITY_RANK: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// Map a wire-format Task onto the view model used by this page. The previous
// implementation hard-coded an OVERDUE status that the API never emits, so
// the badge silently never lit up. Derive it from `dueDate` instead.
function adaptApiTask(api: ApiTask): TaskView {
  const dueDate = typeof api.dueDate === 'number' ? api.dueDate : undefined;
  const status = (api.status?.toUpperCase() as TaskStatus) ?? 'TODO';
  const priority = (api.priority?.toUpperCase() as TaskPriority) ?? 'MEDIUM';
  const isOverdue =
    typeof dueDate === 'number' &&
    dueDate < Date.now() &&
    status !== 'COMPLETED' &&
    status !== 'CANCELLED';
  return {
    id: api.id,
    title: api.title ?? '',
    description: api.description,
    status,
    priority,
    dueDate,
    assigneeId: api.assigneeId,
    createdBy: api.createdBy,
    completedAt: api.completedAt,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    isOverdue,
  };
}

export function TasksPage() {
  const { data } = useTasks();
  const updateTask = useUpdateTask();

  const tasks = useMemo<TaskView[]>(
    () => unwrapList<ApiTask>(data).map(adaptApiTask),
    [data],
  );

  const [search, setSearch] = useState('');
  // `active` = anything not COMPLETED and not CANCELLED.
  const [filter, setFilter] = useState<'active' | 'all' | TaskStatus | 'overdue'>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [selected, setSelected] = useState<TaskView | null>(null);

  const filtered = useMemo(
    () =>
      tasks
        .filter((t) => {
          const q = search.trim().toLowerCase();
          const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);

          const matchFilter =
            filter === 'all' ? true
            : filter === 'active' ? t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
            : filter === 'overdue' ? t.isOverdue
            : t.status === filter;

          const matchPriority = priorityFilter === 'all' ? true : t.priority === priorityFilter;

          const due = t.dueDate ?? null;
          // eslint-disable-next-line react-hooks/purity
          const now = Date.now();
          const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
          const matchDeadline =
            deadlineFilter === 'all'
              ? true
              : deadlineFilter === 'today'
                ? Boolean(due && isToday(new Date(due)))
                : deadlineFilter === 'week'
                  ? Boolean(due && due >= now && due <= sevenDays)
                  : t.isOverdue;

          return matchSearch && matchFilter && matchPriority && matchDeadline;
        })
        .sort((a, b) => {
          const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          if (pr !== 0) return pr;
          return (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity);
        }),
    [tasks, search, filter, priorityFilter, deadlineFilter],
  );

  // The old `safeUpdate` shipped `progress`, `notes`, `reminderAt`,
  // `deliverables` — none of those are on UpdateTaskData, so the backend was
  // dropping them while the UI cheerfully reported success. Type-tighten the
  // patch so the compiler catches that class of bug from now on.
  const safeUpdate = (id: string | undefined, patch: UpdateTaskData, successMsg?: string) => {
    if (!id) {
      toast.error('Task id missing');
      return;
    }
    updateTask.mutate(
      { taskId: id, data: patch },
      {
        onSuccess: () => { if (successMsg) toast.success(successMsg); },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } }; message?: string })
            ?.response?.data?.message ?? (err as Error)?.message ?? 'Update failed';
          toast.error(msg);
        },
      },
    );
  };

  const startTask = (task: TaskView) =>
    safeUpdate(task.id, { status: 'IN_PROGRESS' }, 'Task started');

  const sendToReview = (task: TaskView) =>
    safeUpdate(task.id, { status: 'REVIEW' }, 'Sent for review');

  const completeTask = (task: TaskView) =>
    // eslint-disable-next-line react-hooks/purity
    safeUpdate(task.id, { status: 'COMPLETED', completedAt: Date.now() }, 'Task completed');

  const requestExtension = (task: TaskView) => {
    // eslint-disable-next-line react-hooks/purity
    const base = typeof task.dueDate === 'number' ? task.dueDate : Date.now();
    const extended = base + 2 * 24 * 60 * 60 * 1000;
    safeUpdate(task.id, { dueDate: extended }, 'Due date extended (+2 days)');
  };

  // Counts — derived against the real wire enum, not the fictional OVERDUE
  // status that the old code looked for.
  const activeCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <MemberPortalLayout icon={CheckSquare} title="My Tasks" color="bg-emerald-600" subtitle="Action items and status">
      <div className="mb-6 rounded-[28px] border border-border/60 bg-card/90 p-5 sm:p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Member task board</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">Track what's assigned to you</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Move tasks through the workflow — To Do → In Progress → Review → Completed — without leaving the page.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:w-[420px]">
            {[
              { label: 'Active', value: activeCount, tone: 'from-emerald-500 to-teal-500' },
              { label: 'Overdue', value: overdueCount, tone: 'from-rose-500 to-rose-600' },
              { label: 'Done', value: completedCount, tone: 'from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-300' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                <div className={cn('mt-2 inline-flex items-center rounded-xl bg-gradient-to-r px-3 py-1.5 text-lg font-black text-white', item.tone)}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center shadow-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" />
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as 'all' | TaskPriority)}>
          <SelectTrigger className="h-10 w-full text-sm shrink-0 sm:w-40 rounded-xl"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any priority</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deadlineFilter} onValueChange={(v) => setDeadlineFilter(v as typeof deadlineFilter)}>
          <SelectTrigger className="h-10 w-full text-sm shrink-0 sm:w-44 rounded-xl"><SelectValue placeholder="Deadline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any deadline</SelectItem>
            <SelectItem value="today">Due today</SelectItem>
            <SelectItem value="week">Due this week</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="h-10 w-full text-sm shrink-0 sm:w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All tasks</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="REVIEW">Review</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={filter === 'active' ? 'All caught up!' : 'No tasks found'}
          sub={filter === 'active' ? 'No active tasks assigned to you.' : undefined}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={cn(
                'group rounded-3xl border bg-card/90 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer overflow-hidden',
                t.isOverdue ? 'border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10' : 'border-border/60',
              )}
              onClick={() => setSelected(t)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1', PRIORITY_CHIP[t.priority])}>
                        <Flag className="h-2.5 w-2.5" />{PRIORITY_LABEL[t.priority]}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : t.status === 'CANCELLED'
                            ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                            : 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
                      )}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[t.status]}`} />
                        {STATUS_LABEL[t.status]}
                      </span>
                      {t.isOverdue && <span className="text-[10px] font-bold text-red-600">OVERDUE</span>}
                    </div>
                    <p className={cn(
                      'font-semibold text-base leading-snug',
                      t.status === 'COMPLETED' || t.status === 'CANCELLED' ? 'line-through text-muted-foreground' : 'text-foreground',
                    )}>
                      {t.title}
                    </p>
                    {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    {t.status === 'REVIEW' && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        Awaiting admin approval
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {typeof t.dueDate === 'number' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
                          <Clock className="h-3 w-3" />
                          Due {isToday(new Date(t.dueDate)) ? 'Today' : format(new Date(t.dueDate), 'MMM d')}
                        </span>
                      )}
                      {t.createdBy && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
                          Assigned by {t.createdBy}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    {t.status === 'TODO' && (
                      <Button size="sm" variant="outline" className="h-8 rounded-full px-4 text-xs"
                        onClick={() => startTask(t)} disabled={updateTask.isPending}>
                        Start
                      </Button>
                    )}
                    {t.status === 'IN_PROGRESS' && (
                      <Button size="sm" variant="outline" className="h-8 rounded-full px-4 text-xs"
                        onClick={() => sendToReview(t)} disabled={updateTask.isPending}>
                        Send to Review
                      </Button>
                    )}
                    {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                      <Button size="sm" className="h-8 rounded-full bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-700"
                        onClick={() => completeTask(t)} disabled={updateTask.isPending}>
                        Complete
                      </Button>
                    )}
                    {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && typeof t.dueDate === 'number' && (
                      <Button size="sm" variant="outline" className="h-8 rounded-full px-4 text-xs"
                        onClick={() => requestExtension(t)} disabled={updateTask.isPending}>
                        Extend (+2d)
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 rounded-full px-4 text-xs"
                      onClick={() => setSelected(t)}>
                      Open
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl border-border/60 p-0 bg-background/95 shadow-2xl">
          {selected && (
            <>
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5 text-white">
                <DialogHeader className="space-y-2 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">Member task</span>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">{STATUS_LABEL[selected.status]}</span>
                    {selected.isOverdue && (
                      <span className="rounded-full bg-red-500/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">Overdue</span>
                    )}
                  </div>
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-white">{selected.title}</DialogTitle>
                  <DialogDescription className="text-sm text-white/85">
                    {selected.createdBy ? `Assigned by ${selected.createdBy}` : 'Task details'}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="space-y-5 px-6 py-5">
                {selected.description && (
                  <p className="text-sm leading-7 text-muted-foreground">{selected.description}</p>
                )}

                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Status</Label>
                  <Select
                    value={selected.status}
                    onValueChange={(v) => {
                      const next = v as TaskStatus;
                      const patch: UpdateTaskData = { status: next };
                      if (next === 'COMPLETED') patch.completedAt = Date.now();
                      safeUpdate(selected.id, patch, `Moved to ${STATUS_LABEL[next]}`);
                      setSelected({ ...selected, status: next });
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="inline-flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                            {STATUS_LABEL[s]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Description</Label>
                  <Textarea
                    defaultValue={selected.description ?? ''}
                    rows={4}
                    className="text-sm resize-none rounded-xl"
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next === (selected.description ?? '')) return;
                      safeUpdate(selected.id, { description: next || undefined }, 'Description updated');
                    }}
                    placeholder="Add details…"
                  />
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start justify-between gap-3">
                      <span>Created</span>
                      <span>{selected.createdAt ? format(new Date(selected.createdAt), 'MMM d, p') : 'N/A'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Last updated</span>
                      <span>{selected.updatedAt ? format(new Date(selected.updatedAt), 'MMM d, p') : 'N/A'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Due date</span>
                      <span>{typeof selected.dueDate === 'number' ? format(new Date(selected.dueDate), 'MMM d, p') : 'N/A'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span>Completed</span>
                      <span>{typeof selected.completedAt === 'number' ? format(new Date(selected.completedAt), 'MMM d, p') : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 pb-6 pt-0">
                <Button variant="outline" className="rounded-xl px-5" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
  );
}
