'use client';

import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarDays, Clock, MapPin, Users, Video, Send, Loader2, Radio, ExternalLink, X, Info, Zap, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  RSVPStatus,
} from '@/types/api.types';
import { SearchBar, EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';

// View-model shape this page renders. The real API returns lowercase
// statuses (`scheduled | inProgress | completed | cancelled`) and uses
// `id` not `meetingId`, plus `date + startTime` instead of `scheduledAt`.
// The previous version of this page expected the opposite, which is why
// nothing rendered — `meetingStartValue` returned null for every record
// and the `if (!startDate) return null` guard nuked the whole list.
type MeetingView = {
  id: string;
  title: string;
  description?: string;
  startAt: Date | null;
  endAt: Date | null;
  location?: string;
  meetingLink?: string;
  meetingType: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string;
  attendees: MeetingAttendee[];
  myRsvp?: RSVPStatus;
};

function safeDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Combine date + time strings (which the API stores separately) into a
// single Date. Tolerates `date` already being an ISO timestamp, and
// `date` arriving as "YYYY-MM-DDTHH:mm:ss.sssZ" — in which case we ignore
// the embedded zero-time portion and stitch in the real time field. Before
// this hardening, any non-`T`-bearing date *without* a paired time field
// would still parse via the `T00:00:00` branch and land at midnight, which
// pushed real meetings into the past tab once midnight passed.
function combineDateTime(date?: string, time?: string): Date | null {
  if (!date) return null;
  // Strip any time portion off `date` so we can join in `time` cleanly.
  // Server stores `date` as a DATE column but sometimes serialises it as
  // a full timestamp at UTC midnight, which would otherwise drift in
  // negative-UTC timezones.
  const dateOnly = date.includes('T') ? date.split('T')[0] : date.split(' ')[0];
  if (!time) {
    // No time supplied — try the original (might be a full ISO already),
    // then fall back to local midnight on the date.
    return safeDate(date) ?? safeDate(`${dateOnly}T00:00:00`);
  }
  const t = time.length === 5 ? `${time}:00` : time; // "HH:mm" → "HH:mm:ss"
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
  const startAt = combineDateTime(m.date, m.startTime);
  const endAt = combineDateTime(m.date, m.endTime);
  const attendees = Array.isArray(m.attendees) ? m.attendees : [];
  const myAttendee = currentUserId ? attendees.find((a) => a.userId === currentUserId) : undefined;
  return {
    id: m.id,
    title: m.title ?? 'Untitled meeting',
    description: m.description,
    startAt,
    endAt,
    location: m.location,
    meetingLink: m.onlineMeetingLink,
    meetingType: (m.meetingType ?? 'BOARD').toString().toUpperCase(),
    status: normalizeStatus(m.status),
    attendees,
    myRsvp: myAttendee?.rsvpStatus,
  };
}

const TYPE_COLORS: Record<string, string> = {
  BOARD: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  COMMITTEE: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  ANNUAL: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  SPECIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  EMERGENCY: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

// Confirmed-attendance statuses. "Sharing the agenda" only targets these —
// no point notifying members who already declined.
const CONFIRMED_RSVP: RSVPStatus[] = ['accepted', 'attended', 'checkedIn'];

export function MeetingsPage() {
  const [, navigate] = useLocation();
  const { data: meetingsData } = useMeetings({ page: 1, limit: 100 });
  const rsvpMutation = useRSVP();
  const createNotification = useCreateNotification();

  const joinLive = (meetingId: string) => navigate(`/meetings/live/${meetingId}`);

  const currentUserId = authService.getUser()?.userId ?? null;
  const meetings = useMemo<MeetingView[]>(
    () => unwrapList<ApiMeeting>(meetingsData).map((m) => adaptMeeting(m, currentUserId)),
    [meetingsData, currentUserId],
  );

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredMeetingId, setHoveredMeetingId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const selected = selectedId ? meetings.find((m) => m.id === selectedId) ?? null : null;

  // Attendee list for the meeting that's open in the dialog — only fetch
  // when the dialog is actually open (`enabled` gate in the hook).
  const { data: attendeesRes } = useMeetingAttendees(selectedId ?? '');
  const fullAttendees = useMemo<MeetingAttendee[]>(
    () => unwrapList<MeetingAttendee>(attendeesRes),
    [attendeesRes],
  );

  const now = Date.now();

  // A meeting is "past" only if it actually ended — never just because it
  // started. The previous classifier looked at `startAt` and a narrow status
  // whitelist, so anything missing one of those (status came back blank, or
  // date parsing failed) was silently filed under past. This version:
  //   • COMPLETED / CANCELLED → past, full stop.
  //   • IN_PROGRESS           → upcoming (active), regardless of times.
  //   • Has `endAt`           → past iff `endAt < now`.
  //   • Else has `startAt`    → past iff started > 4h ago (cover meetings
  //                             nobody flipped to completed).
  //   • Neither time          → upcoming. Default to visible, not hidden.
  const isMeetingPast = (m: MeetingView): boolean => {
    if (m.status === 'completed' || m.status === 'cancelled') return true;
    if (m.status === 'in_progress') return false;
    if (m.endAt)   return m.endAt.getTime()   < now;
    if (m.startAt) return m.startAt.getTime() < now - 4 * 60 * 60 * 1000;
    return false;
  };

  const filtered = useMemo(
    () =>
      meetings
        .filter((m) => {
          const q = search.trim().toLowerCase();
          const matchSearch =
            !q ||
            m.title.toLowerCase().includes(q) ||
            (m.location ?? '').toLowerCase().includes(q);
          const past = isMeetingPast(m);
          return matchSearch && (tab === 'upcoming' ? !past : past);
        })
        .sort((a, b) => {
          const aT = a.startAt?.getTime() ?? 0;
          const bT = b.startAt?.getTime() ?? 0;
          return tab === 'upcoming' ? aT - bT : bT - aT;
        }),
    // `now` is recomputed each render — including it stabilises the deps
    // without making the memo more eager than the parent re-render cadence.
    [meetings, search, tab, now],
  );

  // Surface "live now" so members can jump straight into the in-platform
  // video room without having to open the dialog.
  const liveNow = useMemo(
    () => meetings.filter((m) => m.status === 'in_progress'),
    [meetings],
  );

  // Share Agenda — broadcast a notification to every attendee who has
  // confirmed they're coming. Members who declined or never responded
  // aren't notified, since the user explicitly asked that the agenda only
  // reach "members present in the meeting".
  const handleShareAgenda = async () => {
    if (!selected) return;
    if (sharing) return;

    const recipients = fullAttendees.filter((a) =>
      a.rsvpStatus ? CONFIRMED_RSVP.includes(a.rsvpStatus) : false,
    );
    if (recipients.length === 0) {
      toast.error('No confirmed attendees to share with yet');
      return;
    }

    setSharing(true);
    const senderName = (() => {
      const u = authService.getUser();
      if (!u) return undefined;
      return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || undefined;
    })();
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
      if (ok > 0 && failed === 0) {
        toast.success(`Agenda shared with ${ok} attendee${ok === 1 ? '' : 's'}`);
      } else if (ok > 0) {
        toast.warning(`Shared with ${ok} of ${results.length} — ${failed} failed`);
      } else {
        toast.error('Failed to share agenda');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <MemberPortalLayout
      icon={CalendarDays}
      title="Meetings"
      color="bg-indigo-600"
      subtitle="Organisation-wide meetings with live updates and RSVP control"
    >
      <div className="mb-6 rounded-[28px] border border-border/60 bg-card/90 p-5 sm:p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Meeting board</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">Upcoming meetings & events</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">View, RSVP, and join live meetings. Click any meeting for full details and attendee information.</p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <SearchBar value={search} onChange={setSearch} placeholder="Search meetings…" />
          </div>
        </div>
      </div>

      {liveNow.length > 0 && (
        <div className="mb-6 rounded-[28px] border-2 border-emerald-400/60 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800/60 p-4 sm:p-5 shadow-emerald-200/50 dark:shadow-emerald-950/50 shadow-sm">
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

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 border-b-2 border-border/40 flex-1">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-0.5 ${
                tab === t
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-indigo-600/30'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
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

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title={`No ${tab} meetings`} />
      ) : (
        <div className={`${
          viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'
        }`}>
          {filtered.map((m) => {
            const isToday = m.startAt && format(m.startAt, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isTomorrow = m.startAt && format(m.startAt, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');
            const isPast = m.status === 'completed' || m.status === 'cancelled';

            const dateBg =
              isToday    ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25' :
              isTomorrow ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-400/25' :
              isPast     ? 'bg-muted text-muted-foreground' :
              'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm';

            const leftBorder =
              isToday    ? 'border-l-[3px] border-l-indigo-500' :
              isTomorrow ? 'border-l-[3px] border-l-emerald-500' :
              m.status === 'cancelled' ? 'border-l-[3px] border-l-red-500' :
              '';

            return (
              <div
                key={m.id}
                className={`group relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 bg-card border border-border/60 rounded-[24px] overflow-hidden ${leftBorder}`}
                onClick={() => setSelectedId(m.id)}
                onMouseEnter={() => setHoveredMeetingId(m.id)}
                onMouseLeave={() => setHoveredMeetingId(null)}
              >
                {/* Hover overlay — big join CTA. Visible on every upcoming
                    card (live or scheduled). Stops propagation so the click
                    doesn't also trigger the card's onClick → detail dialog. */}
                {hoveredMeetingId === m.id && (m.status === 'in_progress' || m.status === 'scheduled') && (
                  <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm rounded-[24px] flex items-center justify-center z-10 animate-in fade-in duration-200">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        joinLive(m.id);
                      }}
                      className={`h-11 px-6 rounded-xl text-white gap-2.5 font-semibold shadow-lg ${
                        m.status === 'in_progress'
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-indigo-500 hover:bg-indigo-600'
                      }`}
                    >
                      {m.status === 'in_progress' ? <Radio className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                      {m.status === 'in_progress' ? 'Join Meeting Now' : 'Open Meeting Room'}
                    </Button>
                  </div>
                )}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`flex flex-col items-center justify-center w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-2xl shrink-0 font-bold transition-transform duration-200 group-hover:scale-105 ${dateBg}`}
                      >
                        {m.startAt ? (
                          <>
                            <span className="text-xl sm:text-2xl leading-none tabular-nums">
                              {format(m.startAt, 'd')}
                            </span>
                            <span className="text-[9px] uppercase mt-0.5 opacity-80 tracking-wider">
                              {format(m.startAt, 'MMM')}
                            </span>
                          </>
                        ) : (
                          <p className="text-[10px] font-semibold">TBD</p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.BOARD}`}>
                            {m.meetingType}
                          </span>
                          {isToday && (
                            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                              Today
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Tomorrow
                            </span>
                          )}
                          {m.status === 'in_progress' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-1 rounded-full uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          )}
                          {m.status === 'completed' && (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded-full uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                          {m.status === 'cancelled' && (
                            <span className="text-[11px] font-bold text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-300 px-2 py-1 rounded-full uppercase tracking-wider">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <h3 className="text-[15px] sm:text-base font-semibold leading-snug truncate group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {m.startAt && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              {format(m.startAt, 'h:mm a')} – {m.endAt ? format(m.endAt, 'h:mm a') : 'TBD'}
                            </span>
                          )}
                          {m.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[180px]">{m.location}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            {m.attendees.length} attending
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Persistent Join action — visible on every upcoming card,
                        matching the orgAdmin "Start / Join Meeting" affordance.
                        For LIVE meetings: emerald, always shown.
                        For SCHEDULED:   indigo, shown on hover so it doesn't
                                          crowd the RSVP buttons; clicking
                                          opens the room, where members wait
                                          for the host to start the session. */}
                    {(m.status === 'in_progress' || m.status === 'scheduled') && (
                      <div
                        className={`flex items-center gap-2 shrink-0 transition-opacity ${
                          m.status === 'in_progress'
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          className={`h-9 rounded-lg gap-1.5 text-xs font-semibold text-white ${
                            m.status === 'in_progress'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                          onClick={() => joinLive(m.id)}
                        >
                          {m.status === 'in_progress'
                            ? <Radio className="h-3.5 w-3.5" />
                            : <Video className="h-3.5 w-3.5" />}
                          {m.status === 'in_progress' ? 'Join now' : 'Open room'}
                        </Button>
                      </div>
                    )}
                    {m.status === 'scheduled' && (
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {(['accepted', 'tentative', 'declined'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              rsvpMutation.mutate(
                                { meetingId: m.id, data: { status: s } },
                                {
                                  onSuccess: () => toast.success(`RSVP: ${s}`),
                                  onError: () => toast.error('RSVP failed'),
                                },
                              );
                            }}
                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all capitalize ${
                              m.myRsvp === s
                                ? s === 'accepted'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : s === 'declined'
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-amber-500 text-white border-amber-500'
                                : 'border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-[28px] max-h-[85vh] overflow-y-auto gap-0 p-0 border-border/60">
          {selected && (
            <>
              <div className={`relative bg-gradient-to-br px-6 pt-6 pb-8 text-white overflow-hidden ${
                selected.status === 'in_progress'
                  ? 'from-emerald-500 to-emerald-700'
                  : selected.status === 'completed'
                    ? 'from-slate-500 to-slate-700'
                    : selected.status === 'cancelled'
                      ? 'from-rose-500 to-rose-700'
                      : 'from-indigo-500 to-indigo-700'
              }`}>
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute right-8 bottom-0 h-16 w-16 rounded-full bg-black/10 pointer-events-none" />
                <button onClick={() => setSelectedId(null)}
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4 text-white" />
                </button>
                <div className="relative">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-white/90">{selected.meetingType}</span>
                    {selected.status === 'in_progress' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        Live now
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight pr-8">{selected.title}</h2>
                  <p className="mt-2 text-white/80 text-sm">
                    {selected.startAt
                      ? `${format(selected.startAt, 'EEEE, MMMM d, yyyy')} · ${format(selected.startAt, 'h:mm a')}${
                          selected.endAt ? ` – ${format(selected.endAt, 'h:mm a')}` : ''
                        }`
                      : 'Date to be confirmed'}
                  </p>
                </div>
              </div>
              <div className="px-6 pt-5 pb-0 space-y-5">
                {selected.description && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" /> Description
                    </p>
                    <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-2xl px-4 py-3 border border-border/40">
                      {selected.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                    <p className="font-bold text-sm">{selected.location || <span className="text-muted-foreground">No location</span>}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                    <p className="font-bold text-sm capitalize">{selected.status.replace('_', ' ')}</p>
                  </div>
                </div>

                {(selected.status === 'in_progress' || selected.meetingLink) && (
                  <div className="rounded-2xl border-2 border-indigo-300/60 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Virtual</p>
                    <div className="flex items-center gap-2.5">
                      <Video className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm font-semibold text-foreground">
                        {selected.status === 'in_progress' ? 'Join live now' : 'Open meeting room'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Attendees ({selected.attendees.length}) • {fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length} confirmed
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fullAttendees
                      .filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus))
                      .slice(0, 8)
                      .map((a) => {
                        const name =
                          a.user
                            ? `${a.user.firstName ?? ''} ${a.user.lastName ?? ''}`.trim() || a.user.email
                            : a.userId;
                        return (
                          <span
                            key={a.userId}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60"
                          >
                            {name}
                          </span>
                        );
                      })}
                    {fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No confirmed attendees yet</p>
                    )}
                  </div>
                  {fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length > 8 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length - 8} more
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 border-t border-border/40 flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button
                  variant="outline"
                  onClick={handleShareAgenda}
                  disabled={sharing || fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length === 0}
                  className="gap-2 sm:flex-1 rounded-xl"
                  title="Notify every confirmed attendee with a link to contribute to the agenda"
                >
                  {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sharing ? 'Sharing…' : 'Share agenda'}
                </Button>
                {(selected.status === 'in_progress' || selected.status === 'scheduled') && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 sm:flex-1 rounded-xl"
                    onClick={() => joinLive(selected.id)}
                  >
                    {selected.status === 'in_progress' ? <Radio className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {selected.status === 'in_progress' ? 'Join now' : 'Open room'}
                  </Button>
                )}
                {selected.meetingLink && (
                  <Button variant="outline" asChild className="gap-2 sm:flex-1 rounded-xl">
                    <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      External link
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedId(null)} className="sm:flex-1 rounded-xl">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
  );
}
