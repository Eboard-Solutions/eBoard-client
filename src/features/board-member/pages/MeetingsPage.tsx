'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarDays, Clock, MapPin, Users, Video, Send, Loader2 } from 'lucide-react';
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
// single Date. Tolerates `date` already being an ISO timestamp.
function combineDateTime(date?: string, time?: string): Date | null {
  if (!date) return null;
  if (date.includes('T')) return safeDate(date);
  if (!time) return safeDate(`${date}T00:00:00`);
  // `time` can be "HH:mm" or "HH:mm:ss"
  const t = time.includes(':') ? time : `${time}:00`;
  return safeDate(`${date}T${t}`);
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
  const { data: meetingsData } = useMeetings({ page: 1, limit: 100 });
  const rsvpMutation = useRSVP();
  const createNotification = useCreateNotification();

  const currentUserId = authService.getUser()?.userId ?? null;
  const meetings = useMemo<MeetingView[]>(
    () => unwrapList<ApiMeeting>(meetingsData).map((m) => adaptMeeting(m, currentUserId)),
    [meetingsData, currentUserId],
  );

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const filtered = useMemo(
    () =>
      meetings
        .filter((m) => {
          const q = search.trim().toLowerCase();
          const matchSearch =
            !q ||
            m.title.toLowerCase().includes(q) ||
            (m.location ?? '').toLowerCase().includes(q);
          const isUpcoming =
            m.status === 'scheduled' || m.status === 'in_progress' ||
            (m.startAt ? m.startAt.getTime() >= now : false);
          return matchSearch && (tab === 'upcoming' ? isUpcoming : !isUpcoming);
        })
        .sort((a, b) => {
          const aT = a.startAt?.getTime() ?? 0;
          const bT = b.startAt?.getTime() ?? 0;
          return tab === 'upcoming' ? aT - bT : bT - aT;
        }),
    [meetings, search, tab, now],
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
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search meetings…" />
      </div>

      <div className="flex items-center gap-1 border-b border-border/60 mb-5">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title={`No ${tab} meetings`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const isToday = m.startAt && format(m.startAt, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isTomorrow = m.startAt && format(m.startAt, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');

            return (
              <div
                key={m.id}
                className={`rounded-[24px] border border-border/60 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer overflow-hidden ${
                  isToday ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/20' : ''
                }`}
                onClick={() => setSelectedId(m.id)}
              >
                <div
                  className={`h-0.5 ${
                    m.status === 'completed'
                      ? 'bg-slate-300'
                      : m.status === 'cancelled'
                        ? 'bg-red-400'
                        : 'bg-indigo-500'
                  }`}
                />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`shrink-0 rounded-xl p-2.5 text-center min-w-[52px] ${
                          isToday || isTomorrow ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'
                        }`}
                      >
                        {m.startAt ? (
                          <>
                            <p className="text-[9px] font-bold uppercase">{format(m.startAt, 'MMM')}</p>
                            <p className="text-lg font-semibold leading-none">{format(m.startAt, 'd')}</p>
                          </>
                        ) : (
                          <p className="text-[10px] font-semibold">TBD</p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.BOARD}`}>
                            {m.meetingType}
                          </span>
                          {(isToday || isTomorrow) && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                              {isToday ? 'Today' : 'Tomorrow'}
                            </span>
                          )}
                          {m.status !== 'scheduled' && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              {m.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{m.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          {m.startAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(m.startAt, 'h:mm a')}
                              {m.endAt && ` – ${format(m.endAt, 'h:mm a')}`}
                            </span>
                          )}
                          {m.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {m.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {m.attendees.length} attendees
                          </span>
                        </div>
                      </div>
                    </div>
                    {m.status === 'scheduled' && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all capitalize ${
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
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.startAt
                    ? `${format(selected.startAt, 'EEEE, MMMM d yyyy')} · ${format(selected.startAt, 'h:mm a')}${
                        selected.endAt ? ` – ${format(selected.endAt, 'h:mm a')}` : ''
                      }`
                    : 'Date to be confirmed'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                    <p className="font-medium text-sm sm:text-base">{selected.location || '—'}</p>
                  </div>
                  {selected.meetingLink && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Virtual Link</p>
                      <a
                        href={selected.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        <Video className="h-3.5 w-3.5" /> Join Meeting
                      </a>
                    </div>
                  )}
                </div>

                {/* Confirmed attendee summary — the audience for "Share
                    Agenda" — shown so the user knows who they're about to
                    notify. */}
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Confirmed attendees ({fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
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
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60"
                          >
                            {name}
                          </span>
                        );
                      })}
                    {fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        No confirmed attendees yet
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={handleShareAgenda}
                  disabled={sharing || fullAttendees.filter((a) => a.rsvpStatus && CONFIRMED_RSVP.includes(a.rsvpStatus)).length === 0}
                  className="gap-2"
                  title="Notify every confirmed attendee with a link to contribute to the agenda"
                >
                  {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sharing ? 'Sharing…' : 'Share agenda with attendees'}
                </Button>
                {selected.meetingLink && selected.status === 'in_progress' && (
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4" />
                      Join Live Meeting
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
  );
}
