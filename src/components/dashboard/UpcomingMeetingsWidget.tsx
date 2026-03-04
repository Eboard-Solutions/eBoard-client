import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import type { Meeting as APIMeeting } from '@/types/api.types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Support both legacy and API meeting types
interface Meeting {
  id: string;
  title: string;
  startAt?: string;
  startTime?: string;
  endAt?: string;
  endTime?: string;
  location?: string;
  attendees?: string[] | { id: string; name?: string; avatar?: string }[];
  status?: string;
}

interface UpcomingMeetingsWidgetProps {
  meetings: Meeting[] | APIMeeting[];
}

export function UpcomingMeetingsWidget({ meetings }: UpcomingMeetingsWidgetProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const getMeetingStart = (meeting: Meeting): string => {
    return meeting.startAt || meeting.startTime || new Date().toISOString();
  };

  const getAttendeeCount = (meeting: Meeting): number => {
    if (!meeting.attendees) return 0;
    return Array.isArray(meeting.attendees) ? meeting.attendees.length : 0;
  };

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Upcoming Meetings</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.map((meeting) => {
          const meetingStart = getMeetingStart(meeting);
          const attendeeCount = getAttendeeCount(meeting);

          return (
            <div
              key={meeting.id}
              className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{meeting.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {getDaysUntil(meetingStart)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(meetingStart)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(meetingStart)}</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{attendeeCount}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {meetings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming meetings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}