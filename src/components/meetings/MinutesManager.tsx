// src/pages/MinutesManager.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, Calendar, Clock, MapPin, Users,
  CheckCircle, ChevronRight, Save, Download, ListChecks,
  Gavel, AlertCircle, Eye, ArrowLeft, ArrowRight, Printer,
  UserCheck, CalendarPlus, FileText,
} from 'lucide-react';

// ── API types (api.types.ts) ─────────────────────────────────────────────────
import type {
  Meeting,
  Minutes,
  MinuteItem,
  MinuteItemType,
  MinutesStatus,
  User,
  VotingDetails,
  ActionItemDetails,
  ActionItemAssignee,
  CreateMinutesData,
  CreateMinuteItemData,
} from '@/types/api.types';

// ─── Local form-only types ─────────────────────────────────────────────────────
//
// When saving the parent should call:
//   1. MinutesService.create(output.minutesData)            → returns Minutes
//   2. MinutesService.addItem(minutesId, item) per item     → returns MinuteItem
//

/**
 * One editable row in the items list.
 * Mirrors CreateMinuteItemData with an extra clientId for React keys.
 */
interface LocalItem {
  clientId: string;
  orderIndex: number;
  type: MinuteItemType;
  title: string;
  content: string;               // CreateMinuteItemData.content
  agendaItemId?: string;
  timestamp?: string;
  // voting (only when type === 'vote') — matches VotingDetails
  voteQuestion?: string;
  voteInFavor?: number;
  voteAgainst?: number;
  voteAbstain?: number;
  // action (only when type === 'action_item') — matches ActionItemDetails
  actionDescription?: string;
  actionAssigneeId?: string;
  actionAssigneeName?: string;
  actionDueDate?: string;
  actionPriority?: ActionItemDetails['priority'];
}

/** Attendance record — one per board member */
interface AttendanceRow {
  userId: string;
  present: boolean;
}

interface NextMeeting {
  date: string;
  time: string;
  location: string;
  agendaHighlights: string;
}

/** Shape emitted via onSave — parent calls MinutesService */
export interface MinutesFormOutput {
  /** Payload for MinutesService.create() */
  minutesData: CreateMinutesData;
  /** One payload per MinutesService.addItem() call */
  items: CreateMinuteItemData[];
  /** UI-only extras (attendance lives here, not in the Minutes API type) */
  meta: {
    attendance: AttendanceRow[];
    nextMeeting: NextMeeting;
    preparedById: string;
    approvedById: string;
    approvalOfPrevious: string;
  };
}

export interface MinutesManagerProps {
  /** Pre-populate from meetingsService.getMeetingById() */
  meeting?: Meeting;
  /** Existing draft fetched via MinutesService.getByMeetingId() */
  existingMinutes?: Minutes;
  /** Board members for attendance + action-item assignees */
  members?: User[];
  onSave?: (output: MinutesFormOutput) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'details',    label: 'Details',          Icon: Calendar    },
  { id: 'attendance', label: 'Attendance',        Icon: Users       },
  { id: 'items',      label: 'Minute Items',      Icon: FileText    },
  { id: 'decisions',  label: 'Decisions & Votes', Icon: Gavel       },
  { id: 'actions',    label: 'Action Items',      Icon: ListChecks  },
  { id: 'preview',    label: 'Preview',           Icon: Eye         },
];

// MinuteItemType = 'general' | 'decision' | 'action_item' | 'discussion' | 'vote'
const ALL_ITEM_TYPES: { value: MinuteItemType; label: string }[] = [
  { value: 'general',     label: 'General'     },
  { value: 'discussion',  label: 'Discussion'  },
  { value: 'decision',    label: 'Decision'    },
  { value: 'action_item', label: 'Action Item' },
  { value: 'vote',        label: 'Vote'        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fullName(members: User[], id: string): string {
  const u = members.find(m => m.id === id);
  return u ? `${u.firstName} ${u.lastName}` : '—';
}

function priorityCls(p?: string): string {
  if (p === 'high')   return 'bg-red-100 text-red-700';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MinutesManager({
  meeting,
  existingMinutes,
  members = [],
  onSave,
}: MinutesManagerProps) {

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('details');
  const tabIdx  = TABS.findIndex(t => t.id === activeTab);
  const isFirst = tabIdx === 0;
  const isLast  = tabIdx === TABS.length - 1;
  const goNext  = () => !isLast  && setActiveTab(TABS[tabIdx + 1].id);
  const goPrev  = () => !isFirst && setActiveTab(TABS[tabIdx - 1].id);

  // ── Minutes header fields — match CreateMinutesData ────────────────────────
  // CreateMinutesData = { title, summary, meetingId, collaborators? }
  const [title,       setTitle]       = useState(existingMinutes?.title   ?? meeting?.title ?? '');
  const [summary,     setSummary]     = useState(existingMinutes?.summary ?? '');
  const [collaborators, setCollaborators] = useState<string[]>(existingMinutes?.collaborators ?? []);

  // UI-only header fields (not in the Minutes API type)
  const [date,          setDate]          = useState(meeting?.date      ?? '');
  const [startTime,     setStartTime]     = useState(meeting?.startTime ?? '');
  const [endTime,       setEndTime]       = useState(meeting?.endTime   ?? '');
  const [location,      setLocation]      = useState(meeting?.location  ?? '');
  const [preparedById,  setPreparedById]  = useState('');
  const [approvedById,  setApprovedById]  = useState('');
  const [approvalOfPrevious, setApprovalOfPrevious] = useState('');

  // ── Attendance (UI-only — not part of the Minutes API type) ───────────────
  // Build initial attendance from the meeting attendees list if available
  const [attendance, setAttendance] = useState<AttendanceRow[]>(() =>
    members.map(u => ({
      userId:  u.id,
      present: (meeting?.attendees ?? []).some(a => a.userId === u.id),
    })),
  );

  // Re-derive every render so it always reflects current members
  const fullAttendance: AttendanceRow[] = members.map(u => {
    const row = attendance.find(a => a.userId === u.id);
    return row ?? { userId: u.id, present: false };
  });

  const togglePresent = (userId: string) => {
    setAttendance(prev => {
      const exists = prev.find(a => a.userId === userId);
      if (exists) {
        return prev.map(a => a.userId === userId ? { ...a, present: !a.present } : a);
      }
      return [...prev, { userId, present: true }];
    });
  };

  const presentCount = fullAttendance.filter(a =>  a.present).length;
  const absentCount  = fullAttendance.filter(a => !a.present).length;

  // ── Minute items — aligned to CreateMinuteItemData ─────────────────────────
  const [items, setItems] = useState<LocalItem[]>(() =>
    (existingMinutes?.items ?? []).map(i => ({
      clientId:          i.id,
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
    })),
  );

  const addItem = (type: MinuteItemType = 'general') =>
    setItems(p => [...p, {
      clientId: `mi-${Date.now()}`, orderIndex: p.length,
      type, title: '', content: '',
    }]);

  const removeItem = (id: string) => setItems(p => p.filter(i => i.clientId !== id));

  const updateItem = <K extends keyof LocalItem>(id: string, k: K, v: LocalItem[K]) =>
    setItems(p => p.map(i => i.clientId === id ? { ...i, [k]: v } : i));

  const changeActionAssignee = (clientId: string, userId: string) => {
    const u = members.find(m => m.id === userId);
    setItems(p =>
      p.map(i =>
        i.clientId === clientId
          ? { ...i, actionAssigneeId: userId, actionAssigneeName: u ? `${u.firstName} ${u.lastName}` : '' }
          : i,
      ),
    );
  };

  // Typed subsets — recomputed each render
  const generalItems   = items.filter(i => i.type === 'general'    || i.type === 'discussion');
  const decisionItems  = items.filter(i => i.type === 'decision'   || i.type === 'vote');
  const actionItems    = items.filter(i => i.type === 'action_item');

  // ── Next meeting (UI-only) ─────────────────────────────────────────────────
  const [nextMeeting, setNextMeeting] = useState<NextMeeting>({
    date: '', time: '', location: '', agendaHighlights: '',
  });
  const setNextField = (k: keyof NextMeeting, v: string) =>
    setNextMeeting(p => ({ ...p, [k]: v }));

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) { toast.error('Please enter a minutes title'); return; }
    const meetingId = meeting?.id ?? existingMinutes?.meetingId;
    if (!meetingId) { toast.error('No meeting linked to these minutes'); return; }

    const output: MinutesFormOutput = {
      minutesData: {
        title:        title.trim(),
        summary:      summary.trim(),
        meetingId,
        collaborators: collaborators.length ? collaborators : undefined,
      },
      items: items.map(i => {
        const base: CreateMinuteItemData = {
          orderIndex:  i.orderIndex,
          type:        i.type,
          title:       i.title,
          content:     i.content,
          agendaItemId:i.agendaItemId,
          timestamp:   i.timestamp,
        };
        if (i.type === 'vote' && i.voteQuestion) {
          base.votingDetails = {
            question: i.voteQuestion,
            inFavor:  i.voteInFavor  ?? 0,
            against:  i.voteAgainst  ?? 0,
            abstain:  i.voteAbstain  ?? 0,
            isPassed: (i.voteInFavor ?? 0) > (i.voteAgainst ?? 0),
          };
        }
        if (i.type === 'action_item' && i.actionDescription) {
          const assignees: ActionItemAssignee[] = i.actionAssigneeId
            ? [{ userId: i.actionAssigneeId, name: i.actionAssigneeName ?? '' }]
            : [];
          base.actionItemDetails = {
            description: i.actionDescription,
            assignedTo:  assignees,
            dueDate:     i.actionDueDate ?? '',
            priority:    i.actionPriority ?? 'medium',
          };
        }
        return base;
      }),
      meta: {
        attendance: fullAttendance,
        nextMeeting,
        preparedById,
        approvedById,
        approvalOfPrevious,
      },
    };

    onSave?.(output);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Meeting Minutes</h1>
          <p className="text-muted-foreground">Create and manage meeting minutes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" />Print</Button>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={handleSave}>
            <Save className="h-4 w-4" />Save Minutes
          </Button>
        </div>
      </div>

      {/* Step strip */}
      <Card className="border bg-card/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {TABS.map(({ id, label, Icon }, idx) => {
                const isActive    = activeTab === id;
                const isCompleted = idx < tabIdx;
                return (
                  <div key={id} className="flex items-center">
                    <button
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        isActive      ? 'bg-primary text-primary-foreground shadow-sm'
                        : isCompleted ? 'text-foreground hover:bg-muted'
                        :               'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive      ? 'bg-primary-foreground text-primary'
                        : isCompleted ? 'bg-emerald-500 text-white'
                        :               'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
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
            <div className="flex items-center gap-1.5 shrink-0 border-l pl-3">
              <Button variant="outline" size="icon" onClick={goPrev} disabled={isFirst} className="h-8 w-8">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">{tabIdx + 1}/{TABS.length}</span>
              <Button variant="outline" size="icon" onClick={goNext} disabled={isLast} className="h-8 w-8">
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab: Details ──────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <Card className="border bg-card/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>
              Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title — maps to CreateMinutesData.title */}
            <div className="space-y-2">
              <Label>Minutes Title *</Label>
              <Input
                placeholder="e.g., Q1 Board Meeting Minutes"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Summary — maps to CreateMinutesData.summary */}
            <div className="space-y-2">
              <Label>Summary *</Label>
              <Textarea
                placeholder="Brief summary of the meeting…"
                rows={3}
                className="resize-none"
                value={summary}
                onChange={e => setSummary(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Conference Room A or Virtual"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Approval of Previous Minutes</Label>
                <Select value={approvalOfPrevious} onValueChange={setApprovalOfPrevious}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prepared by / Approved by (UI roles) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Prepared By', value: preparedById, onChange: setPreparedById },
                { label: 'Approved By', value: approvedById, onChange: setApprovedById },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {members.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Attendance ───────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <Card className="border bg-card/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><UserCheck className="h-4 w-4 text-primary" /></div>
                Attendance Register
              </div>
              <div className="flex gap-2">
                <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 border-emerald-200 border">
                  <CheckCircle className="h-3 w-3" />Present: {presentCount}
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <AlertCircle className="h-3 w-3" />Absent: {absentCount}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No members available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.map(u => {
                  const row       = fullAttendance.find(a => a.userId === u.id);
                  const isPresent = row?.present ?? false;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isPresent
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-sm'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                      onClick={() => togglePresent(u.id)}
                    >
                      <Checkbox checked={isPresent} onCheckedChange={() => togglePresent(u.id)} />
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={u.profilePictureUrl} alt={u.firstName} />
                        <AvatarFallback className="text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.title ?? u.role}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 border-0 ${
                        isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
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

      {/* ── Tab: Minute Items (general / discussion) ─────────────────────── */}
      {activeTab === 'items' && (
        <Card className="border bg-card/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div>
                Minute Items
              </div>
              <Button variant="outline" size="sm" onClick={() => addItem('general')} className="gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {generalItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No minute items recorded.</p>
                <Button onClick={() => addItem('general')} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />Add First Item
                </Button>
              </div>
            ) : (
              generalItems.map((item, idx) => (
                <div key={item.clientId} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Select
                        value={item.type}
                        onValueChange={v => updateItem(item.clientId, 'type', v as MinuteItemType)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="discussion">Discussion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => removeItem(item.clientId)}
                      className="h-7 w-7 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <Input
                      placeholder="Item title"
                      value={item.title}
                      className="h-8 text-sm"
                      onChange={e => updateItem(item.clientId, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {/* content — maps to CreateMinuteItemData.content */}
                    <Label className="text-xs text-muted-foreground">Notes / Content</Label>
                    <Textarea
                      placeholder="Discussion notes…"
                      rows={3}
                      className="resize-none text-sm"
                      value={item.content}
                      onChange={e => updateItem(item.clientId, 'content', e.target.value)}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Decisions & Votes ────────────────────────────────────────── */}
      {activeTab === 'decisions' && (
        <Card className="border bg-card/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><Gavel className="h-4 w-4 text-primary" /></div>
                Decisions & Votes
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addItem('decision')} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" />Decision
                </Button>
                <Button variant="outline" size="sm" onClick={() => addItem('vote')} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" />Vote
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {decisionItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Gavel className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No decisions or votes recorded.</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => addItem('decision')} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />Decision
                  </Button>
                  <Button onClick={() => addItem('vote')} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />Vote
                  </Button>
                </div>
              </div>
            ) : (
              decisionItems.map((item, idx) => (
                <div key={item.clientId} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1.5">
                      {item.type === 'vote' ? <Gavel className="h-3 w-3" /> : null}
                      {item.type === 'decision' ? 'Decision' : 'Vote'} {idx + 1}
                    </Badge>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => removeItem(item.clientId)}
                      className="h-7 w-7 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <Input
                      placeholder="Decision / vote title"
                      value={item.title}
                      className="h-8 text-sm"
                      onChange={e => updateItem(item.clientId, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Content / Resolution</Label>
                    <Textarea
                      placeholder="Full text of the decision or resolution…"
                      rows={2}
                      className="resize-none text-sm"
                      value={item.content}
                      onChange={e => updateItem(item.clientId, 'content', e.target.value)}
                    />
                  </div>
                  {/* VotingDetails — only rendered for type='vote' */}
                  {item.type === 'vote' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Vote Question</Label>
                        <Input
                          placeholder="What was voted on?"
                          value={item.voteQuestion ?? ''}
                          className="h-8 text-sm"
                          onChange={e => updateItem(item.clientId, 'voteQuestion', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { label: 'In Favour', key: 'voteInFavor' },
                          { label: 'Against',   key: 'voteAgainst' },
                          { label: 'Abstain',   key: 'voteAbstain' },
                        ] as const).map(({ label, key }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">{label}</Label>
                            <Input
                              type="number" min={0}
                              className="h-8 text-sm"
                              value={item[key] ?? ''}
                              onChange={e =>
                                updateItem(item.clientId, key, parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Action Items ─────────────────────────────────────────────── */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <Card className="border bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10"><ListChecks className="h-4 w-4 text-primary" /></div>
                  Action Items
                </div>
                <Button variant="outline" size="sm" onClick={() => addItem('action_item')} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" />Add Action
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <ListChecks className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No action items recorded.</p>
                  <Button onClick={() => addItem('action_item')} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />Add Action Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Action</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Owner</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Due Date</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Priority</th>
                        <th className="py-2.5 px-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {actionItems.map(item => (
                        <tr key={item.clientId} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-2.5 px-2">
                            <Input
                              placeholder="Describe the action…"
                              value={item.actionDescription ?? ''}
                              onChange={e => updateItem(item.clientId, 'actionDescription', e.target.value)}
                              className="h-8 text-sm min-w-[180px]"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <Select
                              value={item.actionAssigneeId ?? ''}
                              onValueChange={v => changeActionAssignee(item.clientId, v)}
                            >
                              <SelectTrigger className="min-w-[130px] h-8 text-sm">
                                <SelectValue placeholder="Assignee" />
                              </SelectTrigger>
                              <SelectContent>
                                {members.map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-2">
                            <Input
                              type="date"
                              value={item.actionDueDate ?? ''}
                              onChange={e => updateItem(item.clientId, 'actionDueDate', e.target.value)}
                              className="min-w-[130px] h-8 text-sm"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <Select
                              value={item.actionPriority ?? 'medium'}
                              onValueChange={v =>
                                updateItem(item.clientId, 'actionPriority', v as ActionItemDetails['priority'])
                              }
                            >
                              <SelectTrigger className="min-w-[100px] h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-2">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => removeItem(item.clientId)}
                              className="h-7 w-7 hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
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
          <Card className="border bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-primary/10"><CalendarPlus className="h-4 w-4 text-primary" /></div>
                Next Meeting Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { label: 'Date',               type: 'date', key: 'date',              ph: '' },
                  { label: 'Time',               type: 'time', key: 'time',              ph: '' },
                  { label: 'Location',           type: 'text', key: 'location',          ph: 'Conference Room or Zoom' },
                  { label: 'Agenda Highlights',  type: 'text', key: 'agendaHighlights',  ph: 'Brief overview' },
                ] as const).map(({ label, type, key, ph }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      type={type}
                      placeholder={ph}
                      value={nextMeeting[key]}
                      onChange={e => setNextField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Preview ──────────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <Card className="border bg-card/60 border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10"><Eye className="h-4 w-4 text-primary" /></div>
                  Minutes Preview
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Printer className="h-3.5 w-3.5" />Print
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Download className="h-3.5 w-3.5" />Export PDF
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Print-style document */}
              <div className="bg-white text-black rounded-xl shadow-lg p-8 max-w-3xl mx-auto border">
                {/* Doc header */}
                <div className="text-center border-b-2 border-gray-200 pb-5 mb-6">
                  <h1 className="text-2xl font-bold mb-2">{title || 'Meeting Minutes'}</h1>
                  <div className="flex items-center justify-center flex-wrap gap-4 text-sm text-gray-500">
                    {date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </span>
                    )}
                    {startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {startTime}{endTime ? ` – ${endTime}` : ''}
                      </span>
                    )}
                    {location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location}</span>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {summary && (
                  <section className="mb-5">
                    <h2 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Summary</h2>
                    <p className="text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg">{summary}</p>
                  </section>
                )}

                {/* Attendance */}
                <section className="mb-6">
                  <h2 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">Attendance</h2>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Present ({presentCount})</p>
                      <ul className="space-y-0.5 text-sm">
                        {fullAttendance.filter(a => a.present).map(a => {
                          const u = members.find(m => m.id === a.userId);
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
                          const u = members.find(m => m.id === a.userId);
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

                {approvalOfPrevious && (
                  <section className="mb-5">
                    <h2 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Previous Minutes</h2>
                    <p className="text-sm capitalize">{approvalOfPrevious.replace(/_/g, ' ')}</p>
                  </section>
                )}

                {/* Minute items */}
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

                {/* Decisions & votes */}
                {decisionItems.length > 0 && (
                  <section className="mb-6">
                    <h2 className="text-xs uppercase font-semibold text-gray-400 mb-3 tracking-wider">Decisions & Votes</h2>
                    <div className="space-y-2">
                      {decisionItems.map((item, i) => (
                        <div key={item.clientId} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">
                            {item.title || `${item.type === 'vote' ? 'Vote' : 'Decision'} ${i + 1}`}
                          </p>
                          {item.content && <p className="text-sm mt-0.5">{item.content}</p>}
                          {item.type === 'vote' && (
                            <p className="text-xs text-gray-500 mt-1">
                              In Favour: {item.voteInFavor ?? 0} · Against: {item.voteAgainst ?? 0} · Abstain: {item.voteAbstain ?? 0}
                              {' · '}
                              <span className={
                                (item.voteInFavor ?? 0) > (item.voteAgainst ?? 0)
                                  ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                              }>
                                {(item.voteInFavor ?? 0) > (item.voteAgainst ?? 0) ? 'Passed' : 'Failed'}
                              </span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Action items */}
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
                            <td className="py-2">{fullName(members, item.actionAssigneeId ?? '')}</td>
                            <td className="py-2">
                              {item.actionDueDate
                                ? new Date(item.actionDueDate).toLocaleDateString()
                                : '—'}
                            </td>
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

                {/* Next meeting */}
                {(nextMeeting.date || nextMeeting.time) && (
                  <section className="mb-6">
                    <h2 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Next Meeting</h2>
                    <p className="text-sm">
                      {nextMeeting.date && new Date(nextMeeting.date).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      })}
                      {nextMeeting.time && ` at ${nextMeeting.time}`}
                      {nextMeeting.location && ` — ${nextMeeting.location}`}
                    </p>
                    {nextMeeting.agendaHighlights && (
                      <p className="text-sm text-gray-500 mt-0.5">Agenda: {nextMeeting.agendaHighlights}</p>
                    )}
                  </section>
                )}

                {/* Footer */}
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" />Print</Button>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export PDF</Button>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-4 w-4" />Save Minutes
            </Button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goPrev} disabled={isFirst} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Previous
        </Button>
        <Button onClick={isLast ? handleSave : goNext} className="gap-2 shadow-lg shadow-primary/20">
          {isLast ? <><Save className="h-4 w-4" />Save Minutes</> : <>Next <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
}

export default MinutesManager;