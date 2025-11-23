import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Meeting } from '@/types';
import { users } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UpcomingMeetingsWidgetProps {
  meetings: Meeting[];
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

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Upcoming Meetings</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.map((meeting) => {
          const attendeeCount = meeting.attendees.length;
          const attendeeAvatars = users
            .filter(u => meeting.attendees.includes(u.id))
            .slice(0, 3);

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
                      {getDaysUntil(meeting.startAt)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(meeting.startAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {attendeeAvatars.map((user) => (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'}
                    </span>
                  </div>
                </div>

                <Button size="sm" variant="outline">
                  RSVP
                </Button>
              </div>
            </div>
          );
        })}

        {meetings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No upcoming meetings
          </div>
        )}
      </CardContent>
    </Card>
  );
}