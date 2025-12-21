import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { meetings, users } from '@/lib/store';
import { Calendar, Clock, MapPin, Users as UsersIcon, Plus, Filter, Search, Video } from 'lucide-react';

export function Meetings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || meeting.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const upcomingMeetings = filteredMeetings.filter(m => m.status === 'upcoming');
  const pastMeetings = filteredMeetings.filter(m => m.status === 'completed');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
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
    if (days < 0) return 'Past';
    return `In ${days} days`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground mt-1">
            Manage board meetings, agendas, and minutes
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>
                Create a new board meeting and send invitations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input id="title" placeholder="e.g., Q1 Strategic Planning" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Conference Room A or Virtual" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda Items</Label>
                <Textarea 
                  id="agenda" 
                  placeholder="Enter agenda items (one per line)"
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline">Save as Draft</Button>
                <Button>Schedule & Send Invites</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
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
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('all')}
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('upcoming')}
              >
                Upcoming
              </Button>
              <Button
                variant={selectedStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('completed')}
              >
                Past
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meetings Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.map((meeting) => {
            const attendeeAvatars = users.filter(u => meeting.attendees.includes(u.id));

            return (
              <Card key={meeting.id} className="glass hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-primary text-primary-foreground shrink-0">
                      <span className="text-2xl font-bold">
                        {new Date(meeting.startAt).getDate()}
                      </span>
                      <span className="text-xs uppercase">
                        {new Date(meeting.startAt).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>

                    {/* Meeting Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{meeting.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {getDaysUntil(meeting.startAt)}
                          </Badge>
                        </div>
                        <Button variant="outline">View Details</Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(meeting.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{meeting.location || 'TBD'}</span>
                        </div>
                      </div>

                      {/* Agenda Preview */}
                      {meeting.agenda.length > 0 && (
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

                      {/* Attendees */}
                      <div className="flex items-center gap-3 pt-2">
                        <div className="flex -space-x-2">
                          {attendeeAvatars.slice(0, 5).map((user) => (
                            <Avatar key={user.id} className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {meeting.attendees.length} attendees
                        </span>
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
          {pastMeetings.map((meeting) => (
            <Card key={meeting.id} className="glass opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-muted shrink-0">
                    <span className="text-2xl font-bold">
                      {new Date(meeting.startAt).getDate()}
                    </span>
                    <span className="text-xs uppercase">
                      {new Date(meeting.startAt).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{meeting.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(meeting.startAt)} • {formatTime(meeting.startAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">View Minutes</Button>
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
      </Tabs>
    </div>
  );
}