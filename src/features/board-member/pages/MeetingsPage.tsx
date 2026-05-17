'use client';

import { useMemo, useState, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Calendar, Clock, MapPin, Search, Loader2, Monitor,
  FileText, Video, Users, Wifi, Building2,
  Layers, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  CalendarDays, X, TrendingUp, Filter, Grid3x3, List,
  Radio, Send, Zap, ExternalLink, Info,
} from 'lucide-react';

import {
  useMeetings,
  useRSVP,
  useMeetingAttendees,
  useCreateNotification,
} from '@/hooks/api';
import { authService } from '@/api/services';
import type {
  Meeting as ApiMeeting,
  MeetingAttendee,
  MeetingFormat,
  MeetingType,
  MeetingPriority,
  RSVPStatus,
} from '@/types/api.types';
import { unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';

// ─── View-model ───────────────────────────────────────────────────────────────
// The API returns lowercase statuses and uses `id` not `meetingId`, plus
// `date + startTime` instead of `scheduledAt`. We normalize to a stable
// shape so the page never has to think about backend casing again.
type MeetingView = {
  id: string;
  title: string;
  description?: string;
  startAt: Date | null;
  endAt: Date | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  meetingLink?: string;
  meetingType: MeetingType | string;
  meetingFormat?: MeetingFormat;
  meetingPriority?: MeetingPriority;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string;
  attendees: MeetingAttendee[];
  myRsvp?: RSVPStatus;
};

// Confirmed-attendance statuses. Sharing the agenda only targets these —
// no point notifying members who already declined.
const CONFIRMED_RSVP: RSVPStatus[] = ['accepted', 'attended', 'checkedIn'];

// ─── Safe helpers ─────────────────────────────────────────────────────────────

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function combineDateTime(date?: string, time?: string): Date | null {
  if (!date) return null;
  const dateOnly = date.includes('T') ? date.split('T')[0] : date.split(' ')[0];
  if (!time) {
    return safeDate(date) ?? safeDate(`${dateOnly}T00:00:00`);
  }
  const t = time.length === 5 ? `${time}:00` : time;
  return safeDate(`${dateOnly}T${t}`);
}

function normalizeStatus(s?: string): MeetingView['status'] {
  const lc = (s ?? '').toString().toLowerCase();
  if (lc === 'inprogress' || lc === 'in_progress') return 'in_progress';
  if (lc === 'scheduled') return 'scheduled';
  if (lc === 'completed') return 'completed';
  if (lc === 'cancelled') return 'cancelled';
  return lc;
}

function adaptMeeting(m: ApiMeeting, currentUserId: string | null): MeetingView {
  const rawDate = (m as any).scheduledDate ?? m.date;
  const startAt = combineDateTime(rawDate, m.startTime);
  const endAt = combineDateTime(rawDate, m.endTime);
  const attendees = Array.isArray(m.attendees) ? m.attendees : [];
  const myAttendee = currentUserId ? attendees.find((a) => a.userId === currentUserId) : undefined;
  return {
    id: m.id,
    title: m.title ?? 'Untitled meeting',
    description: m.description,
    startAt,
    endAt,
    date: rawDate,
    startTime: m.startTime,
    endTime: m.endTime,
    location: m.location,
    meetingLink: m.onlineMeetingLink,
    meetingType: (m.meetingType ?? 'regular') as MeetingType,
    meetingFormat: m.meetingFormat,
    meetingPriority: m.meetingPriority,
    status: normalizeStatus(m.status),
    attendees,
    myRsvp: myAttendee?.rsvpStatus,
  };
}

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDateLong(d: Date | null): string {
  if (!d) return 'Date to be confirmed';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: Date | null): { text: string; variant: 'today' | 'tomorrow' | 'soon' | 'past' | 'future' } {
  if (!d) return { text: '—', variant: 'future' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)   return { text: 'Past',         variant: 'past'     };
  if (diff === 0) return { text: 'Today',        variant: 'today'    };
  if (diff === 1) return { text: 'Tomorrow',     variant: 'tomorrow' };
  if (diff <= 7)  return { text: `In ${diff}d`,  variant: 'soon'     };
  return            { text: `${diff} days`,      variant: 'future'   };
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function typeBadge(type?: string) {
  const s: Record<string, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    special:   'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    annual:    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    regular:   'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  };
  const t = (type ?? 'regular').toLowerCase();
  return <Badge variant="outline" className={`text-xs capitalize ${s[t] ?? s.regular}`}>{t}</Badge>;
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

function countRsvp(m: MeetingView, s: RSVPStatus) {
  return m.attendees.filter(a => a.rsvpStatus === s).length;
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onView, onJoin }: {
  meeting: MeetingView;
  onView: (m: MeetingView) => void;
  onJoin: (id: string) => void;
}) {
  const { text: dayText, variant } = daysUntil(meeting.startAt);
  const isToday    = variant === 'today';
  const isTomorrow = variant === 'tomorrow';
  const isPast     = variant === 'past' || meeting.status === 'completed' || meeting.status === 'cancelled';

  const dateBg =
    isToday    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25' :
    isTomorrow ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-400/25'      :
    isPast     ? 'bg-muted text-muted-foreground'                                                                    :
    variant === 'soon' ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm'                        :
    'bg-muted/70 text-foreground';

  const leftBorder =
    meeting.status === 'in_progress' ? 'border-l-[3px] border-l-emerald-500' :
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

          {/* Date block */}
          <div className={`flex flex-col items-center justify-center w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl shrink-0 font-bold transition-transform duration-200 group-hover:scale-105 ${dateBg}`}>
            <span className="text-xl sm:text-2xl leading-none tabular-nums">
              {meeting.startAt ? meeting.startAt.getDate() : '?'}
            </span>
            <span className="text-[9px] uppercase mt-0.5 opacity-80 tracking-wider">
              {meeting.startAt ? meeting.startAt.toLocaleString('en-US', { month: 'short' }) : '—'}
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
                  {meeting.meetingPriority && (
                    <span className="flex items-center gap-1">
                      {priorityDot(meeting.meetingPriority)}
                      <span className="text-xs text-muted-foreground capitalize">{meeting.meetingPriority}</span>
                    </span>
                  )}
                  {meeting.status === 'in_progress' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
              </div>

              {/* Join CTA — visible for live & scheduled */}
              {(meeting.status === 'in_progress' || meeting.status === 'scheduled') && (
                <div
                  className={`flex items-center gap-2 shrink-0 transition-opacity ${
                    meeting.status === 'in_progress'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    className={`h-9 rounded-lg gap-1.5 text-xs font-semibold text-white ${
                      meeting.status === 'in_progress'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                    onClick={() => onJoin(meeting.id)}
                  >
                    {meeting.status === 'in_progress'
                      ? <Radio className="h-3.5 w-3.5" />
                      : <Video className="h-3.5 w-3.5" />}
                    {meeting.status === 'in_progress' ? 'Join now' : 'Start meeting'}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {fmtTime(meeting.startAt)} – {fmtTime(meeting.endAt)}
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[180px]">{meeting.location}</span>
                </span>
              )}
              {meeting.meetingFormat && (
                <span className="flex items-center gap-1.5">
                  {formatIcon(meeting.meetingFormat)}
                  <span className="capitalize">{meeting.meetingFormat}</span>
                </span>
              )}
            </div>

            {meeting.attendees.length > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex -space-x-1.5">
                  {meeting.attendees.slice(0, 4).map((a, i) => (
                    <Avatar key={a.userId ?? `att-${i}`} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={a.user?.profilePictureUrl} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {(a.user?.firstName?.[0] ?? '') + (a.user?.lastName?.[0] ?? '')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {meeting.attendees.length > 4 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold">
                      +{meeting.attendees.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
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

function DetailDialog({
  meeting, open, onClose, onJoin, fullAttendees, onShareAgenda, sharing, onRsvp, rsvpPending,
}: {
  meeting: MeetingView | null;
  open: boolean;
  onClose: () => void;
  onJoin: (id: string) => void;
  fullAttendees: MeetingAttendee[];
  onShareAgenda: () => void;
  sharing: boolean;
  onRsvp: (status: RSVPStatus) => void;
  rsvpPending: boolean;
}) {
  if (!meeting) return null;
  const confirmedCount = fullAttendees.filter((a) =>
    a.rsvpStatus ? CONFIRMED_RSVP.includes(a.rsvpStatus) : false,
  ).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-xl pr-8">
            {meeting.title}{typeBadge(meeting.meetingType)}
            {meeting.status === 'in_progress' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </DialogTitle>
          <DialogDescription>{meeting.description || 'No description provided.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Calendar className="h-4 w-4 mx-auto mb-1" />, label: 'Date',      value: fmtDateLong(meeting.startAt) },
              { icon: <Clock    className="h-4 w-4 mx-auto mb-1" />, label: 'Time',      value: `${fmtTime(meeting.startAt)} – ${fmtTime(meeting.endAt)}` },
              { icon: formatIcon(meeting.meetingFormat),               label: 'Format',    value: meeting.meetingFormat ?? '—' },
              { icon: <Users    className="h-4 w-4 mx-auto mb-1" />, label: 'Attendees', value: String(meeting.attendees.length) },
            ].map((item, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-muted-foreground">{item.icon}</div>
                <p className="font-semibold text-sm mt-1 capitalize">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {(meeting.location || meeting.meetingLink) && (
            <div className="flex flex-wrap gap-4 text-sm p-3 rounded-xl bg-muted/30 border border-border/40">
              {meeting.location && (
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{meeting.location}</span>
              )}
              {meeting.meetingLink && (
                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                  onClick={e => e.stopPropagation()}>
                  <ExternalLink className="h-4 w-4" />External link
                </a>
              )}
            </div>
          )}

          {meeting.status === 'scheduled' && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Your RSVP
              </p>
              <div className="flex flex-wrap gap-2">
                {(['accepted', 'tentative', 'declined'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={rsvpPending}
                    onClick={() => onRsvp(s)}
                    className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all capitalize ${
                      meeting.myRsvp === s
                        ? s === 'accepted'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : s === 'declined'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-amber-500 text-white border-amber-500'
                        : 'border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600'
                    } ${rsvpPending ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
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

          {fullAttendees.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Attendees ({fullAttendees.length})
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fullAttendees.map((att, i) => (
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
          <Button
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={onShareAgenda}
            disabled={sharing || confirmedCount === 0}
            title={confirmedCount === 0
              ? 'No confirmed attendees to share with yet'
              : `Notify ${confirmedCount} confirmed attendee${confirmedCount === 1 ? '' : 's'}`}
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sharing ? 'Sharing…' : `Share agenda${confirmedCount > 0 ? ` (${confirmedCount})` : ''}`}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
          {(meeting.status === 'in_progress' || meeting.status === 'scheduled') && (
            <Button
              className={`rounded-xl gap-1.5 text-white ${
                meeting.status === 'in_progress'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              onClick={() => onJoin(meeting.id)}
            >
              {meeting.status === 'in_progress' ? <Radio className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              Start / Join Meeting
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isPast }: { isPast: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 py-20 rounded-2xl border-2 border-dashed border-border/50 bg-muted/5">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        {isPast ? <FileText className="h-8 w-8 text-muted-foreground/30" /> : <Calendar className="h-8 w-8 text-muted-foreground/30" />}
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold">{isPast ? 'No past meetings' : 'No upcoming meetings'}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isPast ? 'Completed meetings will appear here' : 'New meetings will show up here once scheduled'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MeetingsPage() {
  const [, navigate] = useLocation();
  const { data: meetingsData, isLoading } = useMeetings({ page: 1, limit: 100 });
  const rsvpMutation = useRSVP();
  const createNotification = useCreateNotification();

  const joinLive = (meetingId: string) => navigate(`/meetings/live/${meetingId}`);

  const currentUserId = authService.getUser()?.userId ?? null;
  const meetings = useMemo<MeetingView[]>(
    () => unwrapList<ApiMeeting>(meetingsData).map((m) => adaptMeeting(m, currentUserId)),
    [meetingsData, currentUserId],
  );

  const [search, setSearch] = useState('');
  const [fmtFilter, setFmtFilter] = useState<MeetingFormat | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const selected = selectedId ? meetings.find((m) => m.id === selectedId) ?? null : null;

  const { data: attendeesRes } = useMeetingAttendees(selectedId ?? '');
  const fullAttendees = useMemo<MeetingAttendee[]>(
    () => unwrapList<MeetingAttendee>(attendeesRes),
    [attendeesRes],
  );

  const now = Date.now();

  // A meeting is "past" only if it actually ended — never just because it
  // started. COMPLETED / CANCELLED → past. IN_PROGRESS → upcoming. endAt
  // present → past iff endAt < now. Else startAt > 4h ago → past. Else
  // upcoming.
  const isMeetingPast = (m: MeetingView): boolean => {
    if (m.status === 'completed' || m.status === 'cancelled') return true;
    if (m.status === 'in_progress') return false;
    if (m.endAt)   return m.endAt.getTime()   < now;
    if (m.startAt) return m.startAt.getTime() < now - 4 * 60 * 60 * 1000;
    return false;
  };

  const filtered = useMemo(
    () =>
      meetings.filter((m) => {
        const q = search.trim().toLowerCase();
        const matchSearch =
          !q ||
          m.title.toLowerCase().includes(q) ||
          (m.location ?? '').toLowerCase().includes(q);
        const matchFmt = fmtFilter === 'all' || m.meetingFormat === fmtFilter;
        return matchSearch && matchFmt;
      }),
    [meetings, search, fmtFilter],
  );

  const upcoming = useMemo(
    () => filtered.filter((m) => !isMeetingPast(m))
      .sort((a, b) => (a.startAt?.getTime() ?? 0) - (b.startAt?.getTime() ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, now],
  );
  const past = useMemo(
    () => filtered.filter(isMeetingPast)
      .sort((a, b) => (b.startAt?.getTime() ?? 0) - (a.startAt?.getTime() ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, now],
  );

  const liveNow = useMemo(
    () => meetings.filter((m) => m.status === 'in_progress'),
    [meetings],
  );

  const stats = useMemo(() => ({
    total:    meetings.length,
    upcoming: upcoming.length,
    today:    meetings.filter((m) => daysUntil(m.startAt).variant === 'today').length,
    past:     past.length,
  }), [meetings, upcoming, past]);

  // ── Share Agenda ──────────────────────────────────────────────────────────
  const handleShareAgenda = useCallback(async () => {
    if (!selected || sharing) return;
    const recipients = fullAttendees.filter((a) =>
      a.rsvpStatus ? CONFIRMED_RSVP.includes(a.rsvpStatus) : false,
    );
    if (recipients.length === 0) {
      toast.error('No confirmed attendees to share with yet');
      return;
    }

    setSharing(true);
    const me = authService.getUser?.();
    const senderName = me ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.email || undefined : undefined;
    try {
      const results = await Promise.allSettled(
        recipients.map((r) =>
          createNotification.mutateAsync({
            title: `Agenda: ${selected.title}`,
            message: selected.description
              ? `View and contribute to the agenda. ${selected.description}`
              : 'View and contribute to the agenda for this meeting.',
            category: 'MEETING',
            priority: 'NORMAL',
            recipientId: r.userId,
            senderName,
            senderId: currentUserId ?? undefined,
            actionLabel: 'Open agenda',
            targetRoute: `/meetings/${selected.id}`,
            attachmentId: selected.id,
            attachmentType: 'MEETING',
          }),
        ),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok > 0 && failed === 0) toast.success(`Agenda shared with ${ok} attendee${ok === 1 ? '' : 's'}`);
      else if (ok > 0)            toast.warning(`Shared with ${ok} of ${results.length} — ${failed} failed`);
      else                        toast.error('Failed to share agenda');
    } finally {
      setSharing(false);
    }
  }, [selected, sharing, fullAttendees, createNotification, currentUserId]);

  // ── RSVP ──────────────────────────────────────────────────────────────────
  const handleRsvp = useCallback((status: RSVPStatus) => {
    if (!selected) return;
    rsvpMutation.mutate(
      { meetingId: selected.id, data: { status } },
      {
        onSuccess: () => toast.success(`RSVP: ${status}`),
        onError:   () => toast.error('RSVP failed'),
      },
    );
  }, [selected, rsvpMutation]);

  return (
    <MemberPortalLayout
      icon={CalendarDays}
      title="Meetings"
      color="bg-indigo-600"
      subtitle="Organisation-wide meetings with live updates and RSVP control"
    >
      <div className="space-y-6 pb-12">

        {/* Live now banner */}
        {liveNow.length > 0 && (
          <div className="rounded-[28px] border-2 border-emerald-400/60 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800/60 p-4 sm:p-5 shadow-emerald-200/50 dark:shadow-emerald-950/50 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 truncate flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {liveNow.length === 1
                    ? `${liveNow[0].title} is live now`
                    : `${liveNow.length} meetings are live now`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {liveNow.slice(0, 3).map((m) => (
                  <Button
                    key={m.id}
                    size="sm"
                    className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
                    onClick={() => joinLive(m.id)}
                  >
                    <Radio className="h-3.5 w-3.5" />
                    Join {liveNow.length === 1 ? 'now' : m.title.slice(0, 18)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stat cards */}
        {meetings.length > 0 && (
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

        {/* Filters & View Toggle */}
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
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl border border-border/30 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-9 px-3 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-9 px-3 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
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

            <TabsContent value="upcoming" className={`mt-2 focus-visible:outline-none ${
              viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'
            }`}>
              {upcoming.length === 0 ? <EmptyState isPast={false} /> :
                upcoming.map(m => (
                  <MeetingCard key={m.id} meeting={m} onView={(mv) => setSelectedId(mv.id)} onJoin={joinLive} />
                ))
              }
            </TabsContent>

            <TabsContent value="past" className={`mt-2 focus-visible:outline-none ${
              viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'
            }`}>
              {past.length === 0 ? <EmptyState isPast={true} /> :
                past.map(m => (
                  <MeetingCard key={m.id} meeting={m} onView={(mv) => setSelectedId(mv.id)} onJoin={joinLive} />
                ))
              }
            </TabsContent>
          </Tabs>
        )}

        {/* Detail */}
        <DetailDialog
          meeting={selected}
          open={!!selected}
          onClose={() => setSelectedId(null)}
          onJoin={joinLive}
          fullAttendees={fullAttendees}
          onShareAgenda={handleShareAgenda}
          sharing={sharing}
          onRsvp={handleRsvp}
          rsvpPending={rsvpMutation.isPending}
        />
      </div>
    </MemberPortalLayout>
  );
}
