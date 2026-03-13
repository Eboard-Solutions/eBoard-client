// src/pages/Meetings.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  Loader2,
  Monitor,
  ClipboardList,
  FileText,
  Video,
  Users,
  AlertCircle,
  CheckCircle,
  Wifi,
  Building2,
  Layers,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Zap,
} from 'lucide-react';

import { useMeetings, useCreateMeeting } from '@/hooks/api/useMeetings';
import type {
  Meeting,
  MeetingAttendee,
  MeetingFormat,
  MeetingFrequency,
  MeetingType,
  MeetingPriority,
  RSVPStatus,
  CreateMeetingData,
} from '@/types/api.types';

import { AgendaManager } from '../components/meetings/AgendaManager';
import { MinutesManager } from '../components/meetings/MinutesManager';

// ─── RSVP display labels (subset used in the summary tiles) ──────────────────
const RSVP_SUMMARY: { value: RSVPStatus; label: string }[] = [
  { value: 'accepted',  label: 'Accepted'  },
  { value: 'declined',  label: 'Declined'  },
  { value: 'tentative', label: 'Tentative' },
  { value: 'invited',   label: 'Pending'   },
];

// ─── Pure display helpers ─────────────────────────────────────────────────────

function meetingTypeBadge(type?: MeetingType) {
  const map: Record<MeetingType, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200',
    special:   'bg-purple-100 text-purple-700 border-purple-200',
    annual:    'bg-blue-100 text-blue-700 border-blue-200',
    regular:   'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[type ?? 'regular']}`}>
      {type ?? 'Regular'}
    </Badge>
  );
}

function priorityBadge(priority?: MeetingPriority) {
  if (!priority) return null;
  const map: Record<MeetingPriority, string> = {
    urgent: 'bg-red-100 text-red-700',
    high:   'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low:    'bg-green-100 text-green-700',
  };
  return (
    <Badge className={`text-xs capitalize border-0 ${map[priority]}`}>{priority}</Badge>
  );
}

function formatIcon(fmt?: MeetingFormat) {
  if (fmt === 'online')    return <Wifi      className="h-5 w-5 mx-auto mb-1 text-blue-500"    />;
  if (fmt === 'in-person') return <Building2 className="h-5 w-5 mx-auto mb-1 text-green-500"   />;
  if (fmt === 'hybrid')    return <Layers    className="h-5 w-5 mx-auto mb-1 text-purple-500"  />;
  return <Monitor className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />;
}

function rsvpBadge(status?: RSVPStatus) {
  const map: Record<RSVPStatus, { cls: string; label: string }> = {
    accepted:  { cls: 'bg-green-100 text-green-700',     label: 'Accepted'   },
    declined:  { cls: 'bg-red-100 text-red-700',         label: 'Declined'   },
    tentative: { cls: 'bg-yellow-100 text-yellow-700',   label: 'Tentative'  },
    invited:   { cls: 'bg-slate-100 text-slate-600',     label: 'Invited'    },
    attended:  { cls: 'bg-emerald-100 text-emerald-700', label: 'Attended'   },
    absent:    { cls: 'bg-red-100 text-red-600',         label: 'Absent'     },
    checkedIn: { cls: 'bg-blue-100 text-blue-700',       label: 'Checked In' },
  };
  const e = map[status ?? 'invited'];
  return <Badge className={`text-xs border-0 ${e.cls}`}>{e.label}</Badge>;
}

function countRsvp(meeting: Meeting, status: RSVPStatus): number {
  return (meeting.attendees ?? []).filter(a => a.rsvpStatus === status).length;
}

/** Format a YYYY-MM-DD date or ISO datetime to a short readable date */
function fmtDate(value?: string): string {
  if (!value) return 'TBD';
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
}

/**
 * Format a time value.
 * Accepts a full ISO datetime or a plain "HH:mm" string.
 * meeting.startTime / endTime can be either depending on the backend.
 */
function fmtTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return value; // plain "HH:mm"
}

function daysUntil(dateStr?: string): string {
  if (!dateStr) return '—';
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0)  return 'Past';
  return `In ${days} days`;
}

/**
 * Use meeting.status when available; fall back to date comparison.
 * Matches MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
 */
function isUpcoming(m: Meeting): boolean {
  if (m.status === 'scheduled' || m.status === 'in-progress') return true;
  if (m.status === 'completed' || m.status === 'cancelled')   return false;
  return new Date(m.date) >= new Date();
}

// ─── Default create-form state ────────────────────────────────────────────────
const BLANK_FORM: CreateMeetingData = {
  title:             '',
  description:       '',
  meetingFormat:     'online',
  meetingFrequency:  'once',
  meetingType:       'regular',
  meetingPriority:   'medium',
  location:          '',
  onlineMeetingLink: '',
  date:              '',
  startTime:         '',
  endTime:           '',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function Meetings() {

  // ── UI state ────────────────────────────────────────────────────────────────
  const [search,          setSearch]          = useState('');
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [formatFilter,    setFormatFilter]    = useState('all');
  const [isCreateOpen,    setIsCreateOpen]    = useState(false);
  const [isDetailsOpen,   setIsDetailsOpen]   = useState(false);
  const [activeMeeting,   setActiveMeeting]   = useState<Meeting | null>(null);
  const [form,            setForm]            = useState<CreateMeetingData>({ ...BLANK_FORM });

  const setField = <K extends keyof CreateMeetingData>(k: K, v: CreateMeetingData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  // ── Data — useMeetings wraps meetingsService.getMeetings() ──────────────────
  const { data: page, isLoading, error } = useMeetings({ page: 1, limit: 50 });
  // useCreateMeeting wraps meetingsService.createMeeting()
  const createMutation = useCreateMeeting();

  const allMeetings: Meeting[] = page?.items ?? [];

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = allMeetings.filter(m => {
    const matchSearch  = m.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus  =
      statusFilter === 'all' ||
      (statusFilter === 'upcoming' &&  isUpcoming(m)) ||
      (statusFilter === 'past'     && !isUpcoming(m));
    const matchFormat  = formatFilter === 'all' || m.meetingFormat === formatFilter;
    return matchSearch && matchStatus && matchFormat;
  });

  const upcomingList = filtered.filter(isUpcoming);
  const pastList     = filtered.filter(m => !isUpcoming(m));

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openDetails = (m: Meeting) => { setActiveMeeting(m); setIsDetailsOpen(true); };

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      toast.error('Please fill in all required fields (title, date, start & end time)');
      return;
    }
    try {
      const fullStart = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const fullEnd = new Date(`${form.date}T${form.endTime}:00`).toISOString();
      await createMutation.mutateAsync({
        ...form,
        date: fullStart,
        startTime: fullStart,
        endTime: fullEnd
      });
      toast.success('Meeting scheduled successfully!');
      setIsCreateOpen(false);
      setForm({ ...BLANK_FORM });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule meeting');
    }
  };

  // meetingsService.startMeeting(meetingId) would be wired here
  const handleStart = (meetingId: string) => {
    toast.success('Starting meeting session…');
    setIsDetailsOpen(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const completedCount  = allMeetings.filter(m => m.status === 'completed').length;
  const thisMonthCount  = allMeetings.filter(m => {
    const d = new Date(m.date), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  const getRSVPStatusCount = (meeting: EnhancedMeeting, status: RSVPStatus) => meeting.attendeeDetails?.filter((a: MeetingAttendee) => a.rsvpStatus === status).length || 0;
  const getFormatIcon = (format: MeetingFormat) => { switch (format) { case 'physical': return <Building className="h-4 w-4" />; case 'online': return <Monitor className="h-4 w-4" />; case 'hybrid': return <Building2 className="h-4 w-4" />; }};
  const getPriorityBadge = (priority: Priority) => { const p = PRIORITIES.find(pr => pr.value === priority); return p ? <Badge className={`${p.color} text-white text-xs`}><Flag className="h-3 w-3 mr-1" />{p.label}</Badge> : null; };
  const getMeetingTypeBadge = (type: MeetingType) => { const t = MEETING_TYPES.find(mt => mt.value === type); return t ? <Badge className={`${t.color} text-white text-xs`}>{t.label}</Badge> : null; };
  const getRSVPBadge = (status: RSVPStatus) => { const r = RSVP_STATUS_LABELS.find(rs => rs.value === status); return r ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.color}`}>{r.label}</span> : null; };

<!-- ======= -->
  const handleStartLive = (meetingId: string) => {
    setLocation(`/meetings/live/${meetingId}`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">Manage board meetings, agendas, and minutes</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />Schedule Meeting
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>
                Create a new board meeting with full configuration options
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>Meeting Title *</Label>
                <Input
                  placeholder="e.g., Q1 Strategic Planning"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                />
              </div>

              {/* Date + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Type</Label>
                  <Select value={form.meetingType} onValueChange={v => setField('meetingType', v as MeetingType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['regular','special','emergency','annual'] as MeetingType[]).map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input type="time" value={form.startTime} onChange={e => setField('startTime', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input type="time" value={form.endTime} onChange={e => setField('endTime', e.target.value)} />
                </div>
              </div>

              {/* Format + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={form.meetingFormat} onValueChange={v => setField('meetingFormat', v as MeetingFormat)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.meetingPriority} onValueChange={v => setField('meetingPriority', v as MeetingPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['low','medium','high','urgent'] as MeetingPriority[]).map(p => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={form.meetingFrequency} onValueChange={v => setField('meetingFrequency', v as MeetingFrequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['once','daily','weekly','monthly','yearly','custom'] as MeetingFrequency[]).map(f => (
                      <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Conference Room A"
                  value={form.location ?? ''}
                  onChange={e => setField('location', e.target.value)}
                />
              </div>

              {/* Online link */}
              <div className="space-y-2">
                <Label>Online Meeting Link</Label>
                <Input
                  placeholder="https://zoom.us/j/…"
                  value={form.onlineMeetingLink ?? ''}
                  onChange={e => setField('onlineMeetingLink', e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Meeting description and goals…"
                  rows={3}
                  value={form.description ?? ''}
                  onChange={e => setField('description', e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                    : 'Schedule Meeting'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`relative overflow-hidden border-0 bg-gradient-to-br ${s.grad}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl bg-background/60 ${s.ic}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />{s.trend}
                  </span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 p-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading meetings…</span>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <Card className="border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meetings…"
                className="pl-10 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {[['all','All'],['upcoming','Upcoming'],['past','Past']].map(([v,l]) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    statusFilter === v
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >{l}</button>
              ))}
            </div>

            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Meeting Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {activeMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap text-xl">
                  {activeMeeting.title}
                  {meetingTypeBadge(activeMeeting.meetingType)}
                  {priorityBadge(activeMeeting.meetingPriority)}
                </DialogTitle>
                <DialogDescription>
                  {activeMeeting.description ?? 'No description provided'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Quick-info tiles */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {
                      icon: <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />,
                      value: fmtDate(activeMeeting.date),
                      label: 'Date',
                    },
                    {
                      icon: <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />,
                      value: `${fmtTime(activeMeeting.startTime)} – ${fmtTime(activeMeeting.endTime)}`,
                      label: 'Time',
                    },
                    {
                      icon: formatIcon(activeMeeting.meetingFormat),
                      value: activeMeeting.meetingFormat,
                      label: 'Format',
                    },
                    {
                      icon: <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />,
                      value: `${(activeMeeting.attendees ?? []).length} invited`,
                      label: 'Attendees',
                    },
                  ].map((tile, i) => (
                    <div key={i} className="text-center p-3 rounded-xl bg-muted/50">
                      {tile.icon}
                      <p className="text-sm font-medium capitalize">{tile.value}</p>
                      <p className="text-xs text-muted-foreground">{tile.label}</p>
                    </div>
                  ))}
                </div>

                {/* Location / link row */}
                {(activeMeeting.location || activeMeeting.onlineMeetingLink) && (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {activeMeeting.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />{activeMeeting.location}
                      </span>
                    )}
                    {activeMeeting.onlineMeetingLink && (
                      <a
                        href={activeMeeting.onlineMeetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Monitor className="h-4 w-4" />Join Online
                      </a>
                    )}
                  </div>
                )}

                <Separator />

                {/* RSVP summary */}
                <div>
                  <h3 className="font-semibold mb-3">RSVP Status</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {RSVP_SUMMARY.map(s => (
                      <div key={s.value} className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-2xl font-bold">{countRsvp(activeMeeting, s.value)}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendee list */}
                {(activeMeeting.attendees?.length ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">
                        Attendees ({activeMeeting.attendees!.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {activeMeeting.attendees!.map((att: MeetingAttendee) => (
                          <div
                            key={att.userId}
                            className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={att.user?.profilePictureUrl} />
                                <AvatarFallback className="text-xs">
                                  {att.user?.firstName?.[0]}
                                  {att.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {att.user
                                    ? `${att.user.firstName} ${att.user.lastName}`
                                    : att.userId}
                                </p>
                                {att.user?.title && (
                                  <p className="text-xs text-muted-foreground">{att.user.title}</p>
                                )}
                                <div className="flex gap-1 mt-0.5">
                                  {att.isChair     && <Badge variant="outline" className="text-[10px] h-4 px-1">Chair</Badge>}
                                  {att.isSecretary && <Badge variant="outline" className="text-[10px] h-4 px-1">Secretary</Badge>}
                                </div>
                              </div>
                            </div>
                            {rsvpBadge(att.rsvpStatus)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                <Button variant="outline">Edit Meeting</Button>
                <Button onClick={() => handleStart(activeMeeting.id)}>
                  <Video className="h-4 w-4 mr-2" />Start Meeting
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="upcoming"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 py-2">
            Upcoming
            {upcomingList.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{upcomingList.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 py-2">
            Past
            {pastList.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{pastList.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 py-2">
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="agenda"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 py-2 gap-1.5">
            <ClipboardList className="h-4 w-4" />Agenda
          </TabsTrigger>
          <TabsTrigger value="minutes"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4 py-2 gap-1.5">
            <FileText className="h-4 w-4" />Minutes
          </TabsTrigger>
        </TabsList>

        {/* ── Upcoming ─────────────────────────────────────────────────────── */}
        <TabsContent value="upcoming" className="space-y-3">
          {upcomingList.map(m => {
            const dl         = daysUntil(m.date);
            const isToday    = dl === 'Today';
            const isTomorrow = dl === 'Tomorrow';
            return (
              <Card
                key={m.id}
                className="group border bg-card/60 hover:bg-card hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
                onClick={() => openDetails(m)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-5">
                    {/* Date block */}
                    <div className={`flex flex-col items-center justify-center w-[72px] h-[72px] rounded-2xl shrink-0 ${
                      isToday    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : isTomorrow ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      :              'bg-muted text-foreground'
                    }`}>
                      <span className="text-2xl font-bold leading-none">
                        {new Date(m.date).getDate()}
                      </span>
                      <span className="text-[11px] uppercase font-medium opacity-80 mt-0.5">
                        {new Date(m.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                            {m.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className={`text-xs ${
                              isToday    ? 'bg-primary/10 text-primary'
                              : isTomorrow ? 'bg-emerald-100 text-emerald-700'
                              :              ''
                            }`}>{dl}</Badge>
                            {meetingTypeBadge(m.meetingType)}
                            {priorityBadge(m.meetingPriority)}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={e => { e.stopPropagation(); openDetails(m); }}
                        >
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />{fmtDate(m.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />{fmtTime(m.startTime)} – {fmtTime(m.endTime)}
                        </span>
                        {m.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />{m.location}
                          </span>
                        )}
                        {m.onlineMeetingLink && (
                          <span className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5" />Virtual link available
                          </span>
                        )}
                      </div>

                      {(m.attendees?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex -space-x-2">
                            {m.attendees!.slice(0, 5).map(a => (
                              <Avatar key={a.userId} className="h-7 w-7 border-2 border-background ring-1 ring-border">
                                <AvatarImage src={a.user?.profilePictureUrl} />
                                <AvatarFallback className="text-[10px]">
                                  {a.user?.firstName?.[0]}{a.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {m.attendees!.length > 5 && (
                              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium">
                                +{m.attendees!.length - 5}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {m.attendees!.length} attendee{m.attendees!.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!isLoading && upcomingList.length === 0 && (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-lg font-medium mb-1">No upcoming meetings</p>
                <p className="text-sm text-muted-foreground mb-4">Schedule a new meeting to get started</p>
                <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Past ─────────────────────────────────────────────────────────── */}
        <TabsContent value="past" className="space-y-3">
          {pastList.map(m => (
            <Card
              key={m.id}
              className="border bg-muted/30 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => openDetails(m)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-5">
                  <div className="flex flex-col items-center justify-center w-[72px] h-[72px] rounded-2xl bg-muted/80 shrink-0">
                    <span className="text-2xl font-bold leading-none text-muted-foreground">
                      {new Date(m.date).getDate()}
                    </span>
                    <span className="text-[11px] uppercase font-medium text-muted-foreground/70 mt-0.5">
                      {new Date(m.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{m.title}</h3>
                          {meetingTypeBadge(m.meetingType)}
                          {m.status && (
                            <Badge variant="outline" className="text-xs capitalize">{m.status}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {fmtDate(m.date)} · {fmtTime(m.startTime)}
                        </p>
                      </div>
                      <Button
                        variant="outline" size="sm"
                        onClick={e => { e.stopPropagation(); openDetails(m); }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!isLoading && pastList.length === 0 && (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-lg font-medium">No past meetings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Calendar placeholder ─────────────────────────────────────────── */}
        <TabsContent value="calendar">
          <Card className="border bg-card/50">
            <CardContent className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-lg font-medium mb-1">Calendar View</p>
              <p className="text-sm text-muted-foreground">Interactive calendar coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <AgendaManager />
        </TabsContent>

        <TabsContent value="minutes">
          <MinutesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Meetings;