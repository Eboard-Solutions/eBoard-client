import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, MapPin, Plus, Search, Loader2 } from 'lucide-react';

// Import React Query hooks
import { useMeetings, useCreateMeeting } from '@/hooks/api/useMeetings';
import type { CreateMeetingData, MeetingFormat, MeetingType, MeetingPriority, MeetingFrequency } from '@/types/api.types';

export function Meetings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state for creating meetings
  const [newMeeting, setNewMeeting] = useState<Partial<CreateMeetingData>>({
    title: '',
    description: '',
    meetingFormat: 'online',
    meetingFrequency: 'once',
    meetingType: 'regular',
    meetingPriority: 'medium',
    location: '',
    onlineMeetingLink: '',
    date: '',
    startTime: '',
    endTime: '',
  });

  // Fetch data from API
  const { data: meetingsData, isLoading, error } = useMeetings({ page: 1, limit: 50 });
  const createMeetingMutation = useCreateMeeting();

  const meetings = meetingsData?.items || [];

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || meeting.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const upcomingMeetings = filteredMeetings.filter(m => 
    m.status === 'scheduled' || (m.date && new Date(m.date) > new Date())
  );
  const pastMeetings = filteredMeetings.filter(m => 
    m.status === 'completed' || (m.date && new Date(m.date) < new Date())
  );

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

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.startTime || !newMeeting.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createMeetingMutation.mutateAsync({
        title: newMeeting.title,
        description: newMeeting.description || '',
        meetingFormat: (newMeeting.meetingFormat || 'online') as MeetingFormat,
        meetingFrequency: (newMeeting.meetingFrequency || 'once') as MeetingFrequency,
        meetingType: (newMeeting.meetingType || 'regular') as MeetingType,
        meetingPriority: (newMeeting.meetingPriority || 'medium') as MeetingPriority,
        location: newMeeting.location || '',
        onlineMeetingLink: newMeeting.onlineMeetingLink || '',
        date: newMeeting.date,
        startTime: new Date(`${newMeeting.date}T${newMeeting.startTime}`).toISOString(),
        endTime: new Date(`${newMeeting.date}T${newMeeting.endTime}`).toISOString(),
      });
      toast.success('Meeting scheduled successfully!');
      setIsCreateDialogOpen(false);
      setNewMeeting({
        title: '',
        description: '',
        meetingFormat: 'online',
        meetingFrequency: 'once',
        meetingType: 'regular',
        meetingPriority: 'medium',
        location: '',
        onlineMeetingLink: '',
        date: '',
        startTime: '',
        endTime: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create meeting');
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold text-destructive">Error loading meetings</h2>
        <p className="mt-2 text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

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
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                <Label htmlFor="title">Meeting Title *</Label>
                <Input 
                  id="title" 
                  placeholder="e.g., Q1 Strategic Planning" 
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingType">Meeting Type</Label>
                  <Select 
                    value={newMeeting.meetingType}
                    onValueChange={(value) => setNewMeeting({ ...newMeeting, meetingType: value as MeetingType })}
                  >
                    <SelectTrigger id="meetingType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input 
                    id="startTime" 
                    type="time" 
                    value={newMeeting.startTime}
                    onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input 
                    id="endTime" 
                    type="time" 
                    value={newMeeting.endTime}
                    onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meetingFormat">Format</Label>
                  <Select 
                    value={newMeeting.meetingFormat}
                    onValueChange={(value) => setNewMeeting({ ...newMeeting, meetingFormat: value as MeetingFormat })}
                  >
                    <SelectTrigger id="meetingFormat">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingPriority">Priority</Label>
                  <Select 
                    value={newMeeting.meetingPriority}
                    onValueChange={(value) => setNewMeeting({ ...newMeeting, meetingPriority: value as MeetingPriority })}
                  >
                    <SelectTrigger id="meetingPriority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  placeholder="Conference Room A" 
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="onlineMeetingLink">Online Meeting Link</Label>
                <Input 
                  id="onlineMeetingLink" 
                  placeholder="https://zoom.us/j/..." 
                  value={newMeeting.onlineMeetingLink}
                  onChange={(e) => setNewMeeting({ ...newMeeting, onlineMeetingLink: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Meeting description and agenda items..."
                  rows={4}
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateMeeting}
                  disabled={createMeetingMutation.isPending}
                >
                  {createMeetingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Schedule Meeting'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading meetings...</span>
        </div>
      )}

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
            return (
              <Card key={meeting.id} className="glass hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-primary text-primary-foreground shrink-0">
                      <span className="text-2xl font-bold">
                        {new Date(meeting.date || meeting.startTime).getDate()}
                      </span>
                      <span className="text-xs uppercase">
                        {new Date(meeting.date || meeting.startTime).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>

                    {/* Meeting Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{meeting.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {getDaysUntil(meeting.date || meeting.startTime)}
                          </Badge>
                        </div>
                        <Button variant="outline">View Details</Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(meeting.date || meeting.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{meeting.location || 'TBD'}</span>
                        </div>
                      </div>

                      {/* Meeting Info */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {meeting.meetingType}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {meeting.meetingFormat}
                        </Badge>
                        {meeting.meetingPriority === 'high' || meeting.meetingPriority === 'urgent' ? (
                          <Badge variant="destructive" className="text-xs capitalize">
                            {meeting.meetingPriority}
                          </Badge>
                        ) : null}
                      </div>

                      {/* Attendees */}
                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex -space-x-2">
                            {meeting.attendees.slice(0, 5).map((attendee) => (
                              <Avatar key={attendee.userId} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={attendee.user?.profilePictureUrl} alt={attendee.user?.firstName} />
                                <AvatarFallback>
                                  {attendee.user?.firstName?.[0]}{attendee.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {meeting.attendees.length} attendees
                          </span>
                        </div>
                      )}
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
                      {new Date(meeting.date || meeting.startTime).getDate()}
                    </span>
                    <span className="text-xs uppercase">
                      {new Date(meeting.date || meeting.startTime).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{meeting.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(meeting.date || meeting.startTime)} • {formatTime(meeting.startTime)}
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