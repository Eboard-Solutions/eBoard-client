import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/api/useTasks';
import { useOrganisationUsers } from '@/hooks/api/useUsers';
import { toast } from 'sonner';
import {
  Plus, Search, CalendarDays, CheckCircle2, Loader2,
  LayoutList, Columns3, Pencil, Trash2, Flag,
  ClipboardList, CircleDot, Eye, CheckCheck, MoreVertical, X,
  TrendingUp, Clock, ListChecks, Activity, User2,
  CalendarClock, Info, ArrowRight, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task, CreateTaskData, UpdateTaskData, User as ApiUser } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus   = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

interface TaskDisplay {
  id: string; title: string; description?: string;
  status: TaskStatus; priority: TaskPriority;
  dueDate: number; assigneeId?: string; assignee?: ApiUser;
}

interface TaskForm {
  title: string; description: string; status: TaskStatus;
  priority: TaskPriority; assigneeId: string; dueDateStr: string;
}

const BLANK: TaskForm = {
  title: '', description: '', status: 'TODO',
  priority: 'MEDIUM', assigneeId: '', dueDateStr: '',
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const P: Record<TaskPriority, { label: string; bar: string; chip: string; dot: string; detailBg: string }> = {
  URGENT: {
    label: 'Urgent', bar: 'bg-red-500', dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    detailBg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  },
  HIGH: {
    label: 'High', bar: 'bg-orange-500', dot: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
    detailBg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  },
  MEDIUM: {
    label: 'Medium', bar: 'bg-amber-400', dot: 'bg-amber-400',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    detailBg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  },
  LOW: {
    label: 'Low', bar: 'bg-emerald-500', dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    detailBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  },
};

const S: Record<TaskStatus, {
  label: string; icon: React.ReactNode;
  accent: string; pillBg: string; pillText: string; pillRing: string;
  colBg: string; colHeader: string; bar: string;
  detailGrad: string;
}> = {
  TODO: {
    label: 'To Do', icon: <ClipboardList className="h-4 w-4" />,
    accent: 'text-slate-500 dark:text-slate-400',
    pillBg: 'bg-slate-100 dark:bg-slate-800', pillText: 'text-slate-600 dark:text-slate-300',
    pillRing: 'ring-slate-300 dark:ring-slate-600',
    colBg: 'bg-slate-50 dark:bg-slate-900/50', colHeader: 'text-slate-600 dark:text-slate-300',
    bar: 'bg-slate-400', detailGrad: 'from-slate-600 to-slate-800',
  },
  IN_PROGRESS: {
    label: 'In Progress', icon: <CircleDot className="h-4 w-4" />,
    accent: 'text-blue-500',
    pillBg: 'bg-blue-50 dark:bg-blue-900/40', pillText: 'text-blue-600 dark:text-blue-400',
    pillRing: 'ring-blue-300 dark:ring-blue-700',
    colBg: 'bg-blue-50/70 dark:bg-blue-950/30', colHeader: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500', detailGrad: 'from-blue-500 to-blue-700',
  },
  REVIEW: {
    label: 'Review', icon: <Eye className="h-4 w-4" />,
    accent: 'text-violet-500',
    pillBg: 'bg-violet-50 dark:bg-violet-900/40', pillText: 'text-violet-600 dark:text-violet-400',
    pillRing: 'ring-violet-300 dark:ring-violet-700',
    colBg: 'bg-violet-50/70 dark:bg-violet-950/30', colHeader: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500', detailGrad: 'from-violet-500 to-violet-700',
  },
  COMPLETED: {
    label: 'Completed', icon: <CheckCheck className="h-4 w-4" />,
    accent: 'text-emerald-500',
    pillBg: 'bg-emerald-50 dark:bg-emerald-900/40', pillText: 'text-emerald-600 dark:text-emerald-400',
    pillRing: 'ring-emerald-300 dark:ring-emerald-700',
    colBg: 'bg-emerald-50/70 dark:bg-emerald-950/30', colHeader: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500', detailGrad: 'from-emerald-500 to-emerald-700',
  },
};

const STATS = [
  { status: 'TODO'        as TaskStatus, Icon: ListChecks,   grad: 'from-slate-600 to-slate-800',     glow: 'shadow-slate-200 dark:shadow-slate-900' },
  { status: 'IN_PROGRESS' as TaskStatus, Icon: TrendingUp,   grad: 'from-blue-500 to-blue-700',       glow: 'shadow-blue-200/70 dark:shadow-blue-900' },
  { status: 'REVIEW'      as TaskStatus, Icon: Clock,        grad: 'from-violet-500 to-violet-700',   glow: 'shadow-violet-200/70 dark:shadow-violet-900' },
  { status: 'COMPLETED'   as TaskStatus, Icon: CheckCircle2, grad: 'from-emerald-500 to-emerald-700', glow: 'shadow-emerald-200/70 dark:shadow-emerald-900' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dueFmt(ts: number) {
  const d = Math.ceil((ts - Date.now()) / 86_400_000);
  if (d < 0)   return { text: 'Overdue',      cls: 'text-red-500 font-bold',    urgent: true };
  if (d === 0) return { text: 'Due Today',     cls: 'text-orange-500 font-bold', urgent: true };
  if (d === 1) return { text: 'Due Tomorrow',  cls: 'text-amber-600',            urgent: false };
  return {
    text: new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    cls: 'text-muted-foreground', urgent: false,
  };
}
function dueFmtShort(ts: number) {
  const d = Math.ceil((ts - Date.now()) / 86_400_000);
  if (d < 0)   return { text: 'Overdue',     cls: 'text-red-500 font-bold' };
  if (d === 0) return { text: 'Due Today',   cls: 'text-orange-500 font-bold' };
  if (d === 1) return { text: 'Due Tomorrow',cls: 'text-amber-600' };
  return { text: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cls: 'text-muted-foreground' };
}
const toTs  = (s?: string) => { if (!s) return undefined; const t = new Date(s).getTime(); return isNaN(t) ? undefined : t; };
const toStr = (ts?: number) => ts ? new Date(ts).toISOString().split('T')[0] : '';

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({ task, users, open, onClose, onEdit, onDelete, onStatusChange }: {
  task: TaskDisplay | null;
  users: ApiUser[];
  open: boolean;
  onClose: () => void;
  onEdit: (t: TaskDisplay) => void;
  onDelete: (t: TaskDisplay) => void;
  onStatusChange: (t: TaskDisplay, s: TaskStatus) => void;
}) {
  if (!task) return null;

  const assignee = users.find((u) => u.userId === task.assigneeId);
  const due      = dueFmt(task.dueDate);
  const pCfg     = P[task.priority] ?? P.MEDIUM;
  const sCfg     = S[task.status]   ?? S.TODO;
  const done     = task.status === 'COMPLETED';

  const cycle: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'];
  const currentIdx = cycle.indexOf(task.status);
  const nextStatus = cycle[(currentIdx + 1) % cycle.length];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg w-full rounded-3xl p-0 overflow-hidden gap-0">

        {/* ── Hero header ── */}
        <div className={`relative bg-gradient-to-br ${sCfg.detailGrad} px-6 pt-6 pb-8`}>
          {/* Decorative blobs */}
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-8 bottom-0 h-16 w-16 rounded-full bg-black/10 pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Status badge */}
          <div className="relative flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              {sCfg.icon}
            </div>
            <span className="text-sm font-semibold text-white/80">{sCfg.label}</span>
          </div>

          {/* Title */}
          <h2 className={`relative text-xl font-bold text-white leading-snug pr-8 ${done ? 'line-through opacity-70' : ''}`}>
            {task.title}
          </h2>

          {/* Priority chip */}
          <div className="relative mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
              <Flag className="h-3 w-3" />
              {pCfg.label} Priority
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold ${due.urgent ? 'bg-red-500/40' : ''}`}>
              <CalendarDays className="h-3 w-3" />
              {due.text}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5 bg-background">

          {/* Description */}
          {task.description ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Description
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-xl px-4 py-3 border border-border/40">
                {task.description}
              </p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic bg-muted/30 rounded-xl px-4 py-3 border border-border/30">
              No description provided.
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-4">

            {/* Assignee */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <User2 className="h-3.5 w-3.5" /> Assigned To
              </p>
              {assignee ? (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarImage src={assignee.profilePictureUrl} />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {(assignee.firstName?.[0] ?? '') + (assignee.lastName?.[0] ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{assignee.firstName} {assignee.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{assignee.email ?? assignee.role}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
                  <User2 className="h-5 w-5 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                </div>
              )}
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Due Date
              </p>
              <div className={`p-2.5 rounded-xl border ${due.urgent ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-muted/40 border-border/40'}`}>
                <p className={`text-sm font-semibold ${due.cls}`}>{due.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
            </div>
          </div>

          {/* Status pipeline */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Progress Pipeline</p>
            <div className="flex items-center gap-1.5">
              {cycle.map((st, idx) => {
                const isDone  = idx < currentIdx;
                const isActive = idx === currentIdx;
                const cfg = S[st];
                return (
                  <div key={st} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={`
                      flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-xl border text-center transition-all
                      ${isActive  ? `${cfg.pillBg} ${cfg.pillRing} ring-1 border-transparent` : ''}
                      ${isDone    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : ''}
                      ${!isActive && !isDone ? 'bg-muted/30 border-border/30' : ''}
                    `}>
                      <span className={`${isActive ? cfg.accent : isDone ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
                        {isDone ? <CheckCheck className="h-3.5 w-3.5" /> : cfg.icon}
                      </span>
                      <span className={`text-[10px] font-semibold leading-none ${isActive ? cfg.pillText : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/50'}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {idx < cycle.length - 1 && (
                      <ArrowRight className={`h-3 w-3 shrink-0 ${idx < currentIdx ? 'text-emerald-400' : 'text-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            {/* Advance status */}
            {!done && (
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-sm gap-2 border-border/60"
                onClick={() => { onStatusChange(task, nextStatus); onClose(); }}
              >
                <span className={S[nextStatus].accent}>{S[nextStatus].icon}</span>
                Move to {S[nextStatus].label}
              </Button>
            )}

            <Button
              variant="outline"
              className="flex-1 rounded-xl text-sm gap-2 border-border/60"
              onClick={() => { onClose(); onEdit(task); }}
            >
              <Pencil className="h-4 w-4" /> Edit Task
            </Button>

            <Button
              variant="outline"
              className="flex-1 rounded-xl text-sm gap-2 border-red-200 dark:border-red-800 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => { onClose(); onDelete(task); }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Form Fields ─────────────────────────────────────────────────────────

function TaskFormFields({ form, onChange, users }: {
  form: TaskForm; onChange: (f: TaskForm) => void; users: ApiUser[];
}) {
  const set = (p: Partial<TaskForm>) => onChange({ ...form, ...p });
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';
  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';

  return (
    <div className="space-y-5">
      <div>
        <label className={lbl}>Title <span className="text-red-500 normal-case text-sm">*</span></label>
        <Input placeholder="What needs to be done?" value={form.title}
          onChange={(e) => set({ title: e.target.value })} className={inp} />
      </div>
      <div>
        <label className={lbl}>Description</label>
        <Textarea placeholder="Add context or details…" rows={3} value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          className="resize-none rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Assign To <span className="text-red-500 normal-case text-sm">*</span></label>
          <Select value={form.assigneeId} onValueChange={(v) => set({ assigneeId: v })}>
            <SelectTrigger className={inp}><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.userId} value={u.userId}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6"><AvatarImage src={u.profilePictureUrl} />
                      <AvatarFallback className="text-[10px]">{(u.firstName?.[0]??'')+(u.lastName?.[0]??'')}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{u.firstName} {u.lastName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={lbl}>Priority</label>
          <Select value={form.priority} onValueChange={(v) => set({ priority: v as TaskPriority })}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(P) as TaskPriority[]).map((k) => (
                <SelectItem key={k} value={k}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${P[k].dot}`} />
                    <span className="text-sm">{P[k].label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Status</label>
          <Select value={form.status} onValueChange={(v) => set({ status: v as TaskStatus })}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(S) as TaskStatus[]).map((k) => (
                <SelectItem key={k} value={k}>
                  <div className={`flex items-center gap-2 ${S[k].accent}`}>
                    {S[k].icon}<span className="text-sm text-foreground">{S[k].label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={lbl}>Due Date <span className="text-red-500 normal-case text-sm">*</span></label>
          <Input type="date" value={form.dueDateStr}
            onChange={(e) => set({ dueDateStr: e.target.value })} className={inp} />
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, users, onEdit, onDelete, onStatusChange, onView, compact }: {
  task: TaskDisplay; users: ApiUser[];
  onEdit: (t: TaskDisplay) => void;
  onDelete: (t: TaskDisplay) => void;
  onStatusChange: (t: TaskDisplay, s: TaskStatus) => void;
  onView: (t: TaskDisplay) => void;
  compact?: boolean;
}) {
  const assignee = users.find((u) => u.userId === task.assigneeId);
  const due      = dueFmtShort(task.dueDate);
  const pCfg     = P[task.priority] ?? P.MEDIUM;
  const sCfg     = S[task.status]   ?? S.TODO;
  const done     = task.status === 'COMPLETED';

  return (
    <div className={`
      group relative bg-card rounded-2xl border border-border/50 overflow-hidden
      hover:border-border hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]
      hover:-translate-y-0.5 transition-all duration-200
      ${done ? 'opacity-65' : ''}
    `}>
      {/* Priority accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-2xl ${pCfg.bar}`} />

      <div className={`pl-5 pr-4 ${compact ? 'py-3.5' : 'py-4'}`}>
        <div className="flex items-start gap-3.5">

          {/* Status cycle button */}
          <button
            onClick={() => {
              const cycle: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'];
              onStatusChange(task, cycle[(cycle.indexOf(task.status) + 1) % cycle.length]);
            }}
            title={`Status: ${sCfg.label} — click to advance`}
            className={`
              mt-0.5 shrink-0 h-7 w-7 rounded-full flex items-center justify-center
              ${sCfg.pillBg} ${sCfg.accent} ring-1 ${sCfg.pillRing}
              hover:scale-110 hover:ring-2 transition-all duration-150
            `}
          >
            {sCfg.icon}
          </button>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p
                className={`font-semibold text-[15px] leading-snug cursor-pointer hover:text-primary transition-colors ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                onClick={() => onView(task)}
              >
                {task.title}
              </p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <DropdownMenuItem className="text-sm gap-2" onClick={() => onView(task)}>
                    <ExternalLink className="h-4 w-4" /> View details
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-sm gap-2" onClick={() => onEdit(task)}>
                    <Pencil className="h-4 w-4" /> Edit task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(Object.keys(S) as TaskStatus[]).filter((st) => st !== task.status).map((st) => (
                    <DropdownMenuItem key={st} className="text-sm gap-2" onClick={() => onStatusChange(task, st)}>
                      <span className={`${S[st].accent} flex items-center gap-2`}>
                        {S[st].icon}
                        <span className="text-foreground">Move to {S[st].label}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-sm gap-2 text-destructive focus:text-destructive" onClick={() => onDelete(task)}>
                    <Trash2 className="h-4 w-4" /> Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description (list mode only) */}
            {!compact && task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Meta + View Details button row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${pCfg.chip}`}>
                  <Flag className="h-3 w-3" />{pCfg.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs ${due.cls}`}>
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />{due.text}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Assignee avatar */}
                {assignee && (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6 ring-1 ring-border">
                      <AvatarImage src={assignee.profilePictureUrl} />
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                        {(assignee.firstName?.[0] ?? '') + (assignee.lastName?.[0] ?? '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                      {assignee.firstName}
                    </span>
                  </div>
                )}

                {/* View Details button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(task)}
                  className="h-7 px-2.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Details</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ status, tasks, users, onEdit, onDelete, onStatusChange, onView }: {
  status: TaskStatus; tasks: TaskDisplay[]; users: ApiUser[];
  onEdit: (t: TaskDisplay) => void;
  onDelete: (t: TaskDisplay) => void;
  onStatusChange: (t: TaskDisplay, s: TaskStatus) => void;
  onView: (t: TaskDisplay) => void;
}) {
  const cfg = S[status];
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className={`rounded-2xl border border-border/40 px-4 py-3.5 ${cfg.colBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.bar}`} />
            <span className={`text-sm font-bold ${cfg.colHeader}`}>{cfg.label}</span>
          </div>
          <span className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ring-1 ${cfg.pillBg} ${cfg.pillText} ${cfg.pillRing}`}>
            {tasks.length}
          </span>
        </div>
        <div className="mt-3 h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${cfg.bar} opacity-60 transition-all duration-700`}
            style={{ width: tasks.length > 0 ? '100%' : '4px' }} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} users={users}
            onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onView={onView} compact />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border/30 py-10 px-4 text-center">
            <div className={`mx-auto mb-3 h-10 w-10 rounded-xl ${cfg.pillBg} ${cfg.accent} flex items-center justify-center`}>
              {cfg.icon}
            </div>
            <p className="text-sm text-muted-foreground">No tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Tasks() {
  const [search, setSearch]         = useState('');
  const [view, setView]             = useState<'list' | 'kanban'>('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask]     = useState<TaskDisplay | null>(null);
  const [delTarget, setDelTarget]   = useState<TaskDisplay | null>(null);
  const [viewTask, setViewTask]     = useState<TaskDisplay | null>(null);  // ← new
  const [createForm, setCreateForm] = useState<TaskForm>(BLANK);
  const [editForm, setEditForm]     = useState<TaskForm>(BLANK);

  const { data: tasksData, isLoading, error } = useTasks();
  const { data: usersData }                   = useOrganisationUsers();
  const createM = useCreateTask();
  const updateM = useUpdateTask();
  const deleteM = useDeleteTask();

  const rawTasks: Task[]   = Array.isArray(tasksData) ? tasksData : (tasksData as { items?: Task[] })?.items ?? [];
  const users:   ApiUser[] = Array.isArray(usersData) ? usersData : (usersData as { items?: ApiUser[] })?.items ?? [];

  const tasks: TaskDisplay[] = rawTasks.map((t) => ({
    id: t.id, title: t.title, description: t.description,
    status:   (t.status?.toUpperCase()   as TaskStatus)   ?? 'TODO',
    priority: (t.priority?.toUpperCase() as TaskPriority) ?? 'MEDIUM',
    dueDate:  typeof t.dueDate === 'number' ? t.dueDate : new Date(t.dueDate ?? Date.now()).getTime(),
    assigneeId: t.assigneeId,
    assignee:   t.assignee as unknown as ApiUser | undefined,
  }));

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()));
  const byS    = (s: TaskStatus) => filtered.filter((t) => t.status === s);
  const todo   = byS('TODO');
  const inProg = byS('IN_PROGRESS');
  const rev    = byS('REVIEW');
  const done   = byS('COMPLETED');

  const validate = (f: TaskForm) => {
    if (!f.title.trim()) return 'Task title is required';
    if (!f.assigneeId)   return 'Please assign the task to a member';
    if (!f.dueDateStr)   return 'Due date is required';
    return null;
  };

  async function handleCreate() {
    const e = validate(createForm); if (e) { toast.error(e); return; }
    try {
      await createM.mutateAsync({
        title: createForm.title.trim(), description: createForm.description.trim() || undefined,
        status: createForm.status, priority: createForm.priority,
        assigneeId: createForm.assigneeId, dueDate: toTs(createForm.dueDateStr)!,
      } as CreateTaskData);
      toast.success('Task created'); setCreateOpen(false); setCreateForm(BLANK);
    } catch { toast.error('Failed to create task'); }
  }

  function openEdit(t: TaskDisplay) {
    setEditForm({ title: t.title, description: t.description ?? '', status: t.status,
      priority: t.priority, assigneeId: t.assigneeId ?? '', dueDateStr: toStr(t.dueDate) });
    setEditTask(t);
  }

  async function handleUpdate() {
    if (!editTask) return;
    const e = validate(editForm); if (e) { toast.error(e); return; }
    try {
      await updateM.mutateAsync({ taskId: editTask.id, data: {
        title: editForm.title.trim(), description: editForm.description.trim() || undefined,
        status: editForm.status, priority: editForm.priority,
        assigneeId: editForm.assigneeId, dueDate: toTs(editForm.dueDateStr)!,
      } as UpdateTaskData });
      toast.success('Task updated'); setEditTask(null);
    } catch { toast.error('Failed to update task'); }
  }

  async function handleStatusChange(t: TaskDisplay, s: TaskStatus) {
    try {
      await updateM.mutateAsync({ taskId: t.id, data: { status: s } });
      // Keep viewTask in sync if the detail modal is open for this task
      if (viewTask?.id === t.id) setViewTask({ ...t, status: s });
      toast.success(`Moved to ${S[s].label}`);
    } catch { toast.error('Failed to update'); }
  }

  async function handleDelete() {
    if (!delTarget) return;
    try {
      await deleteM.mutateAsync(delTarget.id);
      toast.success('Task deleted'); setDelTarget(null);
    } catch { toast.error('Failed to delete'); }
  }

  const cp = {
    users,
    onEdit: openEdit,
    onDelete: setDelTarget,
    onStatusChange: handleStatusChange,
    onView: setViewTask,
  };

  const Footer = ({ onCancel, onSubmit, busy, label }: {
    onCancel: () => void; onSubmit: () => void; busy: boolean; label: string;
  }) => (
    <div className="flex gap-3 justify-end pt-4 border-t border-border/40">
      <Button variant="outline" onClick={onCancel} disabled={busy} className="rounded-xl gap-2 text-sm px-5">
        <X className="h-4 w-4" /> Cancel
      </Button>
      <Button onClick={onSubmit} disabled={busy} className="rounded-xl min-w-[130px] text-sm gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
      </Button>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-32 gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-base text-muted-foreground">Loading tasks…</span>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center text-base text-destructive">
      Failed to load tasks. Please try again.
    </div>
  );

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800">
            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tasks.length} total &middot; <span className="text-blue-500 font-medium">{inProg.length} in progress</span> &middot; {todo.length} pending
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateForm(BLANK); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 rounded-xl self-start sm:self-auto shadow-sm text-sm font-semibold px-5">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl">Create New Task</DialogTitle>
              <DialogDescription className="text-sm">Fill in the details to create an action item.</DialogDescription>
            </DialogHeader>
            <TaskFormFields form={createForm} onChange={setCreateForm} users={users} />
            <Footer onCancel={() => setCreateOpen(false)} onSubmit={handleCreate} busy={createM.isPending} label="Create Task" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(({ status, Icon, grad, glow }) => {
          const cfg   = S[status];
          const count = byS(status).length;
          return (
            <div key={status} className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${grad} shadow-lg ${glow}`}>
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute right-3 -bottom-5 h-14 w-14 rounded-full bg-black/10 pointer-events-none" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-4xl font-bold text-white tabular-nums leading-none">{count}</p>
                  <p className="text-sm text-white/70 font-medium mt-1.5">{cfg.label}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks by title or description…"
            className="pl-11 h-11 rounded-xl border-border/60 text-sm bg-background"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/40 shrink-0">
          {(['list', 'kanban'] as const).map((m) => (
            <Button key={m} variant={view === m ? 'default' : 'ghost'}
              size="sm" onClick={() => setView(m)}
              className="h-9 gap-2 px-4 rounded-lg text-sm font-medium">
              {m === 'list' ? <LayoutList className="h-4 w-4" /> : <Columns3 className="h-4 w-4" />}
              <span className="hidden sm:inline capitalize">{m}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <Tabs defaultValue="all">
          <TabsList className="h-auto p-1 bg-muted/40 rounded-xl border border-border/30 gap-1 flex-wrap">
            {[
              { v: 'all',        l: 'All',         n: filtered.length },
              { v: 'todo',       l: 'To Do',       n: todo.length },
              { v: 'inprogress', l: 'In Progress', n: inProg.length },
              { v: 'review',     l: 'Review',      n: rev.length },
              { v: 'completed',  l: 'Completed',   n: done.length },
            ].map(({ v, l, n }) => (
              <TabsTrigger key={v} value={v}
                className="rounded-lg text-sm h-9 px-4 font-medium data-[state=active]:shadow-sm gap-2">
                {l}
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-border/50 text-xs font-bold">
                  {n}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {[
            { v: 'all',        items: filtered },
            { v: 'todo',       items: todo },
            { v: 'inprogress', items: inProg },
            { v: 'review',     items: rev },
            { v: 'completed',  items: done },
          ].map(({ v, items }) => (
            <TabsContent key={v} value={v} className="mt-4 space-y-2.5 focus-visible:outline-none">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground/70">
                      {v === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {v === 'completed' ? 'Tasks you complete will show up here.' : 'Create a task to get started.'}
                    </p>
                  </div>
                </div>
              ) : (
                items.map((t) => <TaskCard key={t.id} task={t} {...cp} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="overflow-x-auto -mx-1 px-1 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" style={{ minWidth: 'min(100%, 900px)' }}>
            {(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as TaskStatus[]).map((s) => (
              <KanbanColumn key={s} status={s} tasks={byS(s)} {...cp} />
            ))}
          </div>
        </div>
      )}

      {/* ── Task Detail Modal ── */}
      <TaskDetailModal
        task={viewTask}
        users={users}
        open={!!viewTask}
        onClose={() => setViewTask(null)}
        onEdit={(t) => { setViewTask(null); openEdit(t); }}
        onDelete={(t) => { setViewTask(null); setDelTarget(t); }}
        onStatusChange={handleStatusChange}
      />

      {/* Edit dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => { if (!o) setEditTask(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">Edit Task</DialogTitle>
            <DialogDescription className="text-sm">Update the details for this task.</DialogDescription>
          </DialogHeader>
          <TaskFormFields form={editForm} onChange={setEditForm} users={users} />
          <Footer onCancel={() => setEditTask(null)} onSubmit={handleUpdate} busy={updateM.isPending} label="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(o) => { if (!o) setDelTarget(null); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this task?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <span className="font-semibold text-foreground">"{delTarget?.title}"</span> will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-sm" disabled={deleteM.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteM.isPending}
              className="rounded-xl text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}