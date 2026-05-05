'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import {
  Megaphone, Plus, Search, Pin, Calendar,
  Loader2, Filter, X, AlertTriangle,
  Clock, Users, Edit3, Trash2, MoreHorizontal,
  CheckCircle2, Sparkles, ChevronDown, ChevronUp,
  Bell, TrendingUp, Eye, EyeOff,
} from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch }   from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAnnouncements, useCreateAnnouncement } from '@/hooks/api/useAnnouncements';
import { authService } from '@/lib/auth';
import type {
  CreateAnnouncementData, AnnouncementAudienceType, Announcement,
} from '@/types/api.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number | string): string {
  const date     = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  const diffMs   = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays}d ago`;
  return format(date, 'MMM d, yyyy');
}

function isExpired(ts?: number | string): boolean {
  if (!ts) return false;
  return isPast(typeof ts === 'number' ? new Date(ts) : new Date(ts));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// ─── Audience config ──────────────────────────────────────────────────────────

const AUDIENCE: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  ALL: {
    label:  'All Members',
    bg:     'bg-indigo-50 dark:bg-indigo-950/50',
    text:   'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    dot:    'bg-indigo-500',
  },
  BOARD_MEMBERS: {
    label:  'Board Members',
    bg:     'bg-emerald-50 dark:bg-emerald-950/50',
    text:   'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot:    'bg-emerald-500',
  },
  ADMINS: {
    label:  'Admins Only',
    bg:     'bg-violet-50 dark:bg-violet-950/50',
    text:   'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    dot:    'bg-violet-500',
  },
};

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm = () => ({
  title:        '',
  content:      '',
  isPinned:     false,
  audienceType: 'ALL' as AnnouncementAudienceType,
  expiresAt:    '',
});

type FormState = ReturnType<typeof defaultForm>;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = getInitials(name || 'U');
  const palette = [
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  ];
  const color = palette[(name?.charCodeAt(0) ?? 0) % palette.length];
  return (
    <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-[11px] font-bold shrink-0 ${color}`}>
      {initials}
    </span>
  );
}

// ─── Audience Badge ───────────────────────────────────────────────────────────

function AudienceBadge({ type }: { type?: string }) {
  const a = AUDIENCE[type ?? 'ALL'] ?? AUDIENCE.ALL;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border ${a.bg} ${a.text} ${a.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${a.dot}`} />
      {a.label}
    </span>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({
  ann, canManage, onEdit, onDelete,
}: {
  ann:       Announcement;
  canManage: boolean;
  onEdit:    (a: Announcement) => void;
  onDelete:  (a: Announcement) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expired = isExpired(ann.expiresAt);
  const isRead  = (ann as any).isRead as boolean | undefined;
  const isLong  = ann.content.length > 300;
  const name    = ann.publishedByName ?? 'Unknown';

  return (
    <article className={`
      group relative rounded-xl border transition-all duration-150
      ${expired
        ? 'border-border/40 bg-muted/30 opacity-60'
        : ann.isPinned
        ? 'border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-card shadow-sm'
        : 'border-border bg-white dark:bg-card hover:shadow-sm hover:border-border/80'
      }
    `}>
      {/* Pinned accent bar */}
      {ann.isPinned && !expired && (
        <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-indigo-500" />
      )}

      {/* Unread indicator */}
      {!isRead && !expired && (
        <span className="absolute top-[18px] right-[18px] h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-card" />
      )}

      <div className={`p-5 ${ann.isPinned && !expired ? 'pt-[22px]' : ''}`}>

        {/* Top: avatar + author + time + status chips + action menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar name={name} />
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-foreground leading-none">{name}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(ann.publishedAt)}</span>
                {ann.isPinned && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    <Pin className="h-2.5 w-2.5" />Pinned
                  </span>
                )}
                {expired && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                    <Clock className="h-2.5 w-2.5" />Expired
                  </span>
                )}
              </div>
              <h3 className={`mt-2 text-[15px] font-semibold leading-snug tracking-tight ${expired ? 'text-foreground/60' : 'text-foreground'}`}>
                {ann.title}
              </h3>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 -mt-0.5 -mr-1 hover:bg-muted text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onEdit(ann)}>
                  <Edit3 className="h-3.5 w-3.5" />Edit announcement
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                  onClick={() => onDelete(ann)}
                >
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Body */}
        <div className="mt-3 ml-11">
          <p className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {ann.content}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {expanded
                ? <><ChevronUp   className="h-3.5 w-3.5" />Show less</>
                : <><ChevronDown className="h-3.5 w-3.5" />Read more</>
              }
            </button>
          )}

          {/* Footer meta */}
          <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
            <AudienceBadge type={ann.audience?.type} />
            {ann.expiresAt && !expired && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                <Calendar className="h-3 w-3" />
                Expires {timeAgo(ann.expiresAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

function FormDialog({
  open, onClose, onSubmit, initial, isLoading, mode,
}: {
  open:      boolean;
  onClose:   () => void;
  onSubmit:  (form: FormState) => void;
  initial?:  Partial<FormState>;
  isLoading: boolean;
  mode:      'create' | 'edit';
}) {
  const [formState, setFormState] = useState<FormState>(() => ({ ...defaultForm(), ...initial }));

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setFormState(p => ({ ...p, [k]: v }));
  }

  function validate(): boolean {
    if (!formState.title.trim())   { toast.error('Title is required');   return false; }
    if (!formState.content.trim()) { toast.error('Content is required'); return false; }
    return true;
  }

  const isCreate = mode === 'create';

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] rounded-2xl p-0 overflow-hidden gap-0">

        {/* Header */}
        <div className={`px-6 pt-6 pb-5 border-b border-border/60 ${
          isCreate
            ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
            : 'bg-amber-50/60 dark:bg-amber-950/20'
        }`}>
          <DialogTitle className="flex items-center gap-3 text-base font-semibold">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
              isCreate ? 'bg-indigo-600' : 'bg-amber-500'
            }`}>
              {isCreate
                ? <Megaphone className="h-4 w-4 text-white" />
                : <Edit3     className="h-4 w-4 text-white" />
              }
            </div>
            <div>
              <p className="text-base font-semibold leading-none">
                {isCreate ? 'New Announcement' : 'Edit Announcement'}
              </p>
              <p className="text-xs text-muted-foreground font-normal mt-1">
                {isCreate ? 'Publish an update to your members' : 'Update the announcement details'}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isCreate ? 'Create a new announcement' : 'Edit an existing announcement'}
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title <span className="text-rose-500 normal-case font-normal tracking-normal">*</span>
            </Label>
            <Input
              value={formState.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Q4 Board Meeting Scheduled"
              className="h-10 text-sm"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Content <span className="text-rose-500 normal-case font-normal tracking-normal">*</span>
              </Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">{formState.content.length} chars</span>
            </div>
            <Textarea
              value={formState.content}
              onChange={e => set('content', e.target.value)}
              placeholder="Write your announcement here…"
              rows={5}
              className="text-sm resize-none leading-relaxed"
            />
          </div>

          {/* Audience + Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audience
              </Label>
              <Select
                value={formState.audienceType}
                onValueChange={v => set('audienceType', v as AnnouncementAudienceType)}
              >
                <SelectTrigger className="h-10 text-sm">
                  <Users className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Members</SelectItem>
                  <SelectItem value="BOARD_MEMBERS">Board Members</SelectItem>
                  <SelectItem value="ADMINS">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expiry Date
              </Label>
              <Input
                type="date"
                value={formState.expiresAt}
                onChange={e => set('expiresAt', e.target.value)}
                className="h-10 text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Pin toggle */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 border transition-colors ${
            formState.isPinned
              ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800/60'
              : 'border-border bg-muted/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-colors ${
                formState.isPinned ? 'bg-indigo-600 border-indigo-700' : 'bg-background border-border'
              }`}>
                <Pin className={`h-3.5 w-3.5 ${formState.isPinned ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm font-medium leading-none">Pin to top</p>
                <p className="text-xs text-muted-foreground mt-1">Show above all other announcements</p>
              </div>
            </div>
            <Switch
              checked={formState.isPinned}
              onCheckedChange={v => set('isPinned', v)}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none h-10">
            Cancel
          </Button>
          <Button
            onClick={() => { if (validate()) onSubmit(formState); }}
            disabled={isLoading}
            className={`gap-2 flex-1 sm:flex-none h-10 font-medium ${
              isCreate ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : isCreate ? <Megaphone className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />
            }
            {isLoading ? (isCreate ? 'Publishing…' : 'Saving…') : (isCreate ? 'Publish' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, className }: {
  label:     string;
  value:     number;
  icon:      React.ElementType;
  className: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white dark:bg-card ${className}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label, count }: {
  icon:  React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Announcements() {
  const user = authService.getUser();

  const role      = ((user as any)?.role ?? '').toLowerCase().replace(/[_\s-]/g, '');
  const canManage = ['orgadmin', 'admin', 'superadmin'].includes(role);

  const [search,         setSearch]         = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [showExpired,    setShowExpired]    = useState(true);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [editTarget,     setEditTarget]     = useState<Announcement | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Announcement | null>(null);

  const { data: rawData, isLoading, error } = useAnnouncements({ query: search });

  const serverTotal: number = (() => {
    const d = rawData as any;
    if (!d) return 0;
    if (typeof d.total === 'number')       return d.total;
    if (typeof d.data?.total === 'number') return d.data.total;
    return 0;
  })();

  const createMutation = useCreateAnnouncement();

  const all: Announcement[] = useMemo(() => {
    const d = rawData as any;
    if (!d)                             return [];
    if (Array.isArray(d))               return d;
    if (Array.isArray(d.data))          return d.data;
    if (Array.isArray(d.data?.data))    return d.data.data;
    if (Array.isArray(d.items))         return d.items;
    if (Array.isArray(d.data?.items))   return d.data.items;
    if (Array.isArray(d.announcements)) return d.announcements;
    console.debug('[Announcements] unrecognised data shape:', Object.keys(d));
    return [];
  }, [rawData]);

  const filtered = useMemo(() =>
    all
      .filter(a => {
        const matchSearch   = !search.trim()
          || a.title.toLowerCase().includes(search.toLowerCase())
          || a.content.toLowerCase().includes(search.toLowerCase());
        const matchAudience = audienceFilter === 'all' || a.audience?.type === audienceFilter;
        const matchExpiry   = showExpired || !isExpired(a.expiresAt);
        return matchSearch && matchAudience && matchExpiry;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const ta = typeof a.publishedAt === 'number' ? a.publishedAt : new Date(a.publishedAt).getTime();
        const tb = typeof b.publishedAt === 'number' ? b.publishedAt : new Date(b.publishedAt).getTime();
        return tb - ta;
      }),
    [all, search, audienceFilter, showExpired],
  );

  const pinned  = filtered.filter(a =>  a.isPinned);
  const regular = filtered.filter(a => !a.isPinned);

  const unreadCount  = all.filter(a => !(a as any).isRead).length;
  const expiredCount = all.filter(a =>  isExpired(a.expiresAt)).length;
  const totalCount   = serverTotal || all.length;

  async function handleCreate(formData: FormState) {
    const payload: CreateAnnouncementData = {
      title:           formData.title.trim(),
      content:         formData.content.trim(),
      isPinned:        formData.isPinned,
      audience:        { type: formData.audienceType },
      publishedBy:     (user as any)?.userId ?? '',
      publishedByName: user
        ? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim()
        : 'Unknown',
      publishedAt: Date.now(),
      expiresAt:   formData.expiresAt ? new Date(formData.expiresAt).getTime() : undefined,
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success('Announcement published!');
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish announcement');
    }
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Failed to load announcements</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <Megaphone className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground leading-none">Announcements</h1>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {totalCount} total
                  {unreadCount > 0 && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium"> · {unreadCount} unread</span>
                  )}
                </p>
              </div>
            </div>

            {canManage && (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shrink-0 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Announcement</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 md:px-6 py-6 space-y-6">

        {/* Stats */}
        {!isLoading && totalCount > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatCard
              icon={TrendingUp}
              label="Total"
              value={totalCount}
              className="border-border text-foreground"
            />
            {unreadCount > 0 && (
              <StatCard
                icon={Bell}
                label="Unread"
                value={unreadCount}
                className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
              />
            )}
            {expiredCount > 0 && (
              <StatCard
                icon={Clock}
                label="Expired"
                value={expiredCount}
                className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
              />
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search announcements…"
              className="h-10 pl-9 pr-9 text-sm bg-white dark:bg-card"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="h-10 w-40 text-sm bg-white dark:bg-card">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All audiences</SelectItem>
                <SelectItem value="ALL">All Members</SelectItem>
                <SelectItem value="BOARD_MEMBERS">Board Members</SelectItem>
                <SelectItem value="ADMINS">Admins</SelectItem>
              </SelectContent>
            </Select>

            {expiredCount > 0 && (
              <button
                type="button"
                onClick={() => setShowExpired(p => !p)}
                className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-lg border text-xs font-medium transition-all ${
                  showExpired
                    ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400'
                    : 'border-border bg-white dark:bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {showExpired
                  ? <><Eye    className="h-3.5 w-3.5" />Hide expired</>
                  : <><EyeOff className="h-3.5 w-3.5" />Show expired</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Filter count */}
        {(search || audienceFilter !== 'all') && !isLoading && (
          <p className="text-xs text-muted-foreground -mt-2">
            Showing {filtered.length} of {all.length} announcements
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm text-muted-foreground">Loading announcements…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="py-24 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 mb-5">
              <Bell className="h-7 w-7 text-indigo-400 dark:text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search || audienceFilter !== 'all' ? 'No matching announcements' : 'No announcements yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
              {canManage && !search && audienceFilter === 'all'
                ? 'Publish your first announcement to share updates with the board.'
                : 'Try adjusting your search or filters.'}
            </p>
            {canManage && !search && audienceFilter === 'all' && (
              <Button
                className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-5 text-sm font-medium"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            )}
          </div>
        )}

        {/* Feed */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-7">

            {pinned.length > 0 && (
              <section>
                <SectionHeading icon={Pin} label="Pinned" count={pinned.length} />
                <div className="space-y-3">
                  {pinned.map(ann => (
                    <AnnouncementCard
                      key={ann.id}
                      ann={ann}
                      canManage={canManage}
                      onEdit={setEditTarget}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            )}

            {regular.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <SectionHeading icon={Megaphone} label="Recent" count={regular.length} />
                )}
                <div className="space-y-3">
                  {regular.map(ann => (
                    <AnnouncementCard
                      key={ann.id}
                      ann={ann}
                      canManage={canManage}
                      onEdit={setEditTarget}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />

      {/* Edit dialog */}
      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={() => {
            toast.info('Edit — connect useUpdateAnnouncement hook');
            setEditTarget(null);
          }}
          initial={{
            title:        editTarget.title,
            content:      editTarget.content,
            isPinned:     editTarget.isPinned,
            audienceType: editTarget.audience?.type ?? 'ALL',
          }}
          isLoading={false}
          mode="edit"
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
          <AlertDialogHeader className="px-6 pt-6 pb-5 border-b border-border/60 bg-rose-50/50 dark:bg-rose-950/20">
            <AlertDialogTitle className="flex items-center gap-3 text-base font-semibold">
              <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              Delete Announcement
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground ml-12">
              This will permanently remove{' '}
              <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>.{' '}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 py-4 gap-2 sm:gap-2 bg-muted/20">
            <AlertDialogCancel onClick={() => setDeleteTarget(null)} className="flex-1 sm:flex-none h-10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="flex-1 sm:flex-none h-10 gap-2"
              onClick={() => {
                toast.info('Delete — connect useDeleteAnnouncement hook');
                setDeleteTarget(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}