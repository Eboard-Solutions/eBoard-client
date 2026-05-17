// Upcoming-meetings list designed to nest *inside* a WidgetCard. The
// previous version wrapped itself in its own <Card> with a duplicate
// "Upcoming Meetings" header, which collided with the host card on both
// admin and member dashboards.

import { Link } from 'wouter';
import { Calendar, Clock, MapPin, Users, Video, ChevronRight } from 'lucide-react';

interface WidgetMeeting {
  id: string;
  title: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  attendees?: unknown[];
  status?: string;
  isRecurring?: boolean;
}

interface UpcomingMeetingsWidgetProps {
  meetings: WidgetMeeting[];
  /** Where individual rows link to. Defaults to the org-admin meetings page. */
  meetingsRoute?: string;
}

function safeDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtTime(s?: string): string {
  if (!s) return '—';
  if (!s.includes('T') && s.includes(':')) {
    const [h, m] = s.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return s;
  }
  const d = safeDate(s);
  if (!d) return s;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function daysUntil(s?: string): { text: string; tone: 'today' | 'tomorrow' | 'soon' | 'later' | 'past' } {
  const d = safeDate(s);
  if (!d) return { text: 'TBD', tone: 'later' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)   return { text: 'Past',         tone: 'past'    };
  if (diff === 0) return { text: 'Today',         tone: 'today'    };
  if (diff === 1) return { text: 'Tomorrow',      tone: 'tomorrow' };
  if (diff <= 7)  return { text: `In ${diff}d`,   tone: 'soon'     };
  return                 { text: `${diff}d away`, tone: 'later'    };
}

const TONE_STYLES = {
  today:    { dot: 'bg-indigo-500',   chip: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60',     dateBg: 'bg-indigo-600 text-white' },
  tomorrow: { dot: 'bg-emerald-500',  chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60', dateBg: 'bg-emerald-600 text-white' },
  soon:     { dot: 'bg-amber-500',    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',           dateBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  later:    { dot: 'bg-slate-400',    chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60',              dateBg: 'bg-muted text-foreground' },
  past:     { dot: 'bg-zinc-400',     chip: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',                       dateBg: 'bg-muted text-muted-foreground' },
} as const;

export function UpcomingMeetingsWidget({ meetings, meetingsRoute = '/meetings' }: UpcomingMeetingsWidgetProps) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Calendar className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-semibold text-foreground">No upcoming meetings</p>
        <p className="text-xs text-muted-foreground mt-1">When meetings are scheduled they'll show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meetings.map((meeting) => {
        const start = safeDate(meeting.startAt);
        const { text: dayText, tone } = daysUntil(meeting.startAt);
        const styles = TONE_STYLES[tone];
        const attendeeCount = meeting.attendees?.length ?? 0;
        const isOnline = !meeting.location || meeting.location.startsWith('http');

        return (
          <Link key={meeting.id} href={meetingsRoute} className="block">
            <article className="group flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-muted/30 transition-all duration-150">
              {/* Date tile */}
              <div className={`shrink-0 w-12 rounded-xl text-center py-1.5 ${styles.dateBg}`}>
                {start ? (
                  <>
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-90">{start.toLocaleDateString('en-US', { month: 'short' })}</p>
                    <p className="text-base font-bold leading-none mt-0.5 tabular-nums">{start.getDate()}</p>
                  </>
                ) : (
                  <p className="text-[10px] font-semibold py-1">TBD</p>
                )}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground leading-snug truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                    {meeting.title}
                  </h4>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${styles.chip}`}>
                    <span className={`h-1 w-1 rounded-full ${styles.dot}`} />
                    {dayText}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {fmtTime(meeting.startAt)}
                    {meeting.endAt && ` – ${fmtTime(meeting.endAt)}`}
                  </span>
                  {(meeting.location || isOnline) && (
                    <span className="inline-flex items-center gap-1 max-w-[140px] truncate">
                      {isOnline ? <Video className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />}
                      {isOnline ? 'Online' : meeting.location}
                    </span>
                  )}
                  {attendeeCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {attendeeCount}
                    </span>
                  )}
                  {meeting.isRecurring && (
                    <span className="text-[10px] font-medium text-indigo-600/80 dark:text-indigo-400/70 uppercase tracking-wider">recurring</span>
                  )}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </article>
          </Link>
        );
      })}

      {meetings.length === 5 && (
        <Link
          href={meetingsRoute}
          className="block text-center text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
        >
          View all meetings →
        </Link>
      )}
    </div>
  );
}

export default UpcomingMeetingsWidget;
