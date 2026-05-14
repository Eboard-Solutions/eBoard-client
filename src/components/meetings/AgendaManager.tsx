'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, GripVertical, Calendar, Clock, MapPin, Users,
  Target, ClipboardList, Eye, ArrowLeft, ArrowRight, Save,
  Timer, BookOpen, ChevronRight, Loader2,
  AlertTriangle, CheckCircle2, Pencil, FileText,
  Send, Hash, AlarmClock, StickyNote,
  Layers,
} from 'lucide-react';

import {
  useAgendaByMeeting, useCreateAgenda, useUpdateAgenda,
  useDeleteAgenda, usePublishAgenda,
  useAddAgendaItem, useUpdateAgendaItem, useDeleteAgendaItem,
} from '@/hooks/api/useAgendas';
import type {
  Meeting, User, Agenda,
  AgendaItemType, CreateAgendaItemData,
} from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalItem {
  clientId:      string;
  serverId?:     string;
  orderIndex:    number;
  type:          AgendaItemType;
  title:         string;
  description:   string;
  duration:      number;
  presenterId:   string;
  presenterName: string;
  notes:         string;
  isDirty:       boolean;
}
interface PreRead  { clientId: string; name: string; url: string }
interface ParkItem { clientId: string; topic: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_TYPES: { value: AgendaItemType; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'discussion',   label: 'Discussion',   color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',   dot: 'bg-blue-500'   },
  { value: 'decision',     label: 'Decision',     color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',       dot: 'bg-red-500'    },
  { value: 'information',  label: 'Information',  color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700',   dot: 'bg-slate-400'  },
  { value: 'action',       label: 'Action',       color: 'text-orange-700 dark:text-orange-400',bg:'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',dot:'bg-orange-500'},
  { value: 'presentation', label: 'Presentation', color: 'text-teal-700 dark:text-teal-400',   bg: 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800',   dot: 'bg-teal-500'   },
  { value: 'vote',         label: 'Vote',         color: 'text-purple-700 dark:text-purple-400',bg:'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',dot:'bg-purple-500'},
];

const TABS = [
  { id: 'details',   label: 'Details',   icon: Calendar      },
  { id: 'objective', label: 'Objective', icon: Target        },
  { id: 'attendees', label: 'Attendees', icon: Users         },
  { id: 'agenda',    label: 'Agenda',    icon: ClipboardList },
  { id: 'preview',   label: 'Preview',   icon: Eye           },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeCfg(type: AgendaItemType) {
  return ITEM_TYPES.find(t => t.value === type) ?? ITEM_TYPES[0];
}

function fmtTime(val?: string): string {
  if (!val) return '—';
  const timePart = val.includes('T') ? val.split('T')[1] : val;
  const [h, min] = timePart.split(':').map(Number);
  if (!isNaN(h) && !isNaN(min)) {
    const d = new Date(); d.setHours(h, min, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return val;
}

function fmtMeetingDate(m: Meeting): string {
  const raw = (m as any).scheduledDate ?? m.date;
  if (!raw) return 'TBD';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw
    : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── AgendaViewMode — read-only beautiful display ────────────────────────────

function AgendaViewMode({
  agenda, meeting, members,
  onEdit, onDelete, onPublish,
  isPublishing, isDeleting,
}: {
  agenda: Agenda;
  meeting: Meeting | null;
  members: User[];
  onEdit:      () => void;
  onDelete:    () => void;
  onPublish:   () => void;
  isPublishing: boolean;
  isDeleting:   boolean;
}) {
  const items    = agenda.items ?? [];
  const total    = items.reduce((s, i) => s + (i.duration ?? 0), 0);
  const status   = agenda.status ?? 'draft';

  const statusCfg: Record<string, { cls: string; label: string }> = {
    draft:       { cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300',  label: 'Draft'       },
    published:   { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400', label: 'Published' },
    in_progress: { cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',  label: 'In Progress' },
    completed:   { cls: 'bg-slate-100 text-slate-500 border-slate-200',                                       label: 'Completed'   },
  };
  const sc = statusCfg[status] ?? statusCfg.draft;

  // Build a running start-time for each item
  const meetingStartTime = meeting?.startTime;
  let runningMinutes = 0;
  if (meetingStartTime) {
    const tp = meetingStartTime.includes('T') ? meetingStartTime.split('T')[1] : meetingStartTime;
    const [h, m] = tp.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) runningMinutes = h * 60 + m;
  }
  function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        {/* Coloured top strip based on status */}
        <div className={`h-1.5 w-full ${status === 'published' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-blue-500' : 'bg-primary/40'}`} />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-xs border ${sc.cls}`}>{sc.label}</Badge>
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Timer className="h-3 w-3" />{total} min total
                </Badge>
                <Badge variant="secondary" className="text-xs gap-1.5">
                  <Hash className="h-3 w-3" />{items.length} item{items.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <h2 className="text-xl font-bold tracking-tight">{agenda.title}</h2>
              {agenda.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{agenda.description}</p>
              )}
              {meeting && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />{fmtMeetingDate(meeting)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />{fmtTime(meeting.startTime)} – {fmtTime(meeting.endTime)}
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />{meeting.location}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {status !== 'published' && status !== 'completed' && (
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-9"
                  onClick={onPublish} disabled={isPublishing}>
                  {isPublishing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  Publish
                </Button>
              )}
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-9"
                onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
              <Button size="sm" variant="outline"
                className="rounded-xl gap-1.5 h-9 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Agenda items ── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 rounded-2xl border-2 border-dashed border-border/50">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-semibold text-muted-foreground">No agenda items yet</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Click Edit to add items to this agenda</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Agenda Items
            </h3>
            <span className="text-xs text-muted-foreground">{total} min</span>
          </div>

          {items
            .slice()
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .map((item, idx) => {
              const cfg      = typeCfg(item.type);
              const itemStart = runningMinutes;
              runningMinutes += item.duration ?? 0;
              const presenter = members.find(m => m.userId === item.presenterId);

              return (
                <Card key={item.id ?? idx}
                  className="border border-border/60 hover:shadow-sm transition-shadow overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Left accent bar + number */}
                      <div className={`flex flex-col items-center justify-center w-14 sm:w-16 shrink-0 border-r border-border/40 py-4 gap-1 ${cfg.bg}`}>
                        <span className={`text-lg font-bold tabular-nums ${cfg.color}`}>{idx + 1}</span>
                        <span className={`text-[9px] uppercase font-semibold tracking-wide ${cfg.color} opacity-70`}>
                          {item.duration}m
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              {meetingStartTime && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <AlarmClock className="h-3 w-3" />
                                  {minutesToTime(itemStart)}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold leading-snug">
                              {item.title || <span className="text-muted-foreground italic">Untitled item</span>}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Right meta */}
                          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 shrink-0">
                            {(presenter || item.presenterName) && (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={presenter?.profilePictureUrl} />
                                  <AvatarFallback className="text-[9px]">
                                    {presenter
                                      ? `${presenter.firstName[0]}${presenter.lastName[0]}`
                                      : (item.presenterName?.[0] ?? '?')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">
                                  {presenter
                                    ? `${presenter.firstName} ${presenter.lastName}`
                                    : item.presenterName}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Timer className="h-3 w-3" />{item.duration} min
                            </div>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="mt-2.5 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                            <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{item.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* ── Summary strip ── */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Items',    value: String(items.length),  icon: <Hash      className="h-4 w-4" /> },
            { label: 'Total Duration', value: `${total} min`,        icon: <Timer     className="h-4 w-4" /> },
            { label: 'Decisions',      value: String(items.filter(i => i.type === 'decision').length), icon: <CheckCircle2 className="h-4 w-4" /> },
            { label: 'Presentations',  value: String(items.filter(i => i.type === 'presentation').length), icon: <Layers className="h-4 w-4" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl border border-border/50 bg-muted/30 p-3 text-center">
              <div className="text-muted-foreground flex justify-center mb-1">{icon}</div>
              <p className="text-xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step Strip ───────────────────────────────────────────────────────────────

function StepStrip({ activeTab, tabIdx, onTabChange, onPrev, onNext, isFirst, isLast }: {
  activeTab: TabId; tabIdx: number; onTabChange: (id: TabId) => void;
  onPrev: () => void; onNext: () => void; isFirst: boolean; isLast: boolean;
}) {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }, idx) => {
              const isActive    = activeTab === id;
              const isCompleted = idx < tabIdx;
              return (
                <div key={id} className="flex items-center">
                  <button onClick={() => onTabChange(id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isActive      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCompleted ? 'text-foreground hover:bg-muted'
                      :               'text-muted-foreground hover:bg-muted'
                    }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : isCompleted ? 'bg-emerald-500 text-white'
                      :               'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 hidden sm:block" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {idx < TABS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 mx-0.5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 border-l border-border/40 pl-3">
            <Button variant="outline" size="icon" onClick={onPrev} disabled={isFirst} className="h-8 w-8 rounded-lg">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{tabIdx + 1}/{TABS.length}</span>
            <Button variant="outline" size="icon" onClick={onNext} disabled={isLast} className="h-8 w-8 rounded-lg">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface AgendaManagerProps {
  meetings?: Meeting[];
  members?:  User[];
}

export function AgendaManager({ meetings = [], members = [] }: AgendaManagerProps) {

  // ── Mode: 'view' when agenda exists and not editing, 'edit' to create/update
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // ── Meeting selector ───────────────────────────────────────────────────────
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const selectedMeeting = useMemo(
    () => meetings.find(m => ((m as any).meetingId ?? (m as any).id) === selectedMeetingId) ?? null,
    [meetings, selectedMeetingId],
  );

  // ── Fetch existing agenda ──────────────────────────────────────────────────
  const {
    data: existingAgenda,
    isLoading: agendaLoading,
    refetch: refetchAgenda,
  } = useAgendaByMeeting(selectedMeetingId);

  const existingAgendaId = existingAgenda
    ? ((existingAgenda as any).agendaId ?? (existingAgenda as any).id ?? '')
    : '';

  // When we get an agenda back, switch to view mode automatically
  const [lastFetchedId, setLastFetchedId] = useState<string>('');
  if (existingAgendaId && existingAgendaId !== lastFetchedId) {
    setLastFetchedId(existingAgendaId);
    setMode('view');
  }
  // When meeting changes with no agenda, go to edit mode
  if (selectedMeetingId && !agendaLoading && !existingAgenda && selectedMeetingId !== lastFetchedId) {
    setLastFetchedId(selectedMeetingId);
    setMode('edit');
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createAgenda    = useCreateAgenda();
  const updateAgenda    = useUpdateAgenda();
  const deleteAgendaMut = useDeleteAgenda();
  const publishAgenda   = usePublishAgenda();
  const addItem         = useAddAgendaItem();
  const updateItemMut   = useUpdateAgendaItem();
  const deleteItemMut   = useDeleteAgendaItem();

  // ── Tab navigation (edit mode) ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const tabIdx  = TABS.findIndex(t => t.id === activeTab);
  const isFirst = tabIdx === 0;
  const isLast  = tabIdx === TABS.length - 1;
  const goNext  = () => !isLast  && setActiveTab(TABS[tabIdx + 1].id);
  const goPrev  = () => !isFirst && setActiveTab(TABS[tabIdx - 1].id);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [facilitatorId, setFacilitatorId] = useState('');
  const [noteTakerId,   setNoteTakerId]   = useState('');
  const [objective,     setObjective]     = useState('');
  const [attendeeIds,   setAttendeeIds]   = useState<string[]>([]);
  const [preReads,      setPreReads]      = useState<PreRead[]>([]);
  const [parkingLot,    setParkingLot]    = useState<ParkItem[]>([]);

  // ── Items state — declared BEFORE any sync blocks ─────────────────────────
  const [items, setItems] = useState<LocalItem[]>([]);

  // ── Sync from existing agenda (runs during render, safe pattern) ───────────
  const [syncedAgendaId, setSyncedAgendaId] = useState<string | null>(null);
  if (existingAgenda && existingAgendaId !== syncedAgendaId) {
    setSyncedAgendaId(existingAgendaId);
    setTitle(existingAgenda.title ?? '');
    setDescription(existingAgenda.description ?? '');
    setItems(
      (existingAgenda.items ?? []).map(i => ({
        clientId:      i.id,
        serverId:      i.id,
        orderIndex:    i.orderIndex,
        type:          i.type,
        title:         i.title,
        description:   i.description  ?? '',
        duration:      i.duration,
        presenterId:   i.presenterId  ?? '',
        presenterName: i.presenterName ?? '',
        notes:         i.notes         ?? '',
        isDirty:       false,
      })),
    );
  }

  // Sync title from meeting when creating new
  const [syncedMeetingId, setSyncedMeetingId] = useState<string | null>(null);
  const selectedMeetingRealId = (selectedMeeting as any)?.meetingId ?? (selectedMeeting as any)?.id ?? '';
  if (selectedMeeting && selectedMeetingRealId !== syncedMeetingId) {
    setSyncedMeetingId(selectedMeetingRealId);
    if (!existingAgenda) {
      setTitle(selectedMeeting.title ? `${selectedMeeting.title} — Agenda` : '');
      setAttendeeIds((selectedMeeting.attendees ?? []).map(a => a.userId));
    }
  }

  // ── Item helpers ───────────────────────────────────────────────────────────
  function addLocalItem() {
    setItems(p => [...p, {
      clientId: `item-${Date.now()}`, orderIndex: p.length,
      type: 'discussion', title: '', description: '',
      duration: 15, presenterId: '', presenterName: '', notes: '',
      isDirty: true,
    }]);
  }

  function removeLocalItem(clientId: string) {
    setItems(p => p.filter(i => i.clientId !== clientId));
  }

  function updateLocalItem<K extends keyof LocalItem>(clientId: string, k: K, v: LocalItem[K]) {
    setItems(p => p.map(i => i.clientId === clientId ? { ...i, [k]: v, isDirty: true } : i));
  }

  function changePresenter(clientId: string, userId: string) {
    const u = members.find(m => m.userId === userId);
    setItems(p => p.map(i =>
      i.clientId === clientId
        ? { ...i, presenterId: userId, presenterName: u ? `${u.firstName} ${u.lastName}` : '', isDirty: true }
        : i,
    ));
  }

  const toggleAttendee = (userId: string) =>
    setAttendeeIds(p => p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId]);

  const totalMinutes = items.reduce((s, i) => s + (i.duration || 0), 0);
  const hasDirty     = items.some(i => i.isDirty);

  // ── Delete confirms ────────────────────────────────────────────────────────
  const [deleteItemTarget, setDeleteItemTarget] = useState<LocalItem | null>(null);
  const [deleteAgendaOpen, setDeleteAgendaOpen] = useState(false);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!title.trim())       { toast.error('Please enter an agenda title'); return; }
    if (!selectedMeetingId)  { toast.error('Please select a meeting first'); return; }

    try {
      let agendaId = existingAgendaId || undefined;

      if (!agendaId) {
        const created = await createAgenda.mutateAsync({
          title:       title.trim(),
          description: description.trim() || undefined,
          meetingId:   selectedMeetingId,
        });
        // FIX: unwrap ResponseObject<Agenda>
        agendaId = (created as any)?.data?.id ?? (created as any)?.data?.agendaId
               ?? (created as any)?.id ?? (created as any)?.agendaId;
        if (!agendaId) throw new Error('Failed to get agenda ID from response');
        toast.success('Agenda created');
      } else {
        await updateAgenda.mutateAsync({
          agendaId,
          data: { title: title.trim(), description: description.trim() || undefined },
        });
      }

      // Save dirty items. Updates run in parallel (independent rows on the
      // backend); new creates run sequentially because each one needs its
      // returned serverId written back into local state and the backend may
      // enforce orderIndex uniqueness within an agenda.
      const dirtyItems = items.filter(i => i.isDirty);
      const buildPayload = (item: typeof items[number]): CreateAgendaItemData => ({
        orderIndex:    item.orderIndex,
        type:          item.type,
        title:         item.title,
        description:   item.description   || undefined,
        duration:      item.duration,
        presenterId:   item.presenterId   || undefined,
        presenterName: item.presenterName || undefined,
        notes:         item.notes         || undefined,
      });

      const updates = dirtyItems
        .filter(i => i.serverId)
        .map(item =>
          updateItemMut.mutateAsync({
            agendaId: agendaId!, itemId: item.serverId!, data: buildPayload(item),
          }),
        );
      const creates = dirtyItems.filter(i => !i.serverId);

      await Promise.all(updates);
      for (const item of creates) {
        const created = await addItem.mutateAsync({ agendaId: agendaId!, data: buildPayload(item) });
        const newId = (created as any)?.data?.id ?? (created as any)?.id;
        setItems(p => p.map(i =>
          i.clientId === item.clientId ? { ...i, serverId: newId, isDirty: false } : i,
        ));
      }

      setItems(p => p.map(i => ({ ...i, isDirty: false })));
      toast.success('Agenda saved successfully');
      await refetchAgenda();
      setMode('view'); // switch to view after save
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to save agenda');
    }
  }, [
    title, description, selectedMeetingId, existingAgendaId, items,
    createAgenda, updateAgenda, addItem, updateItemMut, refetchAgenda,
  ]);

  const handlePublish = async () => {
    const pubId = existingAgendaId;
    if (!pubId) { toast.error('Save the agenda first before publishing'); return; }
    try {
      await publishAgenda.mutateAsync(pubId);
      toast.success('Agenda published');
      refetchAgenda();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish');
    }
  };

  const handleDeleteAgenda = async () => {
    const delId = existingAgendaId;
    if (!delId) return;
    try {
      await deleteAgendaMut.mutateAsync(delId);
      toast.success('Agenda deleted');
      setDeleteAgendaOpen(false);
      setSyncedAgendaId(null);
      setLastFetchedId('');
      setItems([]);
      setTitle('');
      setDescription('');
      setMode('edit');
      refetchAgenda();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete agenda');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemTarget) return;
    if (deleteItemTarget.serverId && existingAgendaId) {
      try {
        await deleteItemMut.mutateAsync({ agendaId: existingAgendaId, itemId: deleteItemTarget.serverId });
        toast.success('Item removed');
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to delete item');
        setDeleteItemTarget(null);
        return;
      }
    }
    removeLocalItem(deleteItemTarget.clientId);
    setDeleteItemTarget(null);
  };

  const isSaving = createAgenda.isPending || updateAgenda.isPending
    || addItem.isPending || updateItemMut.isPending;

  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Agenda Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {existingAgenda && mode === 'view'
              ? 'Viewing agenda — click Edit to make changes'
              : 'Create and manage meeting agendas'}
          </p>
        </div>

        {mode === 'view' && existingAgenda && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => setMode('edit')}>
              <Pencil className="h-4 w-4" />Edit Agenda
            </Button>
          </div>
        )}
        {mode === 'edit' && (
          <div className="flex gap-2 flex-wrap">
            {existingAgenda && (
              <Button variant="outline" className="rounded-xl gap-2" onClick={() => setMode('view')}>
                <Eye className="h-4 w-4" />View Agenda
              </Button>
            )}
            <Button className="rounded-xl gap-2 shadow-sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {existingAgenda ? 'Update Agenda' : 'Save Agenda'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Meeting selector ── */}
      <Card className="border border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className={lbl}>Select Meeting <span className="text-red-500 normal-case">*</span></label>
              <Select value={selectedMeetingId} onValueChange={v => {
                setSelectedMeetingId(v);
                setSyncedAgendaId(null);
                setSyncedMeetingId(null);
                setLastFetchedId('');
                setItems([]);
                setTitle('');
                setDescription('');
                setMode('view');
              }}>
                <SelectTrigger className={inp}>
                  <SelectValue placeholder="Choose a meeting…" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.length === 0 ? (
                    <SelectItem value="_none" disabled>No meetings available</SelectItem>
                  ) : (
                    meetings.map(m => {
                      const mId   = (m as any).meetingId ?? (m as any).id ?? '';
                      const mDate = (m as any).scheduledDate ?? m.date;
                      return (
                        <SelectItem key={mId || m.title} value={mId}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{m.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {mDate
                                ? new Date(mDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '—'}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {existingAgenda && (
              <div className="flex items-center gap-2 pt-5">
                <Badge className={`text-xs gap-1.5 border ${
                  existingAgenda.status === 'published'   ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                  existingAgenda.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200'   :
                  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${existingAgenda.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {existingAgenda.status ?? 'draft'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {(existingAgenda.items ?? []).length} items
                </span>
              </div>
            )}
          </div>

          {agendaLoading && selectedMeetingId && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Checking for existing agenda…
            </div>
          )}
          {!agendaLoading && selectedMeetingId && !existingAgenda && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />No agenda yet — fill in the form below to create one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── No meeting selected ── */}
      {!selectedMeetingId && (
        <div className="flex flex-col items-center gap-3 py-16 rounded-2xl border-2 border-dashed border-border/50 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <ClipboardList className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-base font-semibold text-muted-foreground">Select a meeting above</p>
            <p className="text-sm text-muted-foreground/70 mt-0.5">to view or create its agenda</p>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {selectedMeetingId && agendaLoading && (
        <div className="flex justify-center items-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading agenda…</span>
        </div>
      )}

      {/* ── View mode ── */}
      {selectedMeetingId && !agendaLoading && existingAgenda && mode === 'view' && (
        <AgendaViewMode
          agenda={existingAgenda}
          meeting={selectedMeeting}
          members={members}
          onEdit={() => setMode('edit')}
          onDelete={() => setDeleteAgendaOpen(true)}
          onPublish={handlePublish}
          isPublishing={publishAgenda.isPending}
          isDeleting={deleteAgendaMut.isPending}
        />
      )}

      {/* ── Edit / Create mode ── */}
      {selectedMeetingId && !agendaLoading && mode === 'edit' && (
        <>
          {hasDirty && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 px-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              You have unsaved changes
            </div>
          )}

          <StepStrip
            activeTab={activeTab} tabIdx={tabIdx}
            onTabChange={setActiveTab}
            onPrev={goPrev} onNext={goNext}
            isFirst={isFirst} isLast={isLast}
          />

          {/* ── Details tab ── */}
          {activeTab === 'details' && (
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-5">
                <div>
                  <label className={lbl}>Agenda Title <span className="text-red-500 normal-case">*</span></label>
                  <Input value={title} className={inp} placeholder="e.g., Q1 Strategic Planning — Agenda"
                    onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <Textarea value={description} rows={3}
                    className="resize-none rounded-xl border-border/60 bg-background text-sm"
                    placeholder="Brief overview of this agenda…"
                    onChange={e => setDescription(e.target.value)} />
                </div>
                {selectedMeeting && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border/40">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{fmtMeetingDate(selectedMeeting)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{fmtTime(selectedMeeting.startTime)} – {fmtTime(selectedMeeting.endTime)}</span>
                    </div>
                    {selectedMeeting.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{selectedMeeting.location}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Facilitator', value: facilitatorId, onChange: setFacilitatorId },
                    { label: 'Note-Taker',  value: noteTakerId,   onChange: setNoteTakerId   },
                  ].map(({ label, value, onChange }) => (
                    <div key={label}>
                      <label className={lbl}>{label}</label>
                      <Select value={value} onValueChange={onChange}>
                        <SelectTrigger className={inp}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>
                          {members.map(u => (
                            <SelectItem key={u.userId} value={u.userId}>
                              {u.firstName} {u.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Objective tab ── */}
          {activeTab === 'objective' && (
            <div className="space-y-4">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Meeting Objective
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  <Textarea value={objective} rows={5}
                    className="resize-none rounded-xl border-border/60 bg-background text-sm"
                    placeholder="State the purpose and expected outcomes…"
                    onChange={e => setObjective(e.target.value)} />
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Pre-Reads
                    </CardTitle>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8"
                      onClick={() => setPreReads(p => [...p, { clientId: `pr-${Date.now()}`, name: '', url: '' }])}>
                      <Plus className="h-3.5 w-3.5" />Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  {preReads.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                      No pre-reads added yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {preReads.map((pr, i) => (
                        <div key={pr.clientId} className="flex gap-3 items-center">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                          <Input placeholder="Document name" className="flex-1 h-9 text-sm rounded-xl" value={pr.name}
                            onChange={e => setPreReads(p => p.map(r => r.clientId === pr.clientId ? { ...r, name: e.target.value } : r))} />
                          <Input placeholder="https://…" className="flex-1 h-9 text-sm rounded-xl" value={pr.url}
                            onChange={e => setPreReads(p => p.map(r => r.clientId === pr.clientId ? { ...r, url: e.target.value } : r))} />
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 shrink-0"
                            onClick={() => setPreReads(p => p.filter(r => r.clientId !== pr.clientId))}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Attendees tab ── */}
          {activeTab === 'attendees' && (
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Attendees
                  </CardTitle>
                  <Badge variant="secondary">{attendeeIds.length} selected</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No members available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.map(u => {
                      const selected = attendeeIds.includes(u.userId);
                      return (
                        <div key={u.userId}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selected ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:bg-muted/40'
                          }`}
                          onClick={() => toggleAttendee(u.userId)}>
                          <Checkbox checked={selected} onCheckedChange={() => toggleAttendee(u.userId)} />
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={u.profilePictureUrl} />
                            <AvatarFallback className="text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.title ?? u.role}</p>
                          </div>
                          {selected && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Agenda items tab ── */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <Card className="border border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Agenda Items
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1.5">
                        <Timer className="h-3 w-3" />{totalMinutes} min
                      </Badge>
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8" onClick={addLocalItem}>
                        <Plus className="h-3.5 w-3.5" />Add Item
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {items.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/40 m-5 rounded-xl">
                      <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">No items yet.</p>
                      <Button onClick={addLocalItem} variant="outline" className="rounded-xl gap-2">
                        <Plus className="h-4 w-4" />Add First Item
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/30">
                            <th className="py-3 px-3 w-8" />
                            <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground w-8">#</th>
                            <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground min-w-[160px]">Title</th>
                            <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground min-w-[120px]">Presenter</th>
                            <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground min-w-[130px]">Type</th>
                            <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground w-24">Duration</th>
                            <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground min-w-[160px]">Notes</th>
                            <th className="py-3 px-2 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {items.map((item, idx) => (
                            <tr key={item.clientId}
                              className={`hover:bg-muted/20 transition-colors group ${item.isDirty ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                              <td className="py-2.5 px-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab group-hover:text-muted-foreground" />
                              </td>
                              <td className="py-2.5 px-2">
                                <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-2">
                                <Input value={item.title} placeholder="Item title"
                                  className="h-8 text-sm rounded-lg border-border/50 min-w-[140px]"
                                  onChange={e => updateLocalItem(item.clientId, 'title', e.target.value)} />
                              </td>
                              <td className="py-2.5 px-2">
                                <Select value={item.presenterId ?? ''} onValueChange={v => changePresenter(item.clientId, v)}>
                                  <SelectTrigger className="min-w-[120px] h-8 text-sm rounded-lg border-border/50">
                                    <SelectValue placeholder="Presenter" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {members.map(u => (
                                      <SelectItem key={u.userId} value={u.userId}>
                                        {u.firstName} {u.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-2.5 px-2">
                                <Select value={item.type} onValueChange={v => updateLocalItem(item.clientId, 'type', v as AgendaItemType)}>
                                  <SelectTrigger className="min-w-[120px] h-8 text-sm rounded-lg border-border/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ITEM_TYPES.map(t => (
                                      <SelectItem key={t.value} value={t.value}>
                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${t.bg} ${t.color}`}>{t.label}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-1">
                                  <Input type="number" min={1} value={item.duration}
                                    className="w-16 h-8 text-sm rounded-lg border-border/50"
                                    onChange={e => updateLocalItem(item.clientId, 'duration', Math.max(1, parseInt(e.target.value) || 1))} />
                                  <span className="text-xs text-muted-foreground shrink-0">min</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2">
                                <Input value={item.notes} placeholder="Notes…"
                                  className="h-8 text-sm rounded-lg border-border/50 min-w-[140px]"
                                  onChange={e => updateLocalItem(item.clientId, 'notes', e.target.value)} />
                              </td>
                              <td className="py-2.5 px-2">
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => setDeleteItemTarget(item)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Parking lot */}
              <Card className="border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
                <CardHeader className="px-5 pt-5 pb-4 border-b border-amber-200/40">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      Parking Lot
                      <span className="text-xs font-normal text-muted-foreground">— deferred topics</span>
                    </CardTitle>
                    <Button variant="outline" size="sm"
                      className="rounded-xl gap-1.5 h-8 border-amber-300 hover:bg-amber-100"
                      onClick={() => setParkingLot(p => [...p, { clientId: `pl-${Date.now()}`, topic: '' }])}>
                      <Plus className="h-3.5 w-3.5" />Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  {parkingLot.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-amber-200/60 rounded-xl">
                      Topics deferred during the meeting will appear here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {parkingLot.map((item, i) => (
                        <div key={item.clientId} className="flex items-center gap-3">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-medium text-amber-700 w-14 shrink-0">Item {i + 1}</span>
                          <Input value={item.topic} placeholder="Deferred topic…"
                            className="flex-1 h-8 text-sm rounded-lg"
                            onChange={e => setParkingLot(p => p.map(pl => pl.clientId === item.clientId ? { ...pl, topic: e.target.value } : pl))} />
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 shrink-0"
                            onClick={() => setParkingLot(p => p.filter(pl => pl.clientId !== item.clientId))}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Preview tab ── */}
          {activeTab === 'preview' && (
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Agenda Preview
                  </CardTitle>
                  <Button size="sm" className="rounded-xl gap-2" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {existingAgenda ? 'Update' : 'Save'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <div className="bg-white text-black rounded-xl shadow-lg p-6 sm:p-8 max-w-3xl mx-auto border">
                  <div className="text-center border-b-2 border-gray-200 pb-5 mb-6">
                    <h2 className="text-2xl font-bold">{title || 'Untitled Agenda'}</h2>
                    {selectedMeeting && (
                      <div className="flex items-center justify-center flex-wrap gap-4 text-sm text-gray-500 mt-2">
                        <span>{fmtMeetingDate(selectedMeeting)}</span>
                        <span>{fmtTime(selectedMeeting.startTime)} – {fmtTime(selectedMeeting.endTime)}</span>
                        {selectedMeeting.location && <span>{selectedMeeting.location}</span>}
                      </div>
                    )}
                  </div>
                  {description && (
                    <p className="text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg mb-5">{description}</p>
                  )}
                  {items.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">
                        Agenda — {totalMinutes} min total
                      </h3>
                      <div className="space-y-2">
                        {items.map((item, i) => {
                          const cfg = typeCfg(item.type);
                          return (
                            <div key={item.clientId} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-gray-800 text-white text-xs font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                                  <span className="font-medium text-sm">{item.title || 'Untitled'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.duration}m</span>
                                </div>
                              </div>
                              {(item.presenterName || item.notes) && (
                                <div className="mt-1.5 pl-7 text-xs text-gray-500 flex gap-4">
                                  {item.presenterName && <span>Presenter: {item.presenterName}</span>}
                                  {item.notes && <span>{item.notes}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom nav */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={goPrev} disabled={isFirst} className="rounded-xl gap-2">
              <ArrowLeft className="h-4 w-4" />Previous
            </Button>
            <Button onClick={isLast ? handleSave : goNext} disabled={isLast && isSaving} className="rounded-xl gap-2 shadow-sm">
              {isLast
                ? isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4" />{existingAgenda ? 'Update Agenda' : 'Save Agenda'}</>
                : <>Next<ArrowRight className="h-4 w-4" /></>
              }
            </Button>
          </div>
        </>
      )}

      {/* ── Delete item confirm ── */}
      <AlertDialog open={!!deleteItemTarget} onOpenChange={v => { if (!v) setDeleteItemTarget(null); }}>
        <AlertDialogContent className="rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteItemTarget?.title || 'Untitled item'}" will be permanently removed from the agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleteItemMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteItem} disabled={deleteItemMut.isPending}>
              {deleteItemMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete agenda confirm ── */}
      <AlertDialog open={deleteAgendaOpen} onOpenChange={setDeleteAgendaOpen}>
        <AlertDialogContent className="rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Delete Agenda
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this agenda and all its items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleteAgendaMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAgenda} disabled={deleteAgendaMut.isPending}>
              {deleteAgendaMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Agenda'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AgendaManager;