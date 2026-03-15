'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import {
  Megaphone, Plus, Search, Pin, Calendar,
  Loader2, List, Filter, X, AlertTriangle,
  Clock, Users, Edit3, Trash2, MoreHorizontal,
  Grid3X3, CheckCircle2, Sparkles, ChevronDown,
  ChevronUp, Bell,
} from 'lucide-react';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch }   from '@/components/ui/switch';
import { Badge }    from '@/components/ui/badge';
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
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
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

// ─── Audience config ──────────────────────────────────────────────────────────

const AUDIENCE: Record<string, { label: string; cls: string }> = {
  ALL:           { label: 'All Members',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' },
  BOARD_MEMBERS: { label: 'Board Members', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
  ADMINS:        { label: 'Admins Only',   cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800' },
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

// ─── Announcement Item (no card — plain row/feed item) ────────────────────────

function AnnouncementItem({
  ann, canManage, onEdit, onDelete,
}: {
  ann:       Announcement;
  canManage: boolean;
  onEdit:    (a: Announcement) => void;
  onDelete:  (a: Announcement) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expired   = isExpired(ann.expiresAt);
  const audience  = AUDIENCE[ann.audience?.type ?? 'ALL'] ?? AUDIENCE.ALL;
  const isLong    = ann.content.length > 260;

  return (
    <div className={`relative group transition-all duration-200 ${expired ? 'opacity-50' : ''}`}>
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full transition-colors ${
        ann.isPinned
          ? 'bg-indigo-500'
          : 'bg-transparent group-hover:bg-border'
      }`} />

      <div className={`pl-5 pr-4 py-4 ${
        ann.isPinned
          ? 'bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl'
          : 'hover:bg-muted/30 rounded-xl'
      }`}>

        {/* Top row: icon + meta + actions */}
        <div className="flex items-start gap-3">

          {/* Icon bubble */}
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            ann.isPinned
              ? 'bg-indigo-600 shadow-sm shadow-indigo-500/30'
              : 'bg-muted'
          }`}>
            <Megaphone className={`h-4 w-4 ${ann.isPinned ? 'text-white' : 'text-muted-foreground'}`} />
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1">

            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {ann.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      <Pin className="h-2.5 w-2.5" />Pinned
                    </span>
                  )}
                  {expired && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-500">
                      <Clock className="h-2.5 w-2.5" />Expired
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground text-[15px] leading-snug">
                  {ann.title}
                </h3>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">
                      {ann.publishedByName ?? 'Unknown'}
                    </span>
                    {' · '}
                    {timeAgo(ann.publishedAt)}
                  </span>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${audience.cls}`}>
                    {audience.label}
                  </span>

                  {ann.expiresAt && !expired && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      <Calendar className="h-2.5 w-2.5" />
                      Expires {timeAgo(ann.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action menu */}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onEdit(ann)}>
                      <Edit3 className="h-3.5 w-3.5 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(ann)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Content */}
            <p className={`mt-2.5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${
              !expanded && isLong ? 'line-clamp-3' : ''
            }`}>
              {ann.content}
            </p>

            {/* Expand / collapse for long content */}
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="mt-1.5 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                {expanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="ml-5 border-b border-border/40 last:border-0" />
    </div>
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
  const [form, setForm] = useState<FormState>(() => ({ ...defaultForm(), ...initial }));

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function validate(): boolean {
    if (!form.title.trim())   { toast.error('Title is required');   return false; }
    if (!form.content.trim()) { toast.error('Content is required'); return false; }
    return true;
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              mode === 'create'
                ? 'bg-indigo-100 dark:bg-indigo-900/40'
                : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
              {mode === 'create'
                ? <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                : <Edit3    className="h-4 w-4 text-amber-600  dark:text-amber-400"  />
              }
            </div>
            {mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Publish an update to board members'
              : 'Update the announcement details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title <span className="text-destructive normal-case font-normal">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Q4 Board Meeting Scheduled"
              className="h-9 text-sm"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content <span className="text-destructive normal-case font-normal">*</span>
            </Label>
            <Textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="Write your announcement…"
              rows={5}
              className="text-sm resize-none leading-relaxed"
            />
          </div>

          {/* Audience + Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audience
              </Label>
              <Select
                value={form.audienceType}
                onValueChange={v => set('audienceType', v as AnnouncementAudienceType)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Members</SelectItem>
                  <SelectItem value="BOARD_MEMBERS">Board Members</SelectItem>
                  <SelectItem value="ADMINS">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expires On
              </Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={e => set('expiresAt', e.target.value)}
                className="h-9 text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Pin to top</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Always shows above other announcements
              </p>
            </div>
            <Switch
              checked={form.isPinned}
              onCheckedChange={v => set('isPinned', v)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={() => { if (validate()) onSubmit(form); }}
            disabled={isLoading}
            className="gap-2 flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : mode === 'create'
              ? <Megaphone className="h-4 w-4" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            {isLoading
              ? mode === 'create' ? 'Publishing…' : 'Saving…'
              : mode === 'create' ? 'Publish'     : 'Save Changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Announcements() {
  const user = authService.getUser();

  // Check manage permission — covers all admin role variants
  const role = ((user as any)?.role ?? '').toLowerCase().replace(/[_\s-]/g, '');
  const canManage = ['orgadmin', 'admin', 'superadmin'].includes(role);

  // UI state
  const [search,       setSearch]       = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [showExpired,  setShowExpired]  = useState(false);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  // Data
  const { data: rawData, isLoading, error } = useAnnouncements({ query: search });
  // Extract server-reported total (may differ from all.length when paginated)
  const serverTotal: number = (() => {
    const d = rawData as any;
    if (!d) return 0;
    if (typeof d.total === 'number')      return d.total;
    if (typeof d.data?.total === 'number') return d.data.total;
    return 0;
  })();
  const createMutation = useCreateAnnouncement();

  // Normalise response — handles every NestJS response shape:
  //   Announcement[]                              — raw array
  //   { data: Announcement[] }                    — standard ApiResponse
  //   { data: { data: Announcement[], total:N } } — paginated
  //   { items: Announcement[] }                   — some hooks
  const all: Announcement[] = useMemo(() => {
    const d = rawData as any;
    if (!d)                          return [];
    if (Array.isArray(d))            return d;
    if (Array.isArray(d.data))       return d.data;
    if (Array.isArray(d.data?.data)) return d.data.data;
    if (Array.isArray(d.items))      return d.items;
    if (Array.isArray(d.data?.items))return d.data.items;
    if (Array.isArray(d.announcements)) return d.announcements;
    // Log the raw shape so it is easy to debug in DevTools if items still do not show
    console.debug('[Announcements] unrecognised data shape:', Object.keys(d));
    return [];
  }, [rawData]);

  // Filter + sort
  const filtered = useMemo(() =>
    all
      .filter(a => {
        const matchSearch    = !search.trim()
          || a.title.toLowerCase().includes(search.toLowerCase())
          || a.content.toLowerCase().includes(search.toLowerCase());
        const matchAudience  = audienceFilter === 'all' || a.audience?.type === audienceFilter;
        const matchExpiry    = showExpired || !isExpired(a.expiresAt);
        return matchSearch && matchAudience && matchExpiry;
      })
      .sort((a, b) => {
        // Pinned first, then newest
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

  // Counts
  const unreadCount  = all.filter(a => !a.isRead).length;
  const expiredCount = all.filter(a => isExpired(a.expiresAt)).length;

  // Create handler
  async function handleCreate(form: FormState) {
    const payload: CreateAnnouncementData = {
      title:           form.title.trim(),
      content:         form.content.trim(),
      isPinned:        form.isPinned,
      audience:        { type: form.audienceType },
      publishedBy:     (user as any)?.userId ?? '',
      publishedByName: user
        ? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim()
        : 'Unknown',
      publishedAt:  Date.now(),
      expiresAt:    form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success('Announcement published!');
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish announcement');
    }
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Failed to load announcements</h2>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="container mx-auto max-w-4xl px-4 md:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/30 shrink-0">
                <Megaphone className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight text-foreground leading-none">
                  Announcements
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  {serverTotal || all.length} total
                  {unreadCount > 0 && ` · ${unreadCount} unread`}
                </p>
              </div>
            </div>

            {canManage && (
              <Button
                size="sm"
                className="h-8 gap-1.5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">New</span>
                <span className="hidden sm:inline"> Announcement</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 md:px-6 py-6 space-y-5">

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search announcements…"
              className="h-9 pl-9 pr-8 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Audience filter */}
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All audiences</SelectItem>
                <SelectItem value="ALL">All Members</SelectItem>
                <SelectItem value="BOARD_MEMBERS">Board Members</SelectItem>
                <SelectItem value="ADMINS">Admins</SelectItem>
              </SelectContent>
            </Select>

            {/* Expired toggle */}
            {expiredCount > 0 && (
              <button
                type="button"
                onClick={() => setShowExpired(p => !p)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all ${
                  showExpired
                    ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300'
                    : 'border-border/60 text-muted-foreground hover:text-foreground bg-background'
                }`}
              >
                <Clock className="h-3 w-3" />
                {expiredCount} expired
              </button>
            )}
          </div>
        </div>

        {/* ── Result count when filtering ── */}
        {(search || audienceFilter !== 'all') && !isLoading && (
          <p className="text-xs text-muted-foreground -mt-1">
            {filtered.length} of {all.length} announcements
          </p>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-sm">Loading announcements…</span>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && filtered.length === 0 && (
          <div className="py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search || audienceFilter !== 'all' ? 'No matching announcements' : 'No announcements yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
              {canManage && !search && audienceFilter === 'all'
                ? 'Publish your first announcement to share updates with the board.'
                : 'Try adjusting your filters.'}
            </p>
            {canManage && !search && audienceFilter === 'all' && (
              <Button
                size="sm"
                className="mt-5 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Announcement
              </Button>
            )}
          </div>
        )}

        {/* ── Announcements feed ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-6">

            {/* Pinned section */}
            {pinned.length > 0 && (
              <section className="space-y-1">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1 mb-2">
                  <Pin className="h-3 w-3 text-indigo-500" />
                  Pinned · {pinned.length}
                </h2>
                <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 overflow-hidden divide-y divide-border/40">
                  {pinned.map(ann => (
                    <AnnouncementItem
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

            {/* Regular section */}
            {regular.length > 0 && (
              <section className="space-y-1">
                {pinned.length > 0 && (
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1 mb-2">
                    <Megaphone className="h-3 w-3" />
                    Recent · {regular.length}
                  </h2>
                )}
                <div className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/40">
                  {regular.map(ann => (
                    <AnnouncementItem
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

      {/* ── Create dialog ── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />

      {/* ── Edit dialog ── */}
      {editTarget && (
        <FormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (form) => {
            // Wire to useUpdateAnnouncement when hook is available
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

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>"{deleteTarget?.title}"</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                // Wire to useDeleteAnnouncement hook
                toast.info('Delete — connect useDeleteAnnouncement hook');
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}