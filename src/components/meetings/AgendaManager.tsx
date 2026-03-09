// src/pages/AgendaManager.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus, Trash2, GripVertical, Calendar, Clock, MapPin, Users,
  Target, ClipboardList, Eye, ArrowLeft, ArrowRight,
  Save, Download, Timer, BookOpen, ParkingSquare, ChevronRight,
} from 'lucide-react';

// ── API types (from api.types.ts) ────────────────────────────────────────────
import type {
  Meeting,
  User,
  Agenda,
  AgendaItem,
  AgendaItemType,
  CreateAgendaData,
  CreateAgendaItemData,
} from '@/types/api.types';

// ─── Component-local form types ───────────────────────────────────────────────
//
// These exist only in React state. When the user clicks "Save" the parent
// should call:
//   1. agendasService.createAgenda(output.agendaData)        → returns Agenda
//   2. agendasService.addItem(agendaId, item) for each item  → returns AgendaItem
//

/** Editable row in the agenda table; mirrors CreateAgendaItemData + a client ID */
interface LocalItem {
  clientId:     string;
  orderIndex:   number;
  type:         AgendaItemType;
  title:        string;
  description:  string;
  duration:     number;   // minutes — matches AgendaItem.duration
  presenterId:  string;   // maps to CreateAgendaItemData.presenterId
  presenterName:string;   // maps to CreateAgendaItemData.presenterName
  notes:        string;
}

interface PreRead  { clientId: string; name: string; url: string }
interface ParkItem { clientId: string; topic: string }

/** Shape emitted via onSave — the parent decides how / when to hit the API */
export interface AgendaFormOutput {
  /** Payload for agendasService.createAgenda() */
  agendaData: CreateAgendaData;
  /** One payload per agendasService.addItem() call */
  items: CreateAgendaItemData[];
  /** UI-only extras (not part of the Agenda API type) */
  meta: {
    meetingType:   string;
    facilitatorId: string;
    noteTakerId:   string;
    objective:     string;
    attendeeIds:   string[];
    preReads:      PreRead[];
    parkingLot:    ParkItem[];
  };
}

export interface AgendaManagerProps {
  /** Pre-populate from a Meeting fetched via meetingsService.getMeetingById() */
  meeting?: Meeting;
  /** Existing agenda fetched via agendasService.getAgendaByMeetingId() */
  existingAgenda?: Agenda;
  /** Board members for presenter / facilitator / note-taker selects */
  members?: User[];
  onSave?: (output: AgendaFormOutput) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_TYPES = ['Board', 'Committee', 'Team', 'Emergency', 'Workshop'];

const ITEM_TYPES: { value: AgendaItemType; label: string }[] = [
  { value: 'discussion',   label: 'Discussion'   },
  { value: 'decision',     label: 'Decision'     },
  { value: 'information',  label: 'Information'  },
  { value: 'action',       label: 'Action'       },
  { value: 'presentation', label: 'Presentation' },
  { value: 'vote',         label: 'Vote'         },
];

const TABS = [
  { id: 'details',   label: 'Details',   Icon: Calendar      },
  { id: 'objective', label: 'Objective', Icon: Target        },
  { id: 'attendees', label: 'Attendees', Icon: Users         },
  { id: 'agenda',    label: 'Agenda',    Icon: ClipboardList },
  { id: 'preview',   label: 'Preview',   Icon: Eye           },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeCls(type: AgendaItemType): string {
  const m: Record<AgendaItemType, string> = {
    decision:    'bg-red-100 text-red-700 border-red-200',
    vote:        'bg-purple-100 text-purple-700 border-purple-200',
    discussion:  'bg-blue-100 text-blue-700 border-blue-200',
    information: 'bg-slate-100 text-slate-700 border-slate-200',
    action:      'bg-orange-100 text-orange-700 border-orange-200',
    presentation:'bg-teal-100 text-teal-700 border-teal-200',
  };
  return m[type] ?? 'bg-slate-100 text-slate-700';
}

function fullName(members: User[], id: string): string {
  const u = members.find(m => m.id === id);
  return u ? `${u.firstName} ${u.lastName}` : '—';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgendaManager({
  meeting,
  existingAgenda,
  members = [],
  onSave,
}: AgendaManagerProps) {

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('details');
  const tabIdx  = TABS.findIndex(t => t.id === activeTab);
  const isFirst = tabIdx === 0;
  const isLast  = tabIdx === TABS.length - 1;
  const goNext  = () => !isLast  && setActiveTab(TABS[tabIdx + 1].id);
  const goPrev  = () => !isFirst && setActiveTab(TABS[tabIdx - 1].id);

  // ── Header fields ───────────────────────────────────────────────────────────
  const [title,         setTitle]         = useState(existingAgenda?.title ?? meeting?.title ?? '');
  const [description,   setDescription]   = useState(existingAgenda?.description ?? '');
  const [date,          setDate]          = useState(meeting?.date      ?? '');
  const [startTime,     setStartTime]     = useState(meeting?.startTime ?? '');
  const [endTime,       setEndTime]       = useState(meeting?.endTime   ?? '');
  const [location,      setLocation]      = useState(meeting?.location  ?? '');
  const [meetingType,   setMeetingType]   = useState('Board');
  const [facilitatorId, setFacilitatorId] = useState('');
  const [noteTakerId,   setNoteTakerId]   = useState('');
  const [objective,     setObjective]     = useState('');
  const [attendeeIds,   setAttendeeIds]   = useState<string[]>(
    (meeting?.attendees ?? []).map(a => a.userId),
  );

  // ── Pre-reads (UI-only — not part of the Agenda API model) ─────────────────
  const [preReads, setPreReads] = useState<PreRead[]>([]);
  const addPR    = () => setPreReads(p => [...p, { clientId: `pr-${Date.now()}`, name: '', url: '' }]);
  const removePR = (id: string) => setPreReads(p => p.filter(r => r.clientId !== id));
  const updatePR = (id: string, key: 'name' | 'url', val: string) =>
    setPreReads(p => p.map(r => r.clientId === id ? { ...r, [key]: val } : r));

  // ── Agenda items — aligned to CreateAgendaItemData ─────────────────────────
  const [items, setItems] = useState<LocalItem[]>(() =>
    // Pre-populate from an existing agenda (AgendaItem[])
    (existingAgenda?.items ?? []).map(i => ({
      clientId:     i.id,
      orderIndex:   i.orderIndex,
      type:         i.type,
      title:        i.title,
      description:  i.description ?? '',
      duration:     i.duration,
      presenterId:  i.presenterId  ?? '',
      presenterName:i.presenterName ?? '',
      notes:        i.notes        ?? '',
    })),
  );

  const addItem = () =>
    setItems(p => [...p, {
      clientId: `item-${Date.now()}`, orderIndex: p.length,
      type: 'discussion', title: '', description: '',
      duration: 15, presenterId: '', presenterName: '', notes: '',
    }]);

  const removeItem = (id: string) => setItems(p => p.filter(i => i.clientId !== id));

  const updateItem = <K extends keyof LocalItem>(id: string, k: K, v: LocalItem[K]) =>
    setItems(p => p.map(i => i.clientId === id ? { ...i, [k]: v } : i));

  // Keep presenterName in sync when presenterId changes
  const changePresenter = (clientId: string, userId: string) => {
    const u = members.find(m => m.id === userId);
    setItems(p =>
      p.map(i =>
        i.clientId === clientId
          ? { ...i, presenterId: userId, presenterName: u ? `${u.firstName} ${u.lastName}` : '' }
          : i,
      ),
    );
  };

  // ── Parking lot (UI-only) ──────────────────────────────────────────────────
  const [parkingLot, setParkingLot] = useState<ParkItem[]>([]);
  const addPark    = () => setParkingLot(p => [...p, { clientId: `pl-${Date.now()}`, topic: '' }]);
  const removePark = (id: string) => setParkingLot(p => p.filter(i => i.clientId !== id));
  const updatePark = (id: string, val: string) =>
    setParkingLot(p => p.map(i => i.clientId === id ? { ...i, topic: val } : i));

  // ── Attendees ──────────────────────────────────────────────────────────────
  const toggleAttendee = (userId: string) =>
    setAttendeeIds(p =>
      p.includes(userId) ? p.filter(id => id !== userId) : [...p, userId],
    );

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalMinutes = items.reduce((s, i) => s + (i.duration || 0), 0);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter an agenda title');
      return;
    }
    const meetingId = meeting?.id ?? existingAgenda?.meetingId;
    if (!meetingId) {
      toast.error('No meeting linked to this agenda');
      return;
    }
    const output: AgendaFormOutput = {
      agendaData: {
        title:       title.trim(),
        description: description.trim() || undefined,
        meetingId,
      },
      items: items.map(i => ({
        orderIndex:   i.orderIndex,
        type:         i.type,
        title:        i.title,
        description:  i.description  || undefined,
        duration:     i.duration,
        presenterId:  i.presenterId  || undefined,
        presenterName:i.presenterName || undefined,
        notes:        i.notes        || undefined,
      })),
      meta: { meetingType, facilitatorId, noteTakerId, objective, attendeeIds, preReads, parkingLot },
    };
    onSave?.(output);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Agenda Management</h1>
          <p className="text-muted-foreground">Create and manage meeting agendas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={handleSave}>
            <Save className="h-4 w-4" />Save Agenda
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

      {/* ── Details ───────────────────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <Card className="border bg-card/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>
              Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Agenda Title</Label>
              <Input
                placeholder="e.g., Q1 Strategic Planning — Agenda"
                value={title}
                onChange={e => setTitle(e.target.value)}
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
                <Label>Location / Virtual Link</Label>
                <Input
                  placeholder="Conference Room A or Zoom link"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Facilitator', value: facilitatorId, onChange: setFacilitatorId },
                { label: 'Note-Taker',  value: noteTakerId,   onChange: setNoteTakerId   },
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

      {/* ── Objective ─────────────────────────────────────────────────────── */}
      {activeTab === 'objective' && (
        <div className="space-y-4">
          <Card className="border bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-primary/10"><Target className="h-4 w-4 text-primary" /></div>
                Meeting Objective
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                State the purpose and expected outcomes of this meeting.
              </p>
              <Textarea
                placeholder="Enter the meeting objective…"
                rows={6}
                className="resize-none"
                value={objective}
                onChange={e => setObjective(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card className="border bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  Pre-Reads / Reference Materials
                </div>
                <Button variant="outline" size="sm" onClick={addPR} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" />Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preReads.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-xl">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No pre-reads added.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {preReads.map((pr, i) => (
                    <div key={pr.clientId} className="flex gap-3 items-center p-3 rounded-lg border bg-muted/20">
                      <span className="text-sm text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                      <Input
                        placeholder="Document Name"
                        className="flex-1 bg-background"
                        value={pr.name}
                        onChange={e => updatePR(pr.clientId, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="https://…"
                        className="flex-1 bg-background"
                        value={pr.url}
                        onChange={e => updatePR(pr.clientId, 'url', e.target.value)}
                      />
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => removePR(pr.clientId)}
                        className="h-8 w-8 hover:bg-destructive/10 shrink-0"
                      >
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

      {/* ── Attendees ─────────────────────────────────────────────────────── */}
      {activeTab === 'attendees' && (
        <Card className="border bg-card/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
                Attendees
              </div>
              <Badge variant="secondary">{attendeeIds.length} selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No members available. Members are loaded from the organisation user list.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.map(u => {
                  const selected = attendeeIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selected ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleAttendee(u.id)}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleAttendee(u.id)}
                      />
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={u.profilePictureUrl} />
                        <AvatarFallback className="text-xs">
                          {u.firstName[0]}{u.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.title ?? u.role}</p>
                      </div>
                      {selected && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Agenda items ──────────────────────────────────────────────────── */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          <Card className="border bg-card/60">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </div>
                  Agenda Items
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <Timer className="h-3 w-3" />{totalMinutes} min total
                  </Badge>
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />Add Item
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No agenda items added yet.</p>
                  <Button onClick={addItem} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />Add First Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2.5 px-2 w-8" />
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground w-8">#</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Title</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Presenter</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Duration</th>
                        <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Description</th>
                        <th className="py-2.5 px-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item, idx) => (
                        <tr key={item.clientId} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-2.5 px-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab group-hover:text-muted-foreground" />
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <Input
                              placeholder="Item title"
                              value={item.title}
                              onChange={e => updateItem(item.clientId, 'title', e.target.value)}
                              className="min-w-[160px] h-8 text-sm"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <Select value={item.presenterId} onValueChange={v => changePresenter(item.clientId, v)}>
                              <SelectTrigger className="min-w-[130px] h-8 text-sm">
                                <SelectValue placeholder="Presenter" />
                              </SelectTrigger>
                              <SelectContent>
                                {members.map(u => (
                                  <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-2">
                            <Select
                              value={item.type}
                              onValueChange={v => updateItem(item.clientId, 'type', v as AgendaItemType)}
                            >
                              <SelectTrigger className="min-w-[120px] h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number" min={1}
                                value={item.duration}
                                onChange={e =>
                                  updateItem(item.clientId, 'duration', Math.max(1, parseInt(e.target.value) || 1))
                                }
                                className="w-16 h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground shrink-0">min</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <Input
                              placeholder="Brief description"
                              value={item.description}
                              onChange={e => updateItem(item.clientId, 'description', e.target.value)}
                              className="min-w-[160px] h-8 text-sm"
                            />
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

          {/* Parking lot */}
          <Card className="border bg-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/15">
                    <ParkingSquare className="h-4 w-4 text-amber-600" />
                  </div>
                  Parking Lot
                  <span className="text-xs text-muted-foreground font-normal">— deferred topics</span>
                </div>
                <Button
                  variant="outline" size="sm" onClick={addPark}
                  className="gap-1.5 h-8 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parkingLot.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-amber-500/20 rounded-xl">
                  Topics deferred during the meeting can be added here.
                </p>
              ) : (
                <div className="space-y-2">
                  {parkingLot.map((item, i) => (
                    <div key={item.clientId} className="flex gap-3 items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs font-medium text-amber-700 w-16 shrink-0">Item {i + 1}</span>
                      <Input
                        placeholder="Deferred topic…"
                        className="flex-1 h-8 text-sm bg-background"
                        value={item.topic}
                        onChange={e => updatePark(item.clientId, e.target.value)}
                      />
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => removePark(item.clientId)}
                        className="h-7 w-7 hover:bg-destructive/10 shrink-0"
                      >
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

      {/* ── Preview ───────────────────────────────────────────────────────── */}
      {activeTab === 'preview' && (
        <Card className="border bg-card/60 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><Eye className="h-4 w-4 text-primary" /></div>
                Agenda Preview
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5" />Save
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Download className="h-3.5 w-3.5" />Export PDF
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white text-black rounded-xl shadow-lg p-8 max-w-3xl mx-auto border">
              <div className="text-center border-b-2 border-gray-200 pb-5 mb-6">
                <h2 className="text-2xl font-bold mb-2">{title || 'Untitled Agenda'}</h2>
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
                {meetingType && (
                  <Badge variant="outline" className="mt-3 text-xs">{meetingType} Meeting</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase font-semibold">Facilitator</p>
                  <p className="font-medium mt-0.5">{fullName(members, facilitatorId)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase font-semibold">Note-Taker</p>
                  <p className="font-medium mt-0.5">{fullName(members, noteTakerId)}</p>
                </div>
              </div>

              {objective && (
                <div className="mb-5">
                  <h3 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Objective</h3>
                  <p className="text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg">{objective}</p>
                </div>
              )}

              {preReads.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Pre-Reads</h3>
                  {preReads.map((pr, i) => (
                    <div key={pr.clientId} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">{i + 1}.</span>
                      <span>{pr.name || 'Unnamed'}</span>
                      {pr.url && (
                        <a href={pr.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 text-xs hover:underline">(Link)</a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {attendeeIds.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">
                    Attendees ({attendeeIds.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {attendeeIds.map(id => {
                      const u = members.find(m => m.id === id);
                      return u ? (
                        <span key={id} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                          {u.firstName} {u.lastName}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {items.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">
                    Agenda — {totalMinutes} min total
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={item.clientId} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gray-800 text-white text-xs font-medium flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-medium text-sm">{item.title || 'Untitled'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${typeCls(item.type)}`}>
                              {item.type}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.duration} min
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex gap-4 text-xs text-gray-500 pl-7">
                          <span>Presenter: {fullName(members, item.presenterId)}</span>
                          {item.description && <span>{item.description}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parkingLot.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-xs uppercase font-semibold text-gray-400 mb-2 tracking-wider">Parking Lot</h3>
                  {parkingLot.map((item, i) => (
                    <div key={item.clientId} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-gray-500">{i + 1}.</span>
                      <span>{item.topic || 'Untitled'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom nav */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goPrev} disabled={isFirst} className="gap-2">
          <ArrowLeft className="h-4 w-4" />Previous
        </Button>
        <Button onClick={isLast ? handleSave : goNext} className="gap-2 shadow-lg shadow-primary/20">
          {isLast ? <><Save className="h-4 w-4" />Save Agenda</> : <>Next <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
}

export default AgendaManager;