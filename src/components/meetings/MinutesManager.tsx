'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, Calendar, Clock, MapPin, Users, CheckCircle,
  ChevronRight, Save, Download, ListChecks, Gavel, AlertCircle,
  Eye, ArrowLeft, ArrowRight, Printer, UserCheck, CalendarPlus,
  FileText, Loader2, AlertTriangle, X, ChevronDown,
} from 'lucide-react';

import {
  useMinutesByMeeting, useCreateMinutes, useUpdateMinutes,
  useDeleteMinutes, usePublishMinutes, useSubmitMinutesForReview,
  useAddMinuteItem, useUpdateMinuteItem, useDeleteMinuteItem,
} from '@/hooks/api/useMinutes';
import type {
  Meeting, User, Minutes, MinuteItem, MinuteItemType,
  CreateMinutesData, CreateMinuteItemData,
  VotingDetails, ActionItemDetails, ActionItemAssignee,
} from '@/types/api.types';
import { printMinutes } from '@/lib/printMinutes';
import { computeMeetingLock } from '@/lib/meetingLock';
import { Lock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalItem {
  clientId:          string;
  serverId?:         string;
  orderIndex:        number;
  type:              MinuteItemType;
  title:             string;
  content:           string;
  agendaItemId?:     string;
  timestamp?:        string;
  // vote fields
  voteQuestion?:     string;
  voteInFavor?:      number;
  voteAgainst?:      number;
  voteAbstain?:      number;
  // action fields
  actionDescription?:  string;
  actionAssigneeId?:   string;
  actionAssigneeName?: string;
  actionDueDate?:      string;
  actionPriority?:     ActionItemDetails['priority'];
  isDirty:           boolean;
}

interface AttendanceRow { userId: string; present: boolean }
interface NextMeeting   { date: string; time: string; location: string; agendaHighlights: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'details',    label: 'Details',          icon: Calendar   },
  { id: 'attendance', label: 'Attendance',        icon: Users      },
  { id: 'items',      label: 'Minutes',           icon: FileText   },
  { id: 'decisions',  label: 'Decisions & Votes', icon: Gavel      },
  { id: 'actions',    label: 'Actions',           icon: ListChecks },
  { id: 'preview',    label: 'Preview',           icon: Eye        },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(members: User[], id?: string): string {
  if (!id) return '—';
  const u = members.find(m => m.userId === id);
  return u ? `${u.firstName} ${u.lastName}` : '—';
}

function priorityCls(p?: string): string {
  if (p === 'high')   return 'bg-red-100 text-red-700';
  if (p === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function fmtTime(val?: string): string {
  if (!val) return '—';
  const parts = val.split('T');
  return parts.length > 1 ? parts[1].slice(0, 5) : val.slice(0, 5);
}

// ─── Step Strip ───────────────────────────────────────────────────────────────

function StepStrip({ activeTab, tabIdx, onTabChange, onPrev, onNext, isFirst, isLast }: {
  activeTab: TabId; tabIdx: number; onTabChange: (id: TabId) => void;
  onPrev: () => void; onNext: () => void; isFirst: boolean; isLast: boolean;
}) {
  return (
    <Card className="mm-card border-0 shadow-none p-0">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }, idx) => {
              const isActive    = activeTab === id;
              const isCompleted = idx < tabIdx;
              return (
                <div key={id} className="flex items-center">
                  <button onClick={() => onTabChange(id)}
                    data-active={isActive}
                    className={`mm-step-pill flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isActive      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isCompleted ? 'text-foreground hover:bg-muted'
                      :               'text-muted-foreground hover:bg-muted'
                    }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : isCompleted ? 'bg-emerald-500 text-white'
                      :               'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-3 w-3" /> : idx + 1}
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

export interface MinutesManagerProps {
  meetings?: Meeting[];
  members?:  User[];
}

// ─── Scoped style layer (injected once) ────────────────────────────────────
// Adds a calm, premium light-mode polish without rewriting every Card. Only
// targets elements with the `mm-*` classes added below — won't affect the
// rest of the app.
const MM_STYLES = `
@keyframes mm-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.mm-fade-up { animation: mm-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }

/* Card surface — softer shadow + subtle inner highlight in light mode */
.mm-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 0.6);
  border-radius: 14px;
  transition: box-shadow .2s ease, border-color .2s ease;
}
:root:not(.dark) .mm-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  border-color: hsl(220 22% 90%);
  box-shadow:
    0 1px 0 hsl(220 30% 100% / 0.7) inset,
    0 1px 2px hsl(220 40% 30% / 0.04);
}
:root:not(.dark) .mm-card:hover {
  border-color: hsl(220 22% 84%);
  box-shadow:
    0 1px 0 hsl(220 30% 100% / 0.8) inset,
    0 8px 24px -12px hsl(232 60% 30% / 0.10);
}

/* Step-strip pill */
:root:not(.dark) .mm-step-pill[data-active="true"] {
  background: linear-gradient(135deg, hsl(239 84% 60%), hsl(217 91% 60%));
  color: white;
  box-shadow: 0 4px 12px -4px hsl(239 84% 60% / 0.4);
}

/* Light-mode ambient backdrop */
:root:not(.dark) .mm-root::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: -1;
  background:
    radial-gradient(800px 460px at 12% -10%, hsl(239 90% 70% / 0.07), transparent 60%),
    radial-gradient(680px 400px at 96% 0%,  hsl(217 90% 65% / 0.06), transparent 60%);
}

/* Header gradient title (matches Members / Organisation) */
.mm-grad-title {
  background: linear-gradient(128deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)/0.6) 50%, hsl(var(--primary)) 80%, hsl(var(--foreground)) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Status badge polish */
:root:not(.dark) .mm-status-published { background: linear-gradient(180deg, hsl(142 70% 96%), hsl(142 60% 92%)); border-color: hsl(142 50% 80%); color: hsl(142 70% 28%); }
:root:not(.dark) .mm-status-approved  { background: linear-gradient(180deg, hsl(217 100% 97%), hsl(217 90% 93%)); border-color: hsl(217 80% 80%); color: hsl(217 80% 32%); }
:root:not(.dark) .mm-status-review    { background: linear-gradient(180deg, hsl(38 100% 96%), hsl(38 90% 92%));  border-color: hsl(38 80% 78%);  color: hsl(38 90% 32%); }
:root:not(.dark) .mm-status-draft     { background: linear-gradient(180deg, hsl(220 20% 96%), hsl(220 18% 92%)); border-color: hsl(220 18% 82%); color: hsl(220 15% 32%); }

@media (prefers-reduced-motion: reduce) { .mm-fade-up { animation: none !important; } }
`;

function useMmStyleInject() {
  useEffect(() => {
    const id = 'mm-polish-styles';
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id; s.textContent = MM_STYLES;
    document.head.appendChild(s);
  }, []);
}

export function MinutesManager({ meetings = [], members = [] }: MinutesManagerProps) {
  useMmStyleInject();

  // ── Meeting selector ───────────────────────────────────────────────────────
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const selectedMeeting = useMemo(
    () => meetings.find(m => ((m as any).meetingId ?? (m as any).id) === selectedMeetingId) ?? null,
    [meetings, selectedMeetingId],
  );

  // ── Fetch existing minutes ─────────────────────────────────────────────────
  const {
    data: minutesResponse,
    isLoading: minutesLoading,
    refetch: refetchMinutes,
  } = useMinutesByMeeting(selectedMeetingId);

  const existingMinutes: Minutes | null = minutesResponse?.data ?? null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMinutes    = useCreateMinutes();
  const updateMinutes    = useUpdateMinutes();
  const deleteMinutesMut = useDeleteMinutes();
  const publishMinutes   = usePublishMinutes();
  const submitReview     = useSubmitMinutesForReview();
  const addItemMut       = useAddMinuteItem();
  const updateItemMut    = useUpdateMinuteItem();
  const deleteItemMut    = useDeleteMinuteItem();

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const tabIdx  = TABS.findIndex(t => t.id === activeTab);
  const isFirst = tabIdx === 0;
  const isLast  = tabIdx === TABS.length - 1;
  const goNext  = () => !isLast  && setActiveTab(TABS[tabIdx + 1].id);
  const goPrev  = () => !isFirst && setActiveTab(TABS[tabIdx - 1].id);

  // ── Form state ─────────────────────────────────────────────────────────────
  // ── State (declarations FIRST — never call any setter before its hook
  // is initialized; doing so triggers a TDZ error in dev. Previously the
  // sync logic below ran during render and called setItems/setAttendance
  // before those hooks were declared, which is what produced the
  // "Cannot access 'setAttendance' before initialization" crash on the
  // Minutes page.) ──────────────────────────────────────────────────────
  const [title,               setTitle]               = useState('');
  const [summary,             setSummary]             = useState('');
  const [preparedById,        setPreparedById]        = useState('');
  const [approvedById,        setApprovedById]        = useState('');
  const [approvalOfPrevious,  setApprovalOfPrevious]  = useState('');
  const [items,               setItems]               = useState<LocalItem[]>([]);
  const [attendance,          setAttendance]          = useState<AttendanceRow[]>(() =>
    members.map(u => ({ userId: u.userId, present: false })),
  );
  const [syncedMinutesId,     setSyncedMinutesId]     = useState<string | null>(null);
  const [syncedMeetingId,     setSyncedMeetingId]     = useState<string | null>(null);

  // ── Sync from existing minutes (effect, not inline-during-render) ────────
  // Runs only when the user picks a different existing minutes record.
  useEffect(() => {
    if (!existingMinutes || existingMinutes.id === syncedMinutesId) return;
    setSyncedMinutesId(existingMinutes.id);
    setTitle(existingMinutes.title ?? '');
    setSummary(existingMinutes.summary ?? '');
    setItems(
      (existingMinutes.items ?? []).map(i => ({
        clientId:          i.id,
        serverId:          i.id,
        orderIndex:        i.orderIndex,
        type:              i.type,
        title:             i.title,
        content:           i.content,
        agendaItemId:      i.agendaItemId,
        timestamp:         i.timestamp,
        voteQuestion:      i.votingDetails?.question,
        voteInFavor:       i.votingDetails?.inFavor,
        voteAgainst:       i.votingDetails?.against,
        voteAbstain:       i.votingDetails?.abstain,
        actionDescription: i.actionItemDetails?.description,
        actionAssigneeId:  i.actionItemDetails?.assignedTo?.[0]?.userId,
        actionAssigneeName:i.actionItemDetails?.assignedTo?.[0]?.name,
        actionDueDate:     i.actionItemDetails?.dueDate,
        actionPriority:    i.actionItemDetails?.priority,
        isDirty:           false,
      })),
    );
  }, [existingMinutes, syncedMinutesId]);

  // ── Sync from selected meeting (effect) ──────────────────────────────────
  // Pre-populates the title and attendance roster the first time the user
  // picks a meeting that doesn't yet have minutes.
  useEffect(() => {
    if (!selectedMeeting || selectedMeeting.id === syncedMeetingId) return;
    setSyncedMeetingId(selectedMeeting.id);
    if (!existingMinutes) {
      setTitle(selectedMeeting.title ? `${selectedMeeting.title} — Minutes` : '');
      setAttendance(members.map(u => ({
        userId:  u.userId,
        present: (selectedMeeting.attendees ?? []).some(a => a.userId === u.userId),
      })));
    }
  }, [selectedMeeting, syncedMeetingId, existingMinutes, members]);

  // ── Item helpers ────────────────────────────────────────────────────────
  function addItem(type: MinuteItemType = 'general') {
    setItems(p => [...p, {
      clientId: `mi-${Date.now()}`, orderIndex: p.length,
      type, title: '', content: '', isDirty: true,
    }]);
  }

  function updateItem<K extends keyof LocalItem>(clientId: string, k: K, v: LocalItem[K]) {
    setItems(p => p.map(i => i.clientId === clientId ? { ...i, [k]: v, isDirty: true } : i));
  }

  function changeActionAssignee(clientId: string, userId: string) {
    const u = members.find(m => m.userId === userId);
    setItems(p => p.map(i =>
      i.clientId === clientId
        ? { ...i, actionAssigneeId: userId, actionAssigneeName: u ? `${u.firstName} ${u.lastName}` : '', isDirty: true }
        : i,
    ));
  }

  const generalItems  = items.filter(i => i.type === 'general' || i.type === 'discussion');
  const decisionItems = items.filter(i => i.type === 'decision' || i.type === 'vote');
  const actionItems   = items.filter(i => i.type === 'action_item');

  // ── Attendance ─────────────────────────────────────────────────────────────

  const fullAttendance: AttendanceRow[] = members.map(u => {
    const row = attendance.find(a => a.userId === u.userId);
    return row ?? { userId: u.userId, present: false };
  });

  const togglePresent = (userId: string) =>
    setAttendance(prev => {
      const exists = prev.find(a => a.userId === userId);
      if (exists) return prev.map(a => a.userId === userId ? { ...a, present: !a.present } : a);
      return [...prev, { userId, present: true }];
    });

  const presentCount = fullAttendance.filter(a =>  a.present).length;
  const absentCount  = fullAttendance.filter(a => !a.present).length;

  // ── Next meeting ───────────────────────────────────────────────────────────
  const [nextMeeting, setNextMeeting] = useState<NextMeeting>({
    date: '', time: '', location: '', agendaHighlights: '',
  });

  // ── Delete targets ─────────────────────────────────────────────────────────
  const [deleteItemTarget,   setDeleteItemTarget]   = useState<LocalItem | null>(null);
  const [deleteMinutesOpen,  setDeleteMinutesOpen]  = useState(false);

  const hasDirty = items.some(i => i.isDirty);
  const isSaving = createMinutes.isPending || updateMinutes.isPending ||
    addItemMut.isPending || updateItemMut.isPending;

  // Lock state. Computed from the selected meeting's status + existing
  // minutes' status — published/approved minutes and completed/cancelled
  // meetings all gate edits to varying degrees. See computeMeetingLock.
  const lock = useMemo(
    () => computeMeetingLock(selectedMeeting, existingMinutes),
    [selectedMeeting, existingMinutes],
  );

  // Print / "Save as PDF" — opens the browser print dialog with a clean
  // print-only document so the user can save a properly formatted record.
  // Resolve member names locally so the PDF doesn't ship raw userIds.
  const handlePrint = useCallback(() => {
    if (!existingMinutes) {
      toast.error('Save the minutes before printing');
      return;
    }
    const resolved = attendance.map((row) => {
      const member = members.find((m) => m.userId === row.userId);
      const fullName = member ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() : '';
      return {
        userId: row.userId,
        name: fullName || member?.email || row.userId,
        email: member?.email,
        role: member?.role,
        // Map the local `present` boolean onto the broader rsvpStatus enum
        // the print template understands, so present/absent render correctly.
        rsvpStatus: row.present ? 'attended' : 'absent',
      };
    });
    printMinutes({
      minutes: existingMinutes,
      meeting: selectedMeeting,
      attendance: resolved,
    });
  }, [existingMinutes, selectedMeeting, attendance, members]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!title.trim())     { toast.error('Please enter a minutes title'); return; }
    if (!summary.trim())   { toast.error('Please enter a summary'); return; }
    if (!selectedMeetingId){ toast.error('Please select a meeting first'); return; }

    try {
      let minutesId = existingMinutes?.id;

      if (!minutesId) {
        const created = await createMinutes.mutateAsync({
          title:    title.trim(),
          summary:  summary.trim(),
          meetingId: selectedMeetingId,
        });
        minutesId = created.data?.id ?? (created as any).id;
        toast.success('Minutes created');
      } else {
        await updateMinutes.mutateAsync({
          minutesId,
          data: { title: title.trim(), summary: summary.trim() },
        });
      }

      // Save dirty items
      const dirtyItems = items.filter(i => i.isDirty);
      for (const item of dirtyItems) {
        const payload = buildItemPayload(item);
        if (item.serverId) {
          await updateItemMut.mutateAsync({ minutesId: minutesId!, itemId: item.serverId, data: payload });
        } else {
          const created = await addItemMut.mutateAsync({ minutesId: minutesId!, data: payload });
          const newId = created.data?.id ?? (created as any).id;
          setItems(p => p.map(i => i.clientId === item.clientId ? { ...i, serverId: newId, isDirty: false } : i));
        }
      }

      setItems(p => p.map(i => ({ ...i, isDirty: false })));
      toast.success('Minutes saved successfully');
      refetchMinutes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to save minutes');
    }
  }, [title, summary, selectedMeetingId, existingMinutes, items,
      createMinutes, updateMinutes, addItemMut, updateItemMut, refetchMinutes]);

  function buildItemPayload(item: LocalItem): CreateMinuteItemData {
    const base: CreateMinuteItemData = {
      orderIndex: item.orderIndex,
      type:       item.type,
      title:      item.title,
      content:    item.content,
      agendaItemId: item.agendaItemId,
      timestamp:    item.timestamp,
    };
    if (item.type === 'vote' && item.voteQuestion) {
      base.votingDetails = {
        question: item.voteQuestion,
        inFavor:  item.voteInFavor  ?? 0,
        against:  item.voteAgainst  ?? 0,
        abstain:  item.voteAbstain  ?? 0,
        isPassed: (item.voteInFavor ?? 0) > (item.voteAgainst ?? 0),
      };
    }
    if (item.type === 'action_item' && item.actionDescription) {
      const assignees: ActionItemAssignee[] = item.actionAssigneeId
        ? [{ userId: item.actionAssigneeId, name: item.actionAssigneeName ?? '' }] : [];
      base.actionItemDetails = {
        description: item.actionDescription,
        assignedTo:  assignees,
        dueDate:     item.actionDueDate ?? '',
        priority:    item.actionPriority ?? 'medium',
      };
    }
    return base;
  }

  const handleDeleteItem = async () => {
    if (!deleteItemTarget) return;
    if (deleteItemTarget.serverId && existingMinutes?.id) {
      try {
        await deleteItemMut.mutateAsync({ minutesId: existingMinutes.id, itemId: deleteItemTarget.serverId });
        toast.success('Item removed');
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to remove item');
        setDeleteItemTarget(null);
        return;
      }
    }
    setItems(p => p.filter(i => i.clientId !== deleteItemTarget.clientId));
    setDeleteItemTarget(null);
  };

  const handleDeleteMinutes = async () => {
    if (!existingMinutes?.id) return;
    try {
      await deleteMinutesMut.mutateAsync(existingMinutes.id);
      toast.success('Minutes deleted');
      setDeleteMinutesOpen(false);
      setItems([]);
      setSyncedMinutesId(null);
      refetchMinutes();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete minutes');
    }
  };

  const handlePublish = async () => {
    if (!existingMinutes?.id) { toast.error('Save minutes first before publishing'); return; }
    try {
      await publishMinutes.mutateAsync(existingMinutes.id);
      toast.success('Minutes published');
      refetchMinutes();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish');
    }
  };

  const handleSubmitReview = async () => {
    if (!existingMinutes?.id) { toast.error('Save minutes first'); return; }
    try {
      await submitReview.mutateAsync(existingMinutes.id);
      toast.success('Submitted for review');
      refetchMinutes();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit');
    }
  };

  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mm-root space-y-5 antialiased">

      {/* Header — gradient logo tile + shimmer title to match Members / Organisation */}
      <div className="mm-fade-up flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="relative h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/25 ring-1 ring-white/15">
            <FileText className="h-5 w-5 text-white drop-shadow-sm" strokeWidth={2.25} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h2 className="mm-grad-title text-xl sm:text-[1.45rem] font-bold tracking-tight leading-tight">
              Meeting Minutes
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Capture decisions, attendance and action items for each meeting.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {existingMinutes && (
            <>
              {existingMinutes.status === 'draft' || existingMinutes.status === 'in_progress' ? (
                <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-9"
                  onClick={handleSubmitReview}
                  disabled={submitReview.isPending || !lock.canEditMinutes}
                  title={!lock.canEditMinutes ? lock.label : undefined}>
                  {submitReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Submit for review
                </Button>
              ) : existingMinutes.status === 'approved' ? (
                <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-9"
                  onClick={handlePublish}
                  disabled={publishMinutes.isPending || !lock.canPublishMinutes}
                  title={!lock.canPublishMinutes ? lock.label : undefined}>
                  {publishMinutes.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Publish
                </Button>
              ) : null}
              <Button variant="outline" size="sm"
                className="rounded-lg gap-1.5 h-9 text-destructive border-destructive/30 hover:bg-destructive/5 disabled:opacity-50"
                onClick={() => setDeleteMinutesOpen(true)}
                disabled={!lock.canDeleteMinutes}
                title={!lock.canDeleteMinutes ? lock.label : undefined}>
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-9"
            onClick={handlePrint} disabled={!existingMinutes}
            title={!existingMinutes ? 'Save the minutes first' : 'Open print dialog (use "Save as PDF" to export)'}>
            <Printer className="h-3.5 w-3.5" />Print / PDF
          </Button>
          <Button size="sm"
            className="rounded-lg gap-1.5 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20 ring-1 ring-inset ring-white/10 disabled:opacity-60 disabled:from-slate-400 disabled:to-slate-500"
            onClick={handleSave}
            disabled={isSaving || !lock.canEditMinutes}
            title={!lock.canEditMinutes ? lock.label : undefined}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {existingMinutes ? 'Update minutes' : 'Save minutes'}
          </Button>
        </div>
      </div>

      {/* Lock banner — surfaces *why* the editor is read-only / partially
          locked. Without this, the user just sees disabled buttons and has
          no way to know whether it's a permission issue, a network issue,
          or simply that the meeting has been finalized. */}
      {lock.isLocked && (
        <div className={`mm-fade-up rounded-2xl border px-4 py-3 flex items-start gap-3 ${
          lock.reason === 'minutes-published'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-300'
            : lock.reason === 'meeting-cancelled'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-300'
              : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-300'
        }`}>
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-sm leading-snug">
            <p className="font-semibold">{lock.label}</p>
            <p className="text-xs opacity-80 mt-0.5">
              {lock.reason === 'minutes-published'
                ? 'These minutes are the official published record. To make corrections, request a republish from the org admin.'
                : lock.reason === 'minutes-approved'
                  ? 'Minutes have been approved. They are no longer editable; only the publish action is available.'
                  : lock.reason === 'meeting-cancelled'
                    ? 'This meeting was cancelled. Existing minutes are preserved for the record but cannot be modified.'
                    : 'The meeting is marked completed. You can still finalize minutes but the meeting details themselves are locked.'}
            </p>
          </div>
        </div>
      )}

      {/* Meeting selector */}
      <Card className="mm-card mm-fade-up border-0 shadow-none p-0" style={{ animationDelay: '60ms' }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className={lbl}>Select Meeting <span className="text-red-500 normal-case">*</span></label>
              <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
                <SelectTrigger className={inp}>
                  <SelectValue placeholder="Choose a meeting to record minutes for…" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.length === 0 ? (
                    <SelectItem value="_none" disabled>No meetings available</SelectItem>
                  ) : (
                    meetings.map(m => {
                      const mId = (m as any).meetingId ?? (m as any).id ?? '';
                      const mDate = (m as any).scheduledDate ?? m.date;
                      return (
                        <SelectItem key={mId || m.title} value={mId}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{m.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {mDate ? new Date(mDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {existingMinutes && (
              <div className="flex items-center gap-2 pt-5">
                <Badge className={`text-[11px] font-semibold uppercase tracking-wider gap-1.5 border px-2.5 py-1 rounded-full ${
                  existingMinutes.status === 'published' ? 'mm-status-published bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' :
                  existingMinutes.status === 'approved'  ? 'mm-status-approved bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60' :
                  existingMinutes.status === 'review'    ? 'mm-status-review bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60' :
                  'mm-status-draft bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    existingMinutes.status === 'published' ? 'bg-emerald-500' :
                    existingMinutes.status === 'approved'  ? 'bg-blue-500' :
                    existingMinutes.status === 'review'    ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  {existingMinutes.status ?? 'draft'}
                </Badge>
              </div>
            )}
          </div>

          {minutesLoading && selectedMeetingId && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Checking for existing minutes…
            </div>
          )}
          {!minutesLoading && selectedMeetingId && !existingMinutes && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />No minutes yet for this meeting — fill in the form below to create them.
            </p>
          )}
        </CardContent>
      </Card>

      {!selectedMeetingId ? (
        <div className="mm-fade-up flex flex-col items-center gap-4 py-20 rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/20 to-transparent text-center">
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shadow-sm">
            <FileText className="h-7 w-7 text-indigo-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Pick a meeting to start</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Choose a meeting from the selector above to create or edit its minutes, attendance and action items.
            </p>
          </div>
        </div>
      ) : (
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
            <Card className="mm-card mm-fade-up border-0 shadow-none p-0">
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
                  <label className={lbl}>Minutes Title <span className="text-red-500 normal-case">*</span></label>
                  <Input value={title} className={inp} placeholder="e.g., Q1 Board Meeting Minutes"
                    onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Summary <span className="text-red-500 normal-case">*</span></label>
                  <Textarea value={summary} rows={4}
                    className="resize-none rounded-xl border-border/60 bg-background text-sm"
                    placeholder="Brief summary of the meeting proceedings…"
                    onChange={e => setSummary(e.target.value)} />
                </div>
                {selectedMeeting && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border/40">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(selectedMeeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                    { label: 'Prepared By', value: preparedById, onChange: setPreparedById },
                    { label: 'Approved By', value: approvedById, onChange: setApprovedById },
                  ].map(({ label, value, onChange }) => (
                    <div key={label}>
                      <label className={lbl}>{label}</label>
                      <Select value={value} onValueChange={onChange}>
                        <SelectTrigger className={inp}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>
                          {members.map(u => (
                            <SelectItem key={u.userId} value={u.userId}>{u.firstName} {u.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div>
                  <label className={lbl}>Approval of Previous Minutes</label>
                  <Select value={approvalOfPrevious} onValueChange={setApprovalOfPrevious}>
                    <SelectTrigger className={inp}><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="not_available">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Attendance tab ── */}
          {activeTab === 'attendance' && (
            <Card className="mm-card mm-fade-up border-0 shadow-none p-0">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Attendance Register
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                      <CheckCircle className="h-3 w-3" />Present: {presentCount}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 text-xs">
                      <AlertCircle className="h-3 w-3" />Absent: {absentCount}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No members available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.map(u => {
                      const row       = fullAttendance.find(a => a.userId === u.userId);
                      const isPresent = row?.present ?? false;
                      return (
                        <div key={u.userId}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isPresent
                              ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/10'
                              : 'border-red-300/40 bg-red-50/30 dark:bg-red-950/10'
                          }`}
                          onClick={() => togglePresent(u.userId)}>
                          <Checkbox checked={isPresent} onCheckedChange={() => togglePresent(u.userId)} />
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={u.profilePictureUrl} />
                            <AvatarFallback className="text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.title ?? u.role}</p>
                          </div>
                          <Badge className={`text-xs border-0 shrink-0 ${isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {isPresent ? 'Present' : 'Absent'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Minutes items tab ── */}
          {activeTab === 'items' && (
            <Card className="mm-card mm-fade-up border-0 shadow-none p-0">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Discussion Items
                  </CardTitle>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8"
                    onClick={() => addItem('general')}>
                    <Plus className="h-3.5 w-3.5" />Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-3">
                {generalItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No items recorded yet.</p>
                    <Button onClick={() => addItem('general')} variant="outline" className="rounded-xl gap-2">
                      <Plus className="h-4 w-4" />Add First Item
                    </Button>
                  </div>
                ) : (
                  generalItems.map((item, idx) => (
                    <div key={item.clientId}
                      className={`p-4 rounded-xl border space-y-3 ${item.isDirty ? 'border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10' : 'border-border/60 bg-muted/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{idx + 1}</span>
                          <Select value={item.type}
                            onValueChange={v => updateItem(item.clientId, 'type', v as MinuteItemType)}>
                            <SelectTrigger className="h-7 w-32 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="discussion">Discussion</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10"
                          onClick={() => setDeleteItemTarget(item)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <Input value={item.title} placeholder="Item title"
                        className="h-9 text-sm rounded-xl border-border/50"
                        onChange={e => updateItem(item.clientId, 'title', e.target.value)} />
                      <Textarea value={item.content} placeholder="Discussion notes…" rows={3}
                        className="resize-none text-sm rounded-xl border-border/50"
                        onChange={e => updateItem(item.clientId, 'content', e.target.value)} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Decisions & Votes tab ── */}
          {activeTab === 'decisions' && (
            <Card className="mm-card mm-fade-up border-0 shadow-none p-0">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gavel className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Decisions & Votes
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8" onClick={() => addItem('decision')}>
                      <Plus className="h-3.5 w-3.5" />Decision
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8" onClick={() => addItem('vote')}>
                      <Plus className="h-3.5 w-3.5" />Vote
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5 space-y-3">
                {decisionItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <Gavel className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No decisions or votes recorded.</p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => addItem('decision')} variant="outline" className="rounded-xl gap-2">
                        <Plus className="h-4 w-4" />Decision
                      </Button>
                      <Button onClick={() => addItem('vote')} variant="outline" className="rounded-xl gap-2">
                        <Plus className="h-4 w-4" />Vote
                      </Button>
                    </div>
                  </div>
                ) : (
                  decisionItems.map((item, idx) => (
                    <div key={item.clientId}
                      className={`p-4 rounded-xl border space-y-3 ${item.isDirty ? 'border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10' : 'border-border/60 bg-muted/20'}`}>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="gap-1.5">
                          {item.type === 'vote' ? <Gavel className="h-3 w-3" /> : null}
                          {item.type === 'vote' ? `Vote ${idx + 1}` : `Decision ${idx + 1}`}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10"
                          onClick={() => setDeleteItemTarget(item)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <Input value={item.title} placeholder="Title"
                        className="h-9 text-sm rounded-xl border-border/50"
                        onChange={e => updateItem(item.clientId, 'title', e.target.value)} />
                      <Textarea value={item.content} placeholder="Full text of the decision or resolution…" rows={2}
                        className="resize-none text-sm rounded-xl border-border/50"
                        onChange={e => updateItem(item.clientId, 'content', e.target.value)} />
                      {item.type === 'vote' && (
                        <>
                          <Input value={item.voteQuestion ?? ''} placeholder="What was voted on?"
                            className="h-9 text-sm rounded-xl border-border/50"
                            onChange={e => updateItem(item.clientId, 'voteQuestion', e.target.value)} />
                          <div className="grid grid-cols-3 gap-3">
                            {([
                              { label: 'In Favour', key: 'voteInFavor'  as const },
                              { label: 'Against',   key: 'voteAgainst'  as const },
                              { label: 'Abstain',   key: 'voteAbstain'  as const },
                            ]).map(({ label, key }) => (
                              <div key={key}>
                                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                                <Input type="number" min={0}
                                  value={item[key] ?? ''}
                                  className="h-9 text-sm rounded-xl border-border/50"
                                  onChange={e => updateItem(item.clientId, key, parseInt(e.target.value) || 0)} />
                              </div>
                            ))}
                          </div>
                          {(item.voteInFavor !== undefined || item.voteAgainst !== undefined) && (
                            <div className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${
                              (item.voteInFavor ?? 0) > (item.voteAgainst ?? 0)
                                ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {(item.voteInFavor ?? 0) > (item.voteAgainst ?? 0) ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {(item.voteInFavor ?? 0) > (item.voteAgainst ?? 0) ? 'Motion Passed' : 'Motion Failed'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Action Items tab ── */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <Card className="mm-card mm-fade-up border-0 shadow-none p-0 overflow-hidden">
                <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ListChecks className="h-3.5 w-3.5 text-primary" />
                      </div>
                      Action Items
                    </CardTitle>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8"
                      onClick={() => addItem('action_item')}>
                      <Plus className="h-3.5 w-3.5" />Add Action
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {actionItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border/40 m-5 rounded-xl">
                      <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">No action items recorded.</p>
                      <Button onClick={() => addItem('action_item')} variant="outline" className="rounded-xl gap-2">
                        <Plus className="h-4 w-4" />Add Action Item
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/30">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground min-w-[200px]">Action</th>
                            <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground min-w-[130px]">Owner</th>
                            <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground min-w-[130px]">Due Date</th>
                            <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground w-28">Priority</th>
                            <th className="py-3 px-3 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {actionItems.map(item => (
                            <tr key={item.clientId} className={`hover:bg-muted/20 transition-colors group ${item.isDirty ? 'bg-amber-50/20' : ''}`}>
                              <td className="py-2.5 px-4">
                                <Input value={item.actionDescription ?? ''} placeholder="Describe the action…"
                                  className="h-8 text-sm rounded-lg border-border/50 min-w-[180px]"
                                  onChange={e => updateItem(item.clientId, 'actionDescription', e.target.value)} />
                              </td>
                              <td className="py-2.5 px-3">
                                <Select value={item.actionAssigneeId ?? ''}
                                  onValueChange={v => changeActionAssignee(item.clientId, v)}>
                                  <SelectTrigger className="min-w-[120px] h-8 text-sm rounded-lg border-border/50">
                                    <SelectValue placeholder="Assignee" />
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
                              <td className="py-2.5 px-3">
                                <Input type="date" value={item.actionDueDate ?? ''}
                                  className="min-w-[130px] h-8 text-sm rounded-lg border-border/50"
                                  onChange={e => updateItem(item.clientId, 'actionDueDate', e.target.value)} />
                              </td>
                              <td className="py-2.5 px-3">
                                <Select value={item.actionPriority ?? 'medium'}
                                  onValueChange={v => updateItem(item.clientId, 'actionPriority', v as ActionItemDetails['priority'])}>
                                  <SelectTrigger className="min-w-[100px] h-8 text-sm rounded-lg border-border/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-2.5 px-3">
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

              {/* Next meeting */}
              <Card className="mm-card mm-fade-up border-0 shadow-none p-0">
                <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Next Meeting Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      { label: 'Date',              type: 'date', key: 'date'              as keyof NextMeeting, ph: '' },
                      { label: 'Time',              type: 'time', key: 'time'              as keyof NextMeeting, ph: '' },
                      { label: 'Location',          type: 'text', key: 'location'          as keyof NextMeeting, ph: 'Conference Room or Zoom' },
                      { label: 'Agenda Highlights', type: 'text', key: 'agendaHighlights'  as keyof NextMeeting, ph: 'Brief overview' },
                    ]).map(({ label, type, key, ph }) => (
                      <div key={key}>
                        <label className={lbl}>{label}</label>
                        <Input type={type} placeholder={ph} value={nextMeeting[key]} className={inp}
                          onChange={e => setNextMeeting(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Preview tab ── */}
          {activeTab === 'preview' && (
            <Card className="mm-card mm-fade-up border-0 shadow-none p-0">
              <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Minutes Preview
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8">
                      <Printer className="h-3.5 w-3.5" />Print
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8">
                      <Download className="h-3.5 w-3.5" />Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <div className="bg-white text-black rounded-xl shadow-lg p-8 max-w-3xl mx-auto border">
                  {/* Doc header */}
                  <div className="text-center border-b-2 border-gray-200 pb-5 mb-6">
                    <h1 className="text-2xl font-bold">{title || 'Meeting Minutes'}</h1>
                    {selectedMeeting && (
                      <div className="flex items-center justify-center flex-wrap gap-4 text-sm text-gray-500 mt-2">
                        <span>{new Date(selectedMeeting.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        {selectedMeeting.location && <span>{selectedMeeting.location}</span>}
                      </div>
                    )}
                  </div>

                  {summary && (
                    <section className="mb-5">
                      <h2 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Summary</h2>
                      <p className="text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg">{summary}</p>
                    </section>
                  )}

                  <section className="mb-6">
                    <h2 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">Attendance</h2>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Present ({presentCount})</p>
                        <ul className="space-y-0.5 text-sm">
                          {fullAttendance.filter(a => a.present).map(a => {
                            const u = members.find(m => m.userId === a.userId);
                            return (
                              <li key={a.userId} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {u ? `${u.firstName} ${u.lastName}` : a.userId}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Absent ({absentCount})</p>
                        <ul className="space-y-0.5 text-sm">
                          {fullAttendance.filter(a => !a.present).map(a => {
                            const u = members.find(m => m.userId === a.userId);
                            return (
                              <li key={a.userId} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                {u ? `${u.firstName} ${u.lastName}` : a.userId}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </section>

                  {generalItems.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">Discussion Items</h2>
                      <div className="space-y-3">
                        {generalItems.map((item, i) => (
                          <div key={item.clientId} className="pl-4 border-l-2 border-gray-200">
                            <p className="font-medium">{item.title || `Item ${i + 1}`}</p>
                            {item.content && <p className="text-sm mt-0.5 text-gray-700">{item.content}</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {decisionItems.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">Decisions & Votes</h2>
                      <div className="space-y-2">
                        {decisionItems.map((item, i) => (
                          <div key={item.clientId} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium">{item.title || `${item.type === 'vote' ? 'Vote' : 'Decision'} ${i + 1}`}</p>
                            {item.content && <p className="text-sm mt-0.5">{item.content}</p>}
                            {item.type === 'vote' && (
                              <p className="text-xs text-gray-500 mt-1">
                                In Favour: {item.voteInFavor ?? 0} · Against: {item.voteAgainst ?? 0} · Abstain: {item.voteAbstain ?? 0}
                                {' · '}
                                <span className={(item.voteInFavor ?? 0) > (item.voteAgainst ?? 0) ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {(item.voteInFavor ?? 0) > (item.voteAgainst ?? 0) ? 'Passed' : 'Failed'}
                                </span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {actionItems.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">Action Items</h2>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-semibold text-gray-600">Action</th>
                            <th className="text-left py-2 font-semibold text-gray-600">Owner</th>
                            <th className="text-left py-2 font-semibold text-gray-600">Due</th>
                            <th className="text-left py-2 font-semibold text-gray-600">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actionItems.map(item => (
                            <tr key={item.clientId} className="border-b last:border-0">
                              <td className="py-2">{item.actionDescription || '—'}</td>
                              <td className="py-2">{fullName(members, item.actionAssigneeId)}</td>
                              <td className="py-2">{item.actionDueDate ? new Date(item.actionDueDate).toLocaleDateString() : '—'}</td>
                              <td className="py-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${priorityCls(item.actionPriority)}`}>
                                  {item.actionPriority ?? 'medium'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}

                  {(nextMeeting.date || nextMeeting.time) && (
                    <section className="mb-6">
                      <h2 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Next Meeting</h2>
                      <p className="text-sm">
                        {nextMeeting.date && new Date(nextMeeting.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {nextMeeting.time && ` at ${nextMeeting.time}`}
                        {nextMeeting.location && ` — ${nextMeeting.location}`}
                      </p>
                    </section>
                  )}

                  <div className="border-t-2 border-gray-200 pt-4 mt-6 flex justify-between text-sm">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Prepared By</p>
                      <p className="font-medium mt-0.5">{fullName(members, preparedById)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-semibold">Approved By</p>
                      <p className="font-medium mt-0.5">{fullName(members, approvedById)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom nav */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={goPrev} disabled={isFirst} className="rounded-xl gap-2">
              <ArrowLeft className="h-4 w-4" />Previous
            </Button>
            <Button onClick={isLast ? handleSave : goNext}
              disabled={isLast && isSaving}
              className="rounded-xl gap-2 shadow-sm">
              {isLast
                ? isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                  : <><Save className="h-4 w-4" />{existingMinutes ? 'Update Minutes' : 'Save Minutes'}</>
                : <>Next <ArrowRight className="h-4 w-4" /></>
              }
            </Button>
          </div>
        </>
      )}

      {/* Delete item confirm */}
      <AlertDialog open={!!deleteItemTarget} onOpenChange={v => { if (!v) setDeleteItemTarget(null); }}>
        <AlertDialogContent className="rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteItemTarget?.title || 'Untitled item'}" will be permanently removed from the minutes.
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

      {/* Delete minutes confirm */}
      <AlertDialog open={deleteMinutesOpen} onOpenChange={setDeleteMinutesOpen}>
        <AlertDialogContent className="rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Delete Minutes
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete these minutes and all their items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleteMinutesMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteMinutes} disabled={deleteMinutesMut.isPending}>
              {deleteMinutesMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Minutes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MinutesManager;