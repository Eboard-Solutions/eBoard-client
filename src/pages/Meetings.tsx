import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { meetings, users } from '@/lib/store';
import {
  Calendar, Clock, MapPin, Users as UsersIcon, Plus, Search, Video,
  ClipboardList, FileText, Play, Radio, Building, Building2, Monitor,
  Flag, Repeat, Bell, Mail, MessageSquare, Smartphone, QrCode,
  UsersRound, CheckCircle,
} from 'lucide-react';
import { AgendaManager } from '@/components/meetings/AgendaManager';
import { MinutesManager } from '@/components/meetings/MinutesManager';

type MeetingFormat = 'physical' | 'online' | 'hybrid';
type MeetingType = 'regular' | 'special' | 'emergency' | 'annual';
type Priority = 'low' | 'medium' | 'high';
type RecurringFrequency = 'none' | 'weekly' | 'monthly' | 'yearly';
type RSVPStatus = 'invited' | 'accepted' | 'declined' | 'tentative';

interface MeetingAttendee {
  odlId: string;
  userId: string;
  rsvpStatus: RSVPStatus;
  checkedIn: boolean;
  checkedInAt?: string;
}

interface MeetingReminder {
  id: string;
  meetingId: string;
  type: 'email' | 'in_app' | 'whatsapp' | 'sms';
  minutesBefore: number;
  customMessage?: string;
  userIds: string[];
  isSent: boolean;
  scheduledFor: string;
  sentAt?: string;
}

interface EnhancedMeeting {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location?: string;
  isRecurring: boolean;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  agenda: {
    id: string;
    title: string;
    owner: string;
    duration: number;
    description?: string;
    attachments: string[];
    order: number;
  }[];
  attendees: string[];
  minutesId?: string;
  createdBy: string;
  createdAt: string;
  format: MeetingFormat;
  meetingType: MeetingType;
  priority: Priority;
  recurring: RecurringFrequency;
  recurringEndDate?: string;
  quorumRequired: number;
  description?: string;
  virtualLink?: string;
  attendeeDetails: MeetingAttendee[];
  reminders: MeetingReminder[];
  checkInPIN?: string;
}

interface MeetingFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  format: MeetingFormat;
  meetingType: MeetingType;
  priority: Priority;
  recurring: RecurringFrequency;
  location: string;
  virtualLink: string;
  description: string;
  quorumRequired: number;
  attendees: string[];
  enableReminders: boolean;
  reminderTypes: string[];
  reminderMinutes: number;
  enableCheckIn: boolean;
}

const MEETING_FORMATS: { value: MeetingFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'physical', label: 'Physical', icon: <Building className="h-4 w-4" /> },
  { value: 'online', label: 'Online', icon: <Monitor className="h-4 w-4" /> },
  { value: 'hybrid', label: 'Hybrid', icon: <Building2 className="h-4 w-4" /> },
];

const MEETING_TYPES: { value: MeetingType; label: string; color: string }[] = [
  { value: 'regular', label: 'Regular', color: 'bg-blue-500' },
  { value: 'special', label: 'Special', color: 'bg-purple-500' },
  { value: 'emergency', label: 'Emergency', color: 'bg-red-500' },
  { value: 'annual', label: 'Annual', color: 'bg-amber-500' },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-red-500' },
];

const RECURRING_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const RSVP_STATUS_LABELS: { value: RSVPStatus; label: string; color: string }[] = [
  { value: 'invited', label: 'Invited', color: 'bg-gray-100 text-gray-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
  { value: 'tentative', label: 'Tentative', color: 'bg-yellow-100 text-yellow-700' },
];

export function Meetings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<EnhancedMeeting | null>(null);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    format: 'physical',
    meetingType: 'regular',
    priority: 'medium',
    recurring: 'none',
    location: '',
    virtualLink: '',
    description: '',
    quorumRequired: 5,
    attendees: [],
    enableReminders: true,
    reminderTypes: ['email'],
    reminderMinutes: 60,
    enableCheckIn: true,
  });
  const [, setLocation] = useLocation();

  const liveMeetings = (meetings as EnhancedMeeting[]).filter(m => m.status === 'in_progress');

  const filteredMeetings = (meetings as EnhancedMeeting[]).filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || meeting.status === selectedStatus;
    const matchesFormat = selectedFormat === 'all' || meeting.format === selectedFormat;
    return matchesSearch && matchesStatus && matchesFormat;
  });

  const upcomingMeetings = filteredMeetings.filter(m => m.status === 'upcoming');
  const pastMeetings = filteredMeetings.filter(m => m.status === 'completed');

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

  const getDaysUntil = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return 'Past';
    return `In ${days} days`;
  };

  const handleStartLive = (meetingId: string) => setLocation(`/meetings/live/${meetingId}`);

  const handleViewDetails = (meeting: EnhancedMeeting) => {
    setSelectedMeeting(meeting);
    setIsDetailsDialogOpen(true);
  };

  const handleToggleAttendee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(userId)
        ? prev.attendees.filter(id => id !== userId)
        : [...prev.attendees, userId],
    }));
  };

  const getRSVPStatusCount = (meeting: EnhancedMeeting, status: RSVPStatus) =>
    meeting.attendeeDetails?.filter((a: MeetingAttendee) => a.rsvpStatus === status).length || 0;

  const getFormatIcon = (format: MeetingFormat) => {
    switch (format) {
      case 'physical': return <Building className="h-4 w-4" />;
      case 'online': return <Monitor className="h-4 w-4" />;
      case 'hybrid': return <Building2 className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return p ? (
      <Badge className={`${p.color} text-white text-xs`}>
        <Flag className="h-3 w-3 mr-1" />{p.label}
      </Badge>
    ) : null;
  };

  const getMeetingTypeBadge = (type: MeetingType) => {
    const t = MEETING_TYPES.find(mt => mt.value === type);
    return t ? (
      <Badge className={`${t.color} text-white text-xs`}>{t.label}</Badge>
    ) : null;
  };

  const getRSVPBadge = (status: RSVPStatus) => {
    const r = RSVP_STATUS_LABELS.find(rs => rs.value === status);
    return r ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.color}`}>{r.label}</span>
    ) : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground mt-1">Manage board meetings, agendas, and minutes</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>Create a new board meeting with full configuration options</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Meeting Title</Label>
                    <Input placeholder="e.g., Q1 Strategic Planning" />
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Type</Label>
                    <Select
                      value={formData.meetingType}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, meetingType: v as MeetingType }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as Priority }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Schedule & Format */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />Schedule & Format
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meeting Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, format: v as MeetingFormat }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEETING_FORMATS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            <div className="flex items-center gap-2">{f.icon}{f.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recurring</Label>
                    <Select
                      value={formData.recurring}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, recurring: v as RecurringFrequency }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECURRING_OPTIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <div className="flex gap-2">
                      <Input type="time" placeholder="Start" />
                      <Input type="time" placeholder="End" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input placeholder="Conference Room A" />
                  </div>
                  <div className="space-y-2">
                    <Label>Virtual Link</Label>
                    <Input placeholder="https://zoom.us/..." />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quorum & Description */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <UsersRound className="h-4 w-4" />Quorum & Description
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quorum Required</Label>
                    <Input type="number" min={1} defaultValue={5} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Meeting description..." rows={3} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Attendees */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" />Attendees
                </h3>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {users.filter(u => u.status !== 'suspended').map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted"
                      onClick={() => handleToggleAttendee(user.id)}
                    >
                      <Checkbox
                        checked={formData.attendees.includes(user.id)}
                        onCheckedChange={() => handleToggleAttendee(user.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.position || user.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Reminders */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4" />Reminders
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.enableReminders}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, enableReminders: v }))}
                    />
                    <Label>Enable Reminders</Label>
                  </div>
                  {formData.enableReminders && (
                    <Select
                      value={String(formData.reminderMinutes)}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, reminderMinutes: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes before</SelectItem>
                        <SelectItem value="30">30 minutes before</SelectItem>
                        <SelectItem value="60">1 hour before</SelectItem>
                        <SelectItem value="1440">1 day before</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {formData.enableReminders && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={formData.reminderTypes.includes('email')} />
                      <Mail className="h-4 w-4" /><span className="text-sm">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={formData.reminderTypes.includes('in_app')} />
                      <Bell className="h-4 w-4" /><span className="text-sm">In-App</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={formData.reminderTypes.includes('whatsapp')} />
                      <MessageSquare className="h-4 w-4" /><span className="text-sm">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={formData.reminderTypes.includes('sms')} />
                      <Smartphone className="h-4 w-4" /><span className="text-sm">SMS</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Digital Check-In */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <QrCode className="h-4 w-4" />Digital Check-In
                </h3>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.enableCheckIn}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, enableCheckIn: v }))}
                  />
                  <Label>Enable Check-In PIN for Physical Meetings</Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>Schedule & Send Invites</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Live Meetings Banner */}
      {liveMeetings.length > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-green-600 animate-pulse" />
                <span className="font-semibold text-green-700 dark:text-green-400">
                  Live Meeting{liveMeetings.length > 1 ? 's' : ''} In Progress
                </span>
              </div>
              <div className="flex gap-2">
                {liveMeetings.map(meeting => (
                  <Button
                    key={meeting.id}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-green-300 text-green-700 hover:bg-green-100"
                    onClick={() => handleStartLive(meeting.id)}
                  >
                    <Play className="h-4 w-4" />{meeting.title}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meetings..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant={selectedStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedStatus('all')}>All</Button>
              <Button variant={selectedStatus === 'upcoming' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedStatus('upcoming')}>Upcoming</Button>
              <Button variant={selectedStatus === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedStatus('completed')}>Past</Button>
            </div>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Formats" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>{selectedMeeting.title}</span>
                  {getMeetingTypeBadge(selectedMeeting.meetingType)}
                  {getPriorityBadge(selectedMeeting.priority)}
                </DialogTitle>
                <DialogDescription>{selectedMeeting.description || 'No description'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">{formatDate(selectedMeeting.startAt)}</p>
                    <p className="text-xs text-muted-foreground">Date</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {formatTime(selectedMeeting.startAt)} - {formatTime(selectedMeeting.endAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">Time</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    {getFormatIcon(selectedMeeting.format)}
                    <p className="text-sm font-medium capitalize">{selectedMeeting.format}</p>
                    <p className="text-xs text-muted-foreground">Format</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <UsersRound className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">{selectedMeeting.quorumRequired} required</p>
                    <p className="text-xs text-muted-foreground">Quorum</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">RSVP Status</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {RSVP_STATUS_LABELS.map(status => (
                      <div key={status.value} className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">
                          {getRSVPStatusCount(selectedMeeting, status.value as RSVPStatus)}
                        </p>
                        <p className="text-xs text-muted-foreground">{status.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Attendees</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedMeeting.attendeeDetails?.map((att: MeetingAttendee) => {
                      const user = users.find(u => u.id === att.userId);
                      return user ? (
                        <div key={att.odlId} className="flex items-center justify-between p-2 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.position || user.role}</p>
                            </div>
                          </div>
                          {getRSVPBadge(att.rsvpStatus)}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {selectedMeeting.checkInPIN && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Check-In PIN</h3>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <QrCode className="h-6 w-6" />
                        <span className="text-2xl font-mono font-bold tracking-wider">
                          {selectedMeeting.checkInPIN}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {selectedMeeting.reminders && selectedMeeting.reminders.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Reminders</h3>
                      <div className="space-y-2">
                        {selectedMeeting.reminders.map((rem: MeetingReminder) => (
                          <div key={rem.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div className="flex items-center gap-2">
                              {rem.type === 'email' && <Mail className="h-4 w-4" />}
                              {rem.type === 'in_app' && <Bell className="h-4 w-4" />}
                              {rem.type === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                              {rem.type === 'sms' && <Smartphone className="h-4 w-4" />}
                              <span className="text-sm capitalize">{rem.type.replace('_', '-')}</span>
                              <span className="text-sm text-muted-foreground">- {rem.minutesBefore} min before</span>
                            </div>
                            {rem.isSent ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />Sent
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                <Button variant="outline">Edit Meeting</Button>
                <Button onClick={() => handleStartLive(selectedMeeting.id)}>
                  <Video className="h-4 w-4 mr-2" />Start Meeting
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastMeetings.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2">
            <ClipboardList className="h-4 w-4" />Agenda
          </TabsTrigger>
          <TabsTrigger value="minutes" className="gap-2">
            <FileText className="h-4 w-4" />Minutes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.map((meeting: EnhancedMeeting) => {
            const attendeeAvatars = users.filter(u => meeting.attendees.includes(u.id));
            const acceptedCount =
              meeting.attendeeDetails?.filter((a: MeetingAttendee) => a.rsvpStatus === 'accepted').length || 0;
            return (
              <Card key={meeting.id} className="glass hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-primary text-primary-foreground shrink-0">
                      <span className="text-2xl font-bold">{new Date(meeting.startAt).getDate()}</span>
                      <span className="text-xs uppercase">
                        {new Date(meeting.startAt).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold">{meeting.title}</h3>
                            {getMeetingTypeBadge(meeting.meetingType)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{getDaysUntil(meeting.startAt)}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              {getFormatIcon(meeting.format)}
                              <span className="capitalize">{meeting.format}</span>
                            </Badge>
                            {meeting.recurring !== 'none' && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Repeat className="h-3 w-3" />
                                <span className="capitalize">{meeting.recurring}</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleViewDetails(meeting)}>
                            <UsersIcon className="h-4 w-4" />Details
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleStartLive(meeting.id)}>
                            <Video className="h-4 w-4" />Start Live
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" /><span>{formatDate(meeting.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" /><span>{meeting.location || 'TBD'}</span>
                        </div>
                        {meeting.virtualLink && (
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" /><span>Virtual Link Available</span>
                          </div>
                        )}
                      </div>
                      {meeting.attendeeDetails && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">RSVP:</span>
                          <span className="text-green-600 font-medium">{acceptedCount} accepted</span>
                          {meeting.attendeeDetails.filter((a: MeetingAttendee) => a.rsvpStatus === 'declined').length > 0 && (
                            <span className="text-red-600">
                              {meeting.attendeeDetails.filter((a: MeetingAttendee) => a.rsvpStatus === 'declined').length} declined
                            </span>
                          )}
                          {meeting.attendeeDetails.filter((a: MeetingAttendee) => a.rsvpStatus === 'tentative').length > 0 && (
                            <span className="text-yellow-600">
                              {meeting.attendeeDetails.filter((a: MeetingAttendee) => a.rsvpStatus === 'tentative').length} tentative
                            </span>
                          )}
                        </div>
                      )}
                      {meeting.agenda && meeting.agenda.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Agenda:</h4>
                          <ul className="space-y-1">
                            {meeting.agenda.slice(0, 2).map((item) => (
                              <li key={item.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                {item.title}
                              </li>
                            ))}
                            {meeting.agenda.length > 2 && (
                              <li className="text-sm text-muted-foreground pl-3.5">
                                +{meeting.agenda.length - 2} more items
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex -space-x-2">
                          {attendeeAvatars.slice(0, 5).map((user) => (
                            <Avatar key={user.id} className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">{meeting.attendees.length} attendees</span>
                        {meeting.checkInPIN && (
                          <Badge variant="outline" className="gap-1 ml-2">
                            <QrCode className="h-3 w-3" />PIN: {meeting.checkInPIN}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {upcomingMeetings.length === 0 && (
            <Card className="glass">
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No upcoming meetings</p>
                  <p className="text-sm">Schedule a new meeting to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastMeetings.map((meeting: EnhancedMeeting) => (
            <Card key={meeting.id} className="glass opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-muted shrink-0">
                    <span className="text-2xl font-bold">{new Date(meeting.startAt).getDate()}</span>
                    <span className="text-xs uppercase">
                      {new Date(meeting.startAt).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold">{meeting.title}</h3>
                          {getMeetingTypeBadge(meeting.meetingType)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(meeting.startAt)} • {formatTime(meeting.startAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(meeting)}>
                        View Minutes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {pastMeetings.length === 0 && (
            <Card className="glass">
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No past meetings</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="glass">
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Calendar View</p>
                <p className="text-sm">Interactive calendar view coming soon</p>
              </div>
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