import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Video } from 'lucide-react';

interface WidgetMeeting {
  id: string;
  title: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  attendees?: any[];
  status?: string;
  isRecurring?: boolean;
}

interface UpcomingMeetingsWidgetProps {
  meetings: WidgetMeeting[];
}

export function UpcomingMeetingsWidget({ meetings }: UpcomingMeetingsWidgetProps) {
  function safeDate(s?: string): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(s?: string) {
    const d = safeDate(s);
    if (!d) return 'TBD';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtTime(s?: string) {
    if (!s) return '—';
    // Handle plain "HH:mm:ss" time strings
    if (!s.includes('T') && s.includes(':')) {
      const [h, m] = s.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    const d = safeDate(s);
    if (!d) return s;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function daysUntil(s?: string): { text: string; cls: string } {
    const d = safeDate(s);
    if (!d) return { text: '—', cls: 'bg-muted text-muted-foreground' };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff < 0)   return { text: 'Past',      cls: 'bg-muted text-muted-foreground'                         };
    if (diff === 0) return { text: 'Today',      cls: 'bg-primary/10 text-primary border border-primary/20'   };
    if (diff === 1) return { text: 'Tomorrow',   cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' };
    if (diff <= 7)  return { text: `In ${diff}d`,cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'        };
    return { text: `${diff}d away`, cls: 'bg-muted/60 text-muted-foreground' };
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />Upcoming Meetings
        </CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {meetings.map((meeting) => {
          const { text: dayText, cls: dayCls } = daysUntil(meeting.startAt);
          const attendeeCount = meeting.attendees?.length ?? 0;
          const isOnline = !meeting.location || meeting.location.startsWith('http');

          return (
            <div key={meeting.id}
              className="p-3.5 rounded-xl border border-border hover:bg-accent/40 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold text-sm leading-snug flex-1">{meeting.title}</h4>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${dayCls}`}>
                  {dayText}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{fmtDate(meeting.startAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{fmtTime(meeting.startAt)}
                </span>
                {meeting.location && (
                  <span className="flex items-center gap-1 max-w-[120px] truncate">
                    {isOnline ? <Video className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />}
                    {isOnline ? 'Online' : meeting.location}
                  </span>
                )}
                {attendeeCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />{attendeeCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {meetings.length === 0 && (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <Calendar className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm">No upcoming meetings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}