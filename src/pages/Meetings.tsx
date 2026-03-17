// src/pages/Meetings.tsx
import { useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal} from 'react';
import {useLocation} from 'wouter';
import {toast} from 'sonner';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Separator} from '@/components/ui/separator';
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
  Wifi,
  Building2,
  Layers,
  ChevronRight,
} from 'lucide-react';

import {useMeetings, useCreateMeeting} from '@/hooks/api/useMeetings';
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

import {AgendaManager} from '../components/meetings/AgendaManager';
import {MinutesManager} from '../components/meetings/MinutesManager';

// ─── RSVP summary labels ─────────────────────────────────────────────────────
const RSVP_SUMMARY: { value: RSVPStatus; label: string }[] = [
  {value: 'accepted', label: 'Accepted'},
  {value: 'declined', label: 'Declined'},
  {value: 'tentative', label: 'Tentative'},
  {value: 'invited', label: 'Pending'},
];

// ─── Display helpers ─────────────────────────────────────────────────────────

function meetingTypeBadge(type?: MeetingType) {
  const map: Record<MeetingType, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200',
    special: 'bg-purple-100 text-purple-700 border-purple-200',
    annual: 'bg-blue-100 text-blue-700 border-blue-200',
    regular: 'bg-slate-100 text-slate-700 border-slate-200',
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
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return (
      <Badge className={`text-xs capitalize border-0 ${map[priority]}`}>
        {priority}
      </Badge>
  );
}

function formatIcon(fmt?: MeetingFormat) {
  switch (fmt) {
    case 'online':
      return <Wifi className="h-5 w-5 mx-auto mb-1 text-blue-500"/>;
    case 'in-person':
      return <Building2 className="h-5 w-5 mx-auto mb-1 text-green-500"/>;
    case 'hybrid':
      return <Layers className="h-5 w-5 mx-auto mb-1 text-purple-500"/>;
    default:
      return <Monitor className="h-5 w-5 mx-auto mb-1 text-muted-foreground"/>;
  }
}

function rsvpBadge(status?: RSVPStatus) {
  const map: Record<RSVPStatus, { cls: string; label: string }> = {
    accepted: {cls: 'bg-green-100 text-green-700', label: 'Accepted'},
    declined: {cls: 'bg-red-100 text-red-700', label: 'Declined'},
    tentative: {cls: 'bg-yellow-100 text-yellow-700', label: 'Tentative'},
    invited: {cls: 'bg-slate-100 text-slate-600', label: 'Invited'},
    attended: {cls: 'bg-emerald-100 text-emerald-700', label: 'Attended'},
    absent: {cls: 'bg-red-100 text-red-600', label: 'Absent'},
    checkedIn: {cls: 'bg-blue-100 text-blue-700', label: 'Checked In'},
  };
  const {cls, label} = map[status ?? 'invited'];
  return <Badge className={`text-xs border-0 ${cls}`}>{label}</Badge>;
}

function countRsvp(meeting: Meeting, status: RSVPStatus): number {
  return (meeting.attendees ?? []).filter(a => a.rsvpStatus === status).length;
}

function fmtDate(value?: string): string {
  if (!value) return 'TBD';
  const d = new Date(value);
  return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function fmtTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});
  }
  return value; // fallback for "HH:mm" strings
}

function daysUntil(dateStr?: string): string {
  if (!dateStr) return '—';
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return 'Past';
  return `In ${days} days`;
}

function isUpcoming(m: Meeting): boolean {
  if (m.status === 'scheduled' || m.status === 'in-progress') return true;
  if (m.status === 'completed' || m.status === 'cancelled') return false;
  return new Date(m.date) >= new Date();
}

// ─── Default form state ──────────────────────────────────────────────────────
const BLANK_FORM: CreateMeetingData = {
  title: '',
  description: '',
  meetingFormat: 'online',
  meetingFrequency: 'once',
  meetingType: 'regular',
  meetingPriority: 'medium',
  location: '',
  onlineMeetingLink: '',
  date: '',
  startTime: '',
  endTime: '',
};

export default function Meetings() {
  const [, setLocation] = useLocation();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [formatFilter, setFormatFilter] = useState<MeetingFormat | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [form, setForm] = useState<CreateMeetingData>({...BLANK_FORM});

  const updateField = <K extends keyof CreateMeetingData>(key: K, value: CreateMeetingData[K]) =>
      setForm(prev => ({...prev, [key]: value}));

  // ── Data ────────────────────────────────────────────────────────────────────
  const {data: page, isLoading} = useMeetings({page: 1, limit: 50});
  const createMutation = useCreateMeeting();

  const allMeetings = page?.items ?? [];

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = allMeetings.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'upcoming' && isUpcoming(m)) ||
        (statusFilter === 'past' && !isUpcoming(m));
    const matchFormat = formatFilter === 'all' || m.meetingFormat === formatFilter;
    return matchSearch && matchStatus && matchFormat;
  });

  const upcoming = filtered.filter(isUpcoming);
  const past = filtered.filter(m => !isUpcoming(m));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openDetails = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setIsDetailsOpen(true);
  };

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      toast.error('Title, date, start time and end time are required.');
      return;
    }

    try {
      const fullStart = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const fullEnd = new Date(`${form.date}T${form.endTime}:00`).toISOString();

      await createMutation.mutateAsync({
        ...form,
        date: fullStart,
        startTime: fullStart,
        endTime: fullEnd,
      });

      toast.success('Meeting created successfully');
      setIsCreateOpen(false);
      setForm({...BLANK_FORM});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create meeting');
    }
  };

  const handleStartLive = (meetingId: string) => {
    setLocation(`/meetings/live/${meetingId}`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-8 pb-12">

        {/* Header + Create button */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground">Manage board meetings, agendas, and minutes</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5"/> Schedule Meeting
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>
                  Create a new board meeting with full configuration options
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                      id="title"
                      placeholder="e.g., Q1 Strategic Planning"
                      value={form.title}
                      onChange={e => updateField('title', e.target.value)}
                  />
                </div>

                {/* Date & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                        id="date"
                        type="date"
                        value={form.date}
                        onChange={e => updateField('date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Type</Label>
                    <Select
                        value={form.meetingType}
                        onValueChange={v => updateField('meetingType', v as MeetingType)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                      <SelectContent>
                        {(['regular', 'special', 'emergency', 'annual'] as MeetingType[]).map(t => (
                            <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Time *</Label>
                    <Input
                        id="start"
                        type="time"
                        value={form.startTime}
                        onChange={e => updateField('startTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Time *</Label>
                    <Input
                        id="end"
                        type="time"
                        value={form.endTime}
                        onChange={e => updateField('endTime', e.target.value)}
                    />
                  </div>
                </div>

                {/* Format & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                        value={form.meetingFormat}
                        onValueChange={v => updateField('meetingFormat', v as MeetingFormat)}
                    >
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="in-person">In-Person</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                        value={form.meetingPriority}
                        onValueChange={v => updateField('meetingPriority', v as MeetingPriority)}
                    >
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {(['low', 'medium', 'high', 'urgent'] as MeetingPriority[]).map(p => (
                            <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                      value={form.meetingFrequency}
                      onValueChange={v => updateField('meetingFrequency', v as MeetingFrequency)}
                  >
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {(['once', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] as MeetingFrequency[]).map(f => (
                          <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                      placeholder="Conference Room A"
                      value={form.location ?? ''}
                      onChange={e => updateField('location', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Online Meeting Link</Label>
                  <Input
                      placeholder="https://zoom.us/j/..."
                      value={form.onlineMeetingLink ?? ''}
                      onChange={e => updateField('onlineMeetingLink', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                      placeholder="Meeting goals, background information..."
                      rows={4}
                      value={form.description ?? ''}
                      onChange={e => updateField('description', e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                          Creating…
                        </>
                    ) : 'Schedule Meeting'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input
                    placeholder="Search meetings..."
                    className="pl-10 bg-background"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
                {[
                  {value: 'all', label: 'All'},
                  {value: 'upcoming', label: 'Upcoming'},
                  {value: 'past', label: 'Past'},
                ].map(item => (
                    <button
                        key={item.value}
                        onClick={() => setStatusFilter(item.value as any)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            statusFilter === item.value
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                        }`}
                    >
                      {item.label}
                    </button>
                ))}
              </div>

              <Select
                  value={formatFilter}
                  onValueChange={v => setFormatFilter(v as MeetingFormat | 'all')}
              >
                <SelectTrigger className="w-44 bg-background">
                  <SelectValue placeholder="All Formats"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in-person">In-Person</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
            <div className="flex justify-center items-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              <span className="text-muted-foreground text-lg">Loading meetings...</span>
            </div>
        )}

        {!isLoading && (
            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList className="bg-muted/50 p-1.5 h-auto rounded-lg gap-1.5 flex-wrap">
                <TabsTrigger value="upcoming"
                             className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow">
                  Upcoming {upcoming.length > 0 &&
                    <Badge variant="secondary" className="ml-2 text-xs">{upcoming.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="past"
                             className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow">
                  Past {past.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{past.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="calendar"
                             className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow">
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="agenda"
                             className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4"/> Agenda
                </TabsTrigger>
                <TabsTrigger value="minutes"
                             className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow flex items-center gap-1.5">
                  <FileText className="h-4 w-4"/> Minutes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-2 space-y-4">
                {upcoming.length === 0 ? (
                    <Card className="border-dashed border-2 bg-transparent">
                      <CardContent className="p-16 text-center">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60"/>
                        <h3 className="text-xl font-medium mb-2">No upcoming meetings</h3>
                        <p className="text-muted-foreground mb-6">Schedule your first meeting to get started</p>
                        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                          <Plus className="h-4 w-4"/> Schedule Meeting
                        </Button>
                      </CardContent>
                    </Card>
                ) : (
                    upcoming.map(m => {
                      const dl = daysUntil(m.date);
                      const isToday = dl === 'Today';
                      const isTomorrow = dl === 'Tomorrow';

                      return (
                          <Card
                              key={m.id}
                              className="group cursor-pointer hover:shadow-md hover:shadow-primary/10 transition-all border bg-card/70"
                              onClick={() => openDetails(m)}
                          >
                            <CardContent className="p-5">
                              <div className="flex gap-5 items-start">
                                <div
                                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl shrink-0 font-bold ${
                                        isToday ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' :
                                            isTomorrow ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                                'bg-muted text-foreground'
                                    }`}>
                                  <span className="text-3xl leading-none">{new Date(m.date).getDate()}</span>
                                  <span className="text-xs uppercase mt-1 opacity-90">
                            {new Date(m.date).toLocaleString('en-US', {month: 'short'})}
                          </span>
                                </div>

                                <div className="flex-1 min-w-0 space-y-3">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1.5 min-w-0">
                                      <h3 className="text-xl font-semibold truncate group-hover:text-primary transition-colors">
                                        {m.title}
                                      </h3>
                                      <div className="flex flex-wrap gap-2 items-center">
                                        <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${
                                            isToday ? 'bg-primary/10 text-primary border-primary/30' :
                                                isTomorrow ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''
                                        }`}>
                                          {dl}
                                        </Badge>
                                        {meetingTypeBadge(m.meetingType)}
                                        {priorityBadge(m.meetingPriority)}
                                      </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={e => {
                                          e.stopPropagation();
                                          openDetails(m);
                                        }}
                                    >
                                      View <ChevronRight className="ml-1 h-4 w-4"/>
                                    </Button>
                                  </div>

                                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-4 w-4"/>
                                      {fmtTime(m.startTime)} – {fmtTime(m.endTime)}
                                    </div>
                                    {m.location && (
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="h-4 w-4"/>
                                          {m.location}
                                        </div>
                                    )}
                                  </div>

                                  {(m.attendees?.length ?? 0) > 0 && (
                                      <div className="flex items-center gap-3 pt-2">
                                        <div className="flex -space-x-2">
                                          {m.attendees!.slice(0, 5).map((a: { userId: Key | null | undefined; user: { profilePictureUrl: string | undefined; firstName: (string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined)[]; lastName: any[]; }; }) => (
                                  <Avatar key={a.userId} className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={a.user?.profilePictureUrl} />
                                    <AvatarFallback className="text-xs">
                                      {a.user?.firstName?.[0]}{a.user?.lastName?.[0] || ''}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {m.attendees!.length > 5 && (
                                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                                    +{m.attendees!.length - 5}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {m.attendees!.length} attendee{m.attendees!.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-2 space-y-4">
            {past.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent">
                <CardContent className="p-16 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                  <h3 className="text-xl font-medium">No past meetings yet</h3>
                </CardContent>
              </Card>
            ) : (
              past.map(m => (
                <Card
                  key={m.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => openDetails(m)}
                >
                  <CardContent className="p-5">
                    <div className="flex gap-5 items-start">
                      <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-muted/70 shrink-0">
                        <span className="text-3xl font-bold text-muted-foreground">
                          {new Date(m.date).getDate()}
                        </span>
                        <span className="text-xs uppercase mt-1 text-muted-foreground/70">
                          {new Date(m.date).toLocaleString('en-US', { month: 'short' })}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-xl font-semibold mb-1">{m.title}</h3>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <span>{fmtDate(m.date)}</span>
                              <span>•</span>
                              <span>{fmtTime(m.startTime)}</span>
                              {m.meetingType && (
                                <>
                                  <span>•</span>
                                  {meetingTypeBadge(m.meetingType)}
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => { e.stopPropagation(); openDetails(m); }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-20 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
                <h2 className="text-2xl font-semibold mb-3">Calendar View</h2>
                <p className="text-muted-foreground">Interactive calendar coming soon</p>
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
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {activeMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-3 text-2xl">
                  {activeMeeting.title}
                  {meetingTypeBadge(activeMeeting.meetingType)}
                  {priorityBadge(activeMeeting.meetingPriority)}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {activeMeeting.description || 'No description provided.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: <Calendar className="h-5 w-5 mx-auto mb-1" />, label: 'Date',     value: fmtDate(activeMeeting.date) },
                    { icon: <Clock     className="h-5 w-5 mx-auto mb-1" />, label: 'Time',     value: `${fmtTime(activeMeeting.startTime)} – ${fmtTime(activeMeeting.endTime)}` },
                    { icon: formatIcon(activeMeeting.meetingFormat),        label: 'Format',   value: activeMeeting.meetingFormat || '—' },
                    { icon: <Users     className="h-5 w-5 mx-auto mb-1" />, label: 'Attendees',value: `${(activeMeeting.attendees ?? []).length} invited` },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-muted/40">
                      {item.icon}
                      <p className="font-medium mt-1 capitalize">{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                {(activeMeeting.location || activeMeeting.onlineMeetingLink) && (
                  <div className="flex flex-wrap gap-5 text-sm">
                    {activeMeeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {activeMeeting.location}
                      </div>
                    )}
                    {activeMeeting.onlineMeetingLink && (
                      <a
                        href={activeMeeting.onlineMeetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Monitor className="h-4 w-4" /> Join Online
                      </a>
                    )}
                  </div>
                )}

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">RSVP Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {RSVP_SUMMARY.map(s => (
                      <div key={s.value} className="text-center p-4 rounded-xl bg-muted/40">
                        <p className="text-3xl font-bold">{countRsvp(activeMeeting, s.value)}</p>
                        <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {(activeMeeting.attendees?.length ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-4">
                        Attendees ({activeMeeting.attendees!.length})
                      </h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                        {activeMeeting.attendees!.map(att => (
                          <div
                            key={att.userId}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={att.user?.profilePictureUrl} />
                                <AvatarFallback>
                                  {(att.user?.firstName?.[0] ?? '') + (att.user?.lastName?.[0] ?? '') || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {att.user ? `${att.user.firstName} ${att.user.lastName}` : att.userId}
                                </p>
                                {att.user?.title && (
                                  <p className="text-sm text-muted-foreground">{att.user.title}</p>
                                )}
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

              <div className="flex justify-end gap-3 pt-5 border-t">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handleStartLive(activeMeeting.id)}>
                  <Video className="mr-2 h-4 w-4" />
                  Start / Join Meeting
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}