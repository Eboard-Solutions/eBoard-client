'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar, Clock, MapPin, Plus, Search, Loader2, Monitor,
  FileText, Video, Users, Wifi, Building2,
  Layers, MoreVertical, Pencil, Trash2,
  Globe, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  CalendarDays, X, TrendingUp, Filter,
} from 'lucide-react';

import {
  useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting,
} from '@/hooks/api/useMeetings';
import type {
  Meeting, MeetingFormat, MeetingFrequency,
  MeetingType, MeetingPriority, RSVPStatus, CreateMeetingData,
} from '@/types/api.types';
// Agendas and Minutes have moved to dedicated top-level pages
// (/agendas and /minutes) — see App.tsx routes and the sidebar nav.
// This page now focuses solely on meeting CRUD + upcoming/past listing.

// ─── Timezone list ────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'Africa/Nairobi',      label: 'Nairobi (EAT, UTC+3)'         },
  { value: 'Africa/Lagos',        label: 'Lagos (WAT, UTC+1)'           },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST, UTC+2)'   },
  { value: 'Africa/Cairo',        label: 'Cairo (EET, UTC+2)'           },
  { value: 'Africa/Accra',        label: 'Accra (GMT, UTC+0)'           },
  { value: 'Europe/London',       label: 'London (GMT/BST)'             },
  { value: 'Europe/Paris',        label: 'Paris (CET, UTC+1)'           },
  { value: 'America/New_York',    label: 'New York (EST/EDT)'           },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)'        },
  { value: 'Asia/Dubai',          label: 'Dubai (GST, UTC+4)'           },
  { value: 'Asia/Kolkata',        label: 'Mumbai/Delhi (IST, UTC+5:30)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT, UTC+8)'       },
  { value: 'Asia/Tokyo',          label: 'Tokyo (JST, UTC+9)'           },
  { value: 'UTC',                 label: 'UTC (Universal Time)'         },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetingForm extends CreateMeetingData {
  timezone: string;
}

const BLANK_FORM: MeetingForm = {
  title: '', description: '', meetingFormat: 'online',
  meetingFrequency: 'once', meetingType: 'regular',
  meetingPriority: 'medium', location: '', onlineMeetingLink: '',
  date: '', startTime: '', endTime: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi',
};

// ─── Safe helpers ─────────────────────────────────────────────────────────────

/**
 * FIX 1 — /meetings/undefined
 * Backend may return `id` or `meetingId`. Always use this to get the ID.
 */
function getMeetingId(m: Meeting): string {
  return (m as any).id ?? (m as any).meetingId ?? '';
}

/**
 * FIX 2 — "Received NaN for children"
 * new Date(undefined).getDate() = NaN. Use safeDate everywhere.
 */
function safeDate(val?: string | null): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * FIX 3 — Timezone bug: old code used .toISOString() which converts to UTC.
 * "Tomorrow 9am Nairobi" became "Today 6am UTC" → showed as past.
 */
function buildLocalISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

/**
 * FIX 4 — Meeting always shows as "past" after update.
 *
 * Root cause: the backend stores the date in `scheduledDate` (not `date`)
 * and times as plain "HH:mm:ss" strings (not full ISO datetimes).
 *
 * So when we receive a meeting back from the API:
 *   m.date      = undefined  (frontend field — not what backend returns)
 *   m.endTime   = "08:15:00" (plain time — no date portion)
 *   m.scheduledDate = "2026-03-25T00:00:00.000Z"  (the real date)
 *
 * Old code:
 *   safeDate("08:15:00")  → null  (Invalid Date — no date part)
 *   safeDate(undefined)   → null  (m.date is undefined)
 *   end = null → isUpcoming returns false → meeting shows as past
 *
 * Fix: combine scheduledDate + endTime to build a real comparable datetime.
 * Fall back through every field the backend might use for the date.
 */
function getMeetingDate(m: Meeting): string | null {
  // Backend stores date as scheduledDate — check that first
  const raw = (m as any).scheduledDate ?? (m as any).date ?? m.startTime ?? null;
  if (!raw) return null;
  // If it's a full ISO string, take just the date part
  return raw.split('T')[0];
}

function getMeetingEndDatetime(m: Meeting): Date | null {
  const dateStr = getMeetingDate(m);
  if (!dateStr) return null;

  // endTime from backend is "HH:mm:ss" — combine with date to get a real datetime
  const timeStr = m.endTime
    ? (m.endTime.includes('T') ? m.endTime.split('T')[1] : m.endTime)
    : null;

  if (timeStr) {
    const combined = safeDate(`${dateStr}T${timeStr}`);
    if (combined) return combined;
  }

  // No end time — fall back to end of day on the meeting date
  const d = safeDate(`${dateStr}T23:59:59`);
  return d;
}

function isUpcoming(m: Meeting): boolean {
  // Use status fields — check both snake_case and camelCase variants
  const status = (m as any).meetingStatus ?? m.status;
  if (status === 'completed'  || status === 'COMPLETED')  return false;
  if (status === 'cancelled'  || status === 'CANCELLED')  return false;
  if (status === 'inProgress' || status === 'IN_PROGRESS' ||
      status === 'INPROGRESS')                            return true;

  // Reconstruct a real end datetime from scheduledDate + endTime
  const end = getMeetingEndDatetime(m);
  if (!end) return false;
  return end > new Date();
}

function fmtDate(val?: string): string {
  // Accept scheduledDate too
  const d = safeDate(val);
  if (!d) return 'TBD';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(val?: string): string {
  if (!val) return '—';
  // Full ISO string — parse normally
  const d = safeDate(val);
  if (d) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  // Plain "HH:mm" or "HH:mm:ss" — apply to today just for display formatting
  const timePart = val.includes('T') ? val.split('T')[1] : val;
  const [h, min] = timePart.split(':').map(Number);
  if (!isNaN(h) && !isNaN(min)) {
    const d2 = new Date(); d2.setHours(h, min, 0, 0);
    return d2.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return val;
}

function daysUntil(dateStr?: string): { text: string; variant: 'today' | 'tomorrow' | 'soon' | 'past' | 'future' } {
  // Also accept scheduledDate format
  const d = safeDate(dateStr);
  if (!d) return { text: '—', variant: 'future' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)   return { text: 'Past',       variant: 'past'     };
  if (diff === 0) return { text: 'Today',       variant: 'today'    };
  if (diff === 1) return { text: 'Tomorrow',    variant: 'tomorrow' };
  if (diff <= 7)  return { text: `In ${diff}d`, variant: 'soon'     };
  return           { text: `${diff} days`,      variant: 'future'   };
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function typeBadge(type?: MeetingType) {
  const s: Record<MeetingType, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    special:   'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    annual:    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    regular:   'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  };
  return <Badge variant="outline" className={`text-xs capitalize ${s[type ?? 'regular']}`}>{type ?? 'Regular'}</Badge>;
}

function priorityDot(p?: MeetingPriority) {
  const cls = p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-400' : 'bg-emerald-500';
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${cls}`} />;
}

function rsvpBadge(status?: RSVPStatus) {
  const map: Record<RSVPStatus, { cls: string; label: string }> = {
    accepted:  { cls: 'bg-emerald-100 text-emerald-700', label: 'Accepted'   },
    declined:  { cls: 'bg-red-100 text-red-700',         label: 'Declined'   },
    tentative: { cls: 'bg-amber-100 text-amber-700',     label: 'Tentative'  },
    invited:   { cls: 'bg-slate-100 text-slate-600',     label: 'Invited'    },
    attended:  { cls: 'bg-emerald-100 text-emerald-700', label: 'Attended'   },
    absent:    { cls: 'bg-red-100 text-red-600',         label: 'Absent'     },
    checkedIn: { cls: 'bg-blue-100 text-blue-700',       label: 'Checked In' },
  };
  const { cls, label } = map[status ?? 'invited'] ?? map.invited;
  return <Badge className={`text-xs border-0 ${cls}`}>{label}</Badge>;
}

function formatIcon(fmt?: MeetingFormat) {
  if (fmt === 'online')   return <Wifi      className="h-4 w-4 text-blue-500"    />;
  if (fmt === 'physical') return <Building2 className="h-4 w-4 text-emerald-500" />;
  if (fmt === 'hybrid')   return <Layers    className="h-4 w-4 text-purple-500"  />;
  return                         <Monitor   className="h-4 w-4 text-muted-foreground" />;
}

function countRsvp(m: Meeting, s: RSVPStatus) {
  return (m.attendees ?? []).filter(a => a.rsvpStatus === s).length;
}

// ─── Meeting Form ─────────────────────────────────────────────────────────────

function MeetingForm({ form, onChange }: { form: MeetingForm; onChange: (p: Partial<MeetingForm>) => void }) {
  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

  return (
    <div className="space-y-5">
      <div>
        <label className={lbl}>Title <span className="text-red-500 normal-case">*</span></label>
        <Input value={form.title} className={inp} placeholder="e.g. Q1 Strategic Planning"
          onChange={e => onChange({ title: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Date <span className="text-red-500 normal-case">*</span></label>
          <Input type="date" value={form.date} className={inp}
            onChange={e => onChange({ date: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Type</label>
          <Select value={form.meetingType} onValueChange={v => onChange({ meetingType: v as MeetingType })}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['regular', 'special', 'emergency', 'annual'] as MeetingType[]).map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Start Time <span className="text-red-500 normal-case">*</span></label>
          <Input type="time" value={form.startTime} className={inp}
            onChange={e => onChange({ startTime: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>End Time <span className="text-red-500 normal-case">*</span></label>
          <Input type="time" value={form.endTime} className={inp}
            onChange={e => onChange({ endTime: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={lbl}><Globe className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Timezone</label>
        <Select value={form.timezone} onValueChange={v => onChange({ timezone: v })}>
          <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-56">
            {TIMEZONES.map(tz => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5">Times are stored and displayed in this timezone.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Format</label>
          <Select value={form.meetingFormat} onValueChange={v => onChange({ meetingFormat: v as MeetingFormat })}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online"><div className="flex items-center gap-2"><Wifi className="h-4 w-4 text-blue-500" />Online</div></SelectItem>
              <SelectItem value="physical"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-500" />In-Person</div></SelectItem>
              <SelectItem value="hybrid"><div className="flex items-center gap-2"><Layers className="h-4 w-4 text-purple-500" />Hybrid</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={lbl}>Priority</label>
          <Select value={form.meetingPriority} onValueChange={v => onChange({ meetingPriority: v as MeetingPriority })}>
            <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['low', 'medium', 'high'] as MeetingPriority[]).map(p => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-2">{priorityDot(p)}<span className="capitalize">{p}</span></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className={lbl}>Frequency</label>
        <Select value={form.meetingFrequency} onValueChange={v => onChange({ meetingFrequency: v as MeetingFrequency })}>
          <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['once', 'weekly', 'monthly', 'yearly', 'custom'] as MeetingFrequency[]).map(f => (
              <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className={lbl}>Location</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={form.location ?? ''} className={`${inp} pl-10`} placeholder="Conference Room A"
            onChange={e => onChange({ location: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={lbl}>Online Link</label>
        <div className="relative">
          <Monitor className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={form.onlineMeetingLink ?? ''} className={`${inp} pl-10`} placeholder="https://zoom.us/j/…"
            onChange={e => onChange({ onlineMeetingLink: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={lbl}>Description</label>
        <Textarea rows={3} value={form.description ?? ''}
          className="resize-none rounded-xl border-border/60 bg-background text-sm"
          placeholder="Meeting goals, background information…"
          onChange={e => onChange({ description: e.target.value })} />
      </div>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onView, onEdit, onDelete }: {
  meeting: Meeting; onView: (m: Meeting) => void;
  onEdit: (m: Meeting) => void; onDelete: (m: Meeting) => void;
}) {
  // FIX: backend stores date in scheduledDate not date
  const meetingDateStr = (meeting as any).scheduledDate ?? meeting.date;
  const d = safeDate(meetingDateStr);
  const { text: dayText, variant } = daysUntil(meetingDateStr);
  const isToday    = variant === 'today';
  const isTomorrow = variant === 'tomorrow';
  const isPast     = variant === 'past';
  const meetingId  = getMeetingId(meeting);

  const dateBg =
    isToday    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25' :
    isTomorrow ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-400/25'      :
    isPast     ? 'bg-muted text-muted-foreground'                                                                    :
    variant === 'soon' ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm'                       :
    'bg-muted/70 text-foreground';

  const leftBorder =
    isToday    ? 'border-l-[3px] border-l-primary'     :
    isTomorrow ? 'border-l-[3px] border-l-emerald-500' :
    meeting.meetingType === 'emergency' ? 'border-l-[3px] border-l-red-500' :
    '';

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-card border border-border/60 overflow-hidden ${leftBorder}`}
      onClick={() => onView(meeting)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-4 items-start">

          {/* Date block — FIX: shows '?' instead of NaN */}
          <div className={`flex flex-col items-center justify-center w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl shrink-0 font-bold transition-transform duration-200 group-hover:scale-105 ${dateBg}`}>
            <span className="text-xl sm:text-2xl leading-none tabular-nums">
              {d ? d.getDate() : '?'}
            </span>
            <span className="text-[9px] uppercase mt-0.5 opacity-80 tracking-wider">
              {d ? d.toLocaleString('en-US', { month: 'short' }) : '—'}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <h3 className="text-[15px] sm:text-base font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                  {meeting.title}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isToday    ? 'bg-primary/10 text-primary' :
                    isTomorrow ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                    isPast     ? 'bg-muted text-muted-foreground' :
                    variant === 'soon' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                    'bg-muted/60 text-muted-foreground'
                  }`}>{dayText}</span>
                  {typeBadge(meeting.meetingType)}
                  <span className="flex items-center gap-1">
                    {priorityDot(meeting.meetingPriority)}
                    <span className="text-xs text-muted-foreground capitalize">{meeting.meetingPriority}</span>
                  </span>
                </div>
              </div>

              {/* FIX: only render dropdown if we have a valid ID */}
              {meetingId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      onClick={e => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); onView(meeting); }}>
                      <CalendarDays className="mr-2 h-4 w-4" />View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(meeting); }}>
                      <Pencil className="mr-2 h-4 w-4" />Edit Meeting
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive"
                      onClick={e => { e.stopPropagation(); onDelete(meeting); }}>
                      <Trash2 className="mr-2 h-4 w-4" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {fmtTime(meeting.startTime)} – {fmtTime(meeting.endTime)}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[180px]">{meeting.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                {formatIcon(meeting.meetingFormat)}
                <span className="capitalize">{meeting.meetingFormat}</span>
              </span>
            </div>

            {(meeting.attendees?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex -space-x-1.5">
                  {/* FIX: key uses index fallback when userId is undefined */}
                  {meeting.attendees!.slice(0, 4).map((a, i) => (
                    <Avatar key={a.userId ?? `att-${i}`} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={a.user?.profilePictureUrl} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {(a.user?.firstName?.[0] ?? '') + (a.user?.lastName?.[0] ?? '')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {meeting.attendees!.length > 4 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold">
                      +{meeting.attendees!.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {meeting.attendees!.length} attendee{meeting.attendees!.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function DetailDialog({ meeting, open, onClose, onEdit, onDelete, onStartLive }: {
  meeting: Meeting | null; open: boolean; onClose: () => void;
  onEdit: (m: Meeting) => void; onDelete: (m: Meeting) => void;
  onStartLive: (id: string) => void;
}) {
  if (!meeting) return null;
  const meetingId = getMeetingId(meeting);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-xl pr-8">
            {meeting.title}{typeBadge(meeting.meetingType)}
          </DialogTitle>
          <DialogDescription>{meeting.description || 'No description provided.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Calendar className="h-4 w-4 mx-auto mb-1" />, label: 'Date',      value: fmtDate((meeting as any).scheduledDate ?? meeting.date) },
              { icon: <Clock    className="h-4 w-4 mx-auto mb-1" />, label: 'Time',      value: `${fmtTime(meeting.startTime)} – ${fmtTime(meeting.endTime)}` },
              { icon: formatIcon(meeting.meetingFormat),               label: 'Format',    value: meeting.meetingFormat ?? '—' },
              { icon: <Users    className="h-4 w-4 mx-auto mb-1" />, label: 'Attendees', value: String((meeting.attendees ?? []).length) },
            ].map((item, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-muted-foreground">{item.icon}</div>
                <p className="font-semibold text-sm mt-1 capitalize">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {(meeting.location || meeting.onlineMeetingLink) && (
            <div className="flex flex-wrap gap-4 text-sm p-3 rounded-xl bg-muted/30 border border-border/40">
              {meeting.location && (
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{meeting.location}</span>
              )}
              {meeting.onlineMeetingLink && (
                <a href={meeting.onlineMeetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                  onClick={e => e.stopPropagation()}>
                  <Monitor className="h-4 w-4" />Join Online
                </a>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">RSVP Summary</p>
            <div className="grid grid-cols-4 gap-3">
              {([
                { v: 'accepted'  as RSVPStatus, l: 'Accepted',  Icon: CheckCircle2, c: 'text-emerald-600' },
                { v: 'declined'  as RSVPStatus, l: 'Declined',  Icon: XCircle,      c: 'text-red-500'     },
                { v: 'tentative' as RSVPStatus, l: 'Tentative', Icon: AlertCircle,  c: 'text-amber-500'   },
                { v: 'invited'   as RSVPStatus, l: 'Pending',   Icon: Users,        c: 'text-slate-500'   },
              ]).map(({ v, l, Icon, c }) => (
                <div key={v} className="text-center p-3 rounded-xl bg-muted/40 border border-border/40">
                  <p className="text-2xl font-bold">{countRsvp(meeting, v)}</p>
                  <div className={`flex items-center justify-center gap-1 mt-1 ${c}`}>
                    <Icon className="h-3 w-3" /><p className="text-xs font-medium">{l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(meeting.attendees?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Attendees ({meeting.attendees!.length})
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {meeting.attendees!.map((att, i) => (
                  <div key={att.userId ?? `a-${i}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={att.user?.profilePictureUrl} />
                        <AvatarFallback className="text-xs">
                          {(att.user?.firstName?.[0] ?? '') + (att.user?.lastName?.[0] ?? '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {att.user ? `${att.user.firstName} ${att.user.lastName}` : att.userId ?? '?'}
                        </p>
                        {att.user?.title && <p className="text-xs text-muted-foreground">{att.user.title}</p>}
                      </div>
                    </div>
                    {rsvpBadge(att.rsvpStatus)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-border/40">
          <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => { onClose(); onEdit(meeting); }}>
            <Pencil className="h-4 w-4" />Edit
          </Button>
          <Button variant="outline" className="rounded-xl gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => { onClose(); onDelete(meeting); }}>
            <Trash2 className="h-4 w-4" />Delete
          </Button>
          {/* FIX: guard against undefined ID */}
          {meetingId && (
            <Button className="rounded-xl gap-1.5" onClick={() => onStartLive(meetingId)}>
              <Video className="h-4 w-4" />Start / Join Meeting
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isPast, onCreate }: { isPast: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 rounded-2xl border-2 border-dashed border-border/50 bg-muted/5">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          {isPast ? <FileText className="h-8 w-8 text-muted-foreground/30" /> : <Calendar className="h-8 w-8 text-muted-foreground/30" />}
        </div>
        {!isPast && (
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Plus className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold">{isPast ? 'No past meetings' : 'No upcoming meetings'}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isPast ? 'Completed meetings will appear here' : 'Schedule your first meeting to get started'}
        </p>
      </div>
      {!isPast && (
        <Button onClick={onCreate} className="rounded-xl gap-2"><Plus className="h-4 w-4" />Schedule Meeting</Button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Meetings() {
  const [, setLocation] = useLocation();

  const [search,       setSearch]       = useState('');
  const [fmtFilter,    setFmtFilter]    = useState<MeetingFormat | 'all'>('all');
  const [createOpen,   setCreateOpen]   = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [active,       setActive]       = useState<Meeting | null>(null);
  const [form,         setForm]         = useState<MeetingForm>({ ...BLANK_FORM });
  const [editForm,     setEditForm]     = useState<MeetingForm>({ ...BLANK_FORM });

  const { data: page, isLoading, refetch } = useMeetings({ page: 1, limit: 100 });
  const createM = useCreateMeeting();
  const updateM = useUpdateMeeting();
  const deleteM = useDeleteMeeting();

  const allMeetings: Meeting[] = page?.items ?? [];

  const filtered = useMemo(() =>
    allMeetings.filter(m =>
      (!search || m.title.toLowerCase().includes(search.toLowerCase())) &&
      (fmtFilter === 'all' || m.meetingFormat === fmtFilter)),
  [allMeetings, search, fmtFilter]);

  const upcoming = useMemo(() => filtered.filter(isUpcoming),          [filtered]);
  const past     = useMemo(() => filtered.filter(m => !isUpcoming(m)), [filtered]);

  const openView = (m: Meeting) => { setActive(m); setDetailOpen(true); };

  const openEdit = (m: Meeting) => {
    const tz      = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi';
    const dateStr = ((m as any).scheduledDate ?? m.date)?.split('T')[0] ?? '';
    const startStr = m.startTime
      ? (m.startTime.includes('T') ? m.startTime.split('T')[1].slice(0, 5) : m.startTime.slice(0, 5))
      : '';
    const endStr = m.endTime
      ? (m.endTime.includes('T') ? m.endTime.split('T')[1].slice(0, 5) : m.endTime.slice(0, 5))
      : '';
    setEditForm({
      title: m.title ?? '', description: m.description ?? '',
      meetingFormat: m.meetingFormat ?? 'online',
      meetingFrequency: m.meetingFrequency ?? 'once',
      meetingType: m.meetingType ?? 'regular',
      meetingPriority: m.meetingPriority ?? 'medium',
      location: m.location ?? '', onlineMeetingLink: m.onlineMeetingLink ?? '',
      date: dateStr, startTime: startStr, endTime: endStr, timezone: tz,
    });
    setActive(m);
    setEditOpen(true);
  };

  const validate = (f: MeetingForm) => {
    if (!f.title.trim()) return 'Meeting title is required';
    if (!f.date)         return 'Date is required';
    if (!f.startTime)    return 'Start time is required';
    if (!f.endTime)      return 'End time is required';
    return null;
  };

  const handleCreate = async () => {
    const err = validate(form); if (err) { toast.error(err); return; }
    try {
      const { timezone, ...rest } = form;
      await createM.mutateAsync({
        ...rest,
        date:      buildLocalISO(form.date, form.startTime),
        startTime: buildLocalISO(form.date, form.startTime),
        endTime:   buildLocalISO(form.date, form.endTime),
      });
      toast.success('Meeting scheduled');
      setCreateOpen(false); setForm({ ...BLANK_FORM }); refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to create meeting');
    }
  };

  const handleUpdate = async () => {
    if (!active) return;
    const err = validate(editForm); if (err) { toast.error(err); return; }
    const meetingId = getMeetingId(active);
    if (!meetingId) { toast.error('Meeting ID missing — cannot update'); return; }
    try {
      const { timezone, ...rest } = editForm;
      await updateM.mutateAsync({
        meetingId,
        data: {
          ...rest,
          date:      buildLocalISO(editForm.date, editForm.startTime),
          startTime: buildLocalISO(editForm.date, editForm.startTime),
          endTime:   buildLocalISO(editForm.date, editForm.endTime),
        },
      });
      toast.success('Meeting updated');
      setEditOpen(false); setActive(null); refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const meetingId = getMeetingId(deleteTarget);
    if (!meetingId) { toast.error('Meeting ID missing — cannot delete'); return; }
    try {
      await deleteM.mutateAsync(meetingId);
      toast.success('Meeting deleted');
      setDeleteTarget(null); refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to delete');
    }
  };

  const handleStartLive = (id: string) => setLocation(`/meetings/live/${id}`);

  const stats = useMemo(() => ({
    total:    allMeetings.length,
    upcoming: upcoming.length,
    today:    allMeetings.filter(m => daysUntil((m as any).scheduledDate ?? m.date).variant === 'today').length,
    past:     past.length,
  }), [allMeetings, upcoming, past]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meetings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.total} total &middot;{' '}
              <span className="text-primary font-medium">{stats.upcoming} upcoming</span>
              {stats.today > 0 && (
                <> &middot; <span className="text-emerald-600 font-medium">{stats.today} today</span></>
              )}
            </p>
          </div>
        </div>
        <Button size="lg" className="rounded-xl gap-2 shadow-sm self-start sm:self-auto"
          onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />Schedule Meeting
        </Button>
      </div>

      {/* Stat cards */}
      {allMeetings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: stats.total,    color: 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400'   },
            { label: 'Upcoming', value: stats.upcoming, color: 'bg-primary/5 border-primary/20',                                          dot: 'bg-primary'     },
            { label: 'Today',    value: stats.today,    color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200',                  dot: 'bg-emerald-500' },
            { label: 'Past',     value: stats.past,     color: 'bg-muted/50 border-border/40',                                            dot: 'bg-slate-300'   },
          ].map(({ label, value, color, dot }) => (
            <div key={label} className={`rounded-2xl border p-4 ${color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} placeholder="Search meetings…"
            className="h-9 pl-9 pr-8 text-sm rounded-xl border-border/60"
            onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={fmtFilter} onValueChange={v => setFmtFilter(v as any)}>
          <SelectTrigger className="h-9 w-44 text-sm rounded-xl border-border/60 bg-background">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="physical">In-Person</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading meetings…</span>
        </div>
      )}

      {!isLoading && (
        <Tabs defaultValue="upcoming" className="space-y-5">
          <TabsList className="h-auto p-1 bg-muted/40 rounded-xl border border-border/30 gap-1 flex-wrap sm:flex-nowrap">
            {[
              { v: 'upcoming', label: 'Upcoming', icon: TrendingUp, count: upcoming.length },
              { v: 'past',     label: 'Past',     icon: RefreshCw,  count: past.length     },
            ].map(({ v, label, icon: Icon, count }) => (
              <TabsTrigger key={v} value={v}
                className="flex-1 rounded-lg text-sm h-9 px-3 sm:px-5 font-medium data-[state=active]:shadow-sm gap-1.5">
                <Icon className="h-3.5 w-3.5" />{label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{count}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="upcoming" className="mt-2 space-y-3 focus-visible:outline-none">
            {upcoming.length === 0 ? <EmptyState isPast={false} onCreate={() => setCreateOpen(true)} /> :
              upcoming.map(m => (
                <MeetingCard key={getMeetingId(m) || m.title || 'meeting'}
                  meeting={m} onView={openView} onEdit={openEdit}
                  onDelete={m => setDeleteTarget(m)} />
              ))
            }
          </TabsContent>

          <TabsContent value="past" className="mt-2 space-y-3 focus-visible:outline-none">
            {past.length === 0 ? <EmptyState isPast={true} onCreate={() => setCreateOpen(true)} /> :
              past.map(m => (
                <MeetingCard key={getMeetingId(m) || m.title || 'meeting'}
                  meeting={m} onView={openView} onEdit={openEdit}
                  onDelete={m => setDeleteTarget(m)} />
              ))
            }
          </TabsContent>

        </Tabs>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm({ ...BLANK_FORM }); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Schedule New Meeting</DialogTitle>
            <DialogDescription>Fill in the details to create a board meeting.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <MeetingForm form={form} onChange={p => setForm(prev => ({ ...prev, ...p }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)} disabled={createM.isPending}>Cancel</Button>
            <Button className="rounded-xl gap-2 min-w-[160px]" onClick={handleCreate} disabled={createM.isPending}>
              {createM.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <><Plus className="h-4 w-4" />Schedule Meeting</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setActive(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Meeting</DialogTitle>
            <DialogDescription>Update the meeting details.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <MeetingForm form={editForm} onChange={p => setEditForm(prev => ({ ...prev, ...p }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)} disabled={updateM.isPending}>Cancel</Button>
            <Button className="rounded-xl gap-2 min-w-[140px]" onClick={handleUpdate} disabled={updateM.isPending}>
              {updateM.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Pencil className="h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <DetailDialog meeting={active} open={detailOpen}
        onClose={() => { setDetailOpen(false); setActive(null); }}
        onEdit={m => { setDetailOpen(false); openEdit(m); }}
        onDelete={m => { setDetailOpen(false); setDeleteTarget(m); }}
        onStartLive={handleStartLive} />

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Meeting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>?
              All agendas, minutes, and attendee records will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleteM.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete} disabled={deleteM.isPending}>
              {deleteM.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : 'Delete Meeting'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}