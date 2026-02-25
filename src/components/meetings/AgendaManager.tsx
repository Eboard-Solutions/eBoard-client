import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  Target,
  ClipboardList,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Download
} from 'lucide-react';
import { users, meetings, departments } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';

interface AgendaFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingType: string;
  facilitator: string;
  noteTaker: string;
  objective: string;
  attendees: string[];
  preReads: { id: string; name: string; url: string }[];
  agendaItems: {
    id: string;
    topic: string;
    owner: string;
    type: string;
    time: string;
    expectedOutcome: string;
  }[];
  parkingLot: { id: string; topic: string }[];
  decisionsSummary: string;
  nextMeeting: string;
}

interface AgendaManagerProps {
  meetingId?: string;
  onSave?: (data: AgendaFormData) => void;
}

const MEETING_TYPES = ['Board', 'Committee', 'Team', 'Emergency', 'Workshop'];
const AGENDA_ITEM_TYPES = ['Decision', 'Discussion', 'Information', 'Review', 'Vote'];

export function AgendaManager({ meetingId, onSave }: AgendaManagerProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  const meeting = meetingId ? meetings.find(m => m.id === meetingId) : null;
  
  const [formData, setFormData] = useState<AgendaFormData>({
    title: meeting?.title || '',
    date: meeting?.startAt ? new Date(meeting.startAt).toISOString().split('T')[0] : '',
    startTime: meeting?.startAt ? new Date(meeting.startAt).toTimeString().slice(0, 5) : '',
    endTime: meeting?.endAt ? new Date(meeting.endAt).toTimeString().slice(0, 5) : '',
    location: meeting?.location || '',
    meetingType: 'Board',
    facilitator: '',
    noteTaker: '',
    objective: '',
    attendees: meeting?.attendees || [],
    preReads: [],
    agendaItems: meeting?.agenda.map(a => ({
      id: a.id,
      topic: a.title,
      owner: a.owner,
      type: 'Discussion',
      time: `${a.duration} min`,
      expectedOutcome: a.description || ''
    })) || [],
    parkingLot: [],
    decisionsSummary: '',
    nextMeeting: ''
  });

  const addAgendaItem = () => {
    setFormData(prev => ({
      ...prev,
      agendaItems: [
        ...prev.agendaItems,
        {
          id: `agenda-${Date.now()}`,
          topic: '',
          owner: '',
          type: 'Discussion',
          time: '15 min',
          expectedOutcome: ''
        }
      ]
    }));
  };

  const removeAgendaItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.filter(item => item.id !== id)
    }));
  };

  const updateAgendaItem = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addPreRead = () => {
    setFormData(prev => ({
      ...prev,
      preReads: [...prev.preReads, { id: `pr-${Date.now()}`, name: '', url: '' }]
    }));
  };

  const removePreRead = (id: string) => {
    setFormData(prev => ({
      ...prev,
      preReads: prev.preReads.filter(pr => pr.id !== id)
    }));
  };

  const updatePreRead = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      preReads: prev.preReads.map(pr => 
        pr.id === id ? { ...pr, [field]: value } : pr
      )
    }));
  };

  const addParkingLotItem = () => {
    setFormData(prev => ({
      ...prev,
      parkingLot: [...prev.parkingLot, { id: `pl-${Date.now()}`, topic: '' }]
    }));
  };

  const removeParkingLotItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      parkingLot: prev.parkingLot.filter(item => item.id !== id)
    }));
  };

  const updateParkingLotItem = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      parkingLot: prev.parkingLot.map(item => 
        item.id === id ? { ...item, topic: value } : item
      )
    }));
  };

  const toggleAttendee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(userId)
        ? prev.attendees.filter(id => id !== userId)
        : [...prev.attendees, userId]
    }));
  };

  const calculateTotalTime = () => {
    return formData.agendaItems.reduce((total, item) => {
      const timeMatch = item.time.match(/(\d+)/);
      return total + (timeMatch ? parseInt(timeMatch[1]) : 0);
    }, 0);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage meeting agendas</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Agenda
          </Button>
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {['details', 'objective', 'attendees', 'agenda', 'preview'].map((tab, index) => (
              <div key={tab} className="flex items-center">
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    activeTab === tab 
                      ? 'bg-primary-foreground text-primary' 
                      : 'bg-muted'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="capitalize">{tab}</span>
                </button>
                {index < 4 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTab === 'details' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Meeting Title</Label>
              <Input 
                placeholder="e.g., Q1 Strategic Planning Session"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input 
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input 
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location / Virtual Link</Label>
                <Input 
                  placeholder="Conference Room A or Virtual (Zoom)"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select 
                  value={formData.meetingType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, meetingType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Facilitator</Label>
                <Select 
                  value={formData.facilitator} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, facilitator: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select facilitator" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note-Taker</Label>
                <Select 
                  value={formData.noteTaker} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, noteTaker: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select note-taker" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'objective' && (
        <>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Meeting Objective
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Briefly state the purpose and expected outcomes of this meeting.
              </p>
              <Textarea 
                placeholder="Enter the meeting objective and expected outcomes..."
                value={formData.objective}
                onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                rows={6}
              />
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Pre-Reads / Reference Materials
                </div>
                <Button variant="outline" size="sm" onClick={addPreRead} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.preReads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pre-reads added. Click "Add" to include reference materials.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.preReads.map((pr, index) => (
                    <div key={pr.id} className="flex gap-3 items-start">
                      <span className="text-sm font-medium text-muted-foreground mt-2.5 w-6">{index + 1}.</span>
                      <Input 
                        placeholder="Document Name"
                        className="flex-1"
                        value={pr.name}
                        onChange={(e) => updatePreRead(pr.id, 'name', e.target.value)}
                      />
                      <Input 
                        placeholder="URL (e.g., https://...)"
                        className="flex-1"
                        value={pr.url}
                        onChange={(e) => updatePreRead(pr.id, 'url', e.target.value)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removePreRead(pr.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'attendees' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Attendees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map(user => (
                <div 
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.attendees.includes(user.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => toggleAttendee(user.id)}
                >
                  <Checkbox 
                    checked={formData.attendees.includes(user.id)}
                    onCheckedChange={() => toggleAttendee(user.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.position || user.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'agenda' && (
        <>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Agenda Items
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Total: {calculateTotalTime()} min</Badge>
                  <Button variant="outline" size="sm" onClick={addAgendaItem} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.agendaItems.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No agenda items added yet.</p>
                  <Button onClick={addAgendaItem} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Agenda Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground w-10">#</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Topic</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Owner</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Time</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Expected Outcome</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.agendaItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </td>
                          <td className="py-3 px-2">
                            <Input 
                              placeholder="Topic"
                              value={item.topic}
                              onChange={(e) => updateAgendaItem(item.id, 'topic', e.target.value)}
                              className="min-w-[200px]"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Select 
                              value={item.owner} 
                              onValueChange={(value) => updateAgendaItem(item.id, 'owner', value)}
                            >
                              <SelectTrigger className="min-w-[140px]">
                                <SelectValue placeholder="Owner" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-2">
                            <Select 
                              value={item.type} 
                              onValueChange={(value) => updateAgendaItem(item.id, 'type', value)}
                            >
                              <SelectTrigger className="min-w-[120px]">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {AGENDA_ITEM_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-2">
                            <Input 
                              placeholder="Time"
                              value={item.time}
                              onChange={(e) => updateAgendaItem(item.id, 'time', e.target.value)}
                              className="min-w-[80px]"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input 
                              placeholder="Expected Outcome"
                              value={item.expectedOutcome}
                              onChange={(e) => updateAgendaItem(item.id, 'expectedOutcome', e.target.value)}
                              className="min-w-[150px]"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Button variant="ghost" size="icon" onClick={() => removeAgendaItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">P</span>
                  </div>
                  Parking Lot
                </div>
                <Button variant="outline" size="sm" onClick={addParkingLotItem} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.parkingLot.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No parking lot items. Topics deferred during the meeting can be added here.
                </p>
              ) : (
                formData.parkingLot.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <span className="text-sm font-medium text-amber-600 w-20">Deferred:</span>
                    <Input 
                      placeholder="Topic"
                      className="flex-1"
                      value={item.topic}
                      onChange={(e) => updateParkingLotItem(item.id, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeParkingLotItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'preview' && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Meeting Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Meeting Title and Basic Details */}
              <div>
                <h3 className="font-semibold text-xl">{formData.title || 'Untitled Meeting'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No date set'}
                  </span>
                  {formData.startTime && (
                    <span className="inline-flex items-center gap-1 ml-3">
                      <Clock className="h-3 w-3" />
                      {formData.startTime} - {formData.endTime || 'TBD'}
                    </span>
                  )}
                  {formData.location && (
                    <span className="inline-flex items-center gap-1 ml-3">
                      <MapPin className="h-3 w-3" />
                      {formData.location}
                    </span>
                  )}
                </p>
                {formData.meetingType && (
                  <Badge variant="secondary" className="mt-2">{formData.meetingType}</Badge>
                )}
              </div>

              {/* Facilitator and Note-Taker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Facilitator</h4>
                  <p className="text-sm">{users.find(u => u.id === formData.facilitator)?.name || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Note-Taker</h4>
                  <p className="text-sm">{users.find(u => u.id === formData.noteTaker)?.name || 'Not specified'}</p>
                </div>
              </div>

              {/* Objective */}
              {formData.objective && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Objective</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{formData.objective}</p>
                </div>
              )}

              {/* Pre-Reads */}
              {formData.preReads.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Pre-Reads / Reference Materials</h4>
                  <div className="space-y-2">
                    {formData.preReads.map((pr) => (
                      <div key={pr.id} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{pr.name || 'Unnamed document'}</span>
                        {pr.url && <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">(Link)</a>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendees */}
              {formData.attendees.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Attendees ({formData.attendees.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.attendees.map(attendeeId => {
                      const user = users.find(u => u.id === attendeeId);
                      return user ? (
                        <Badge key={attendeeId} variant="outline" className="gap-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {user.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Agenda Items */}
              {formData.agendaItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Agenda Items ({formData.agendaItems.length}) - Total: {calculateTotalTime()} minutes
                  </h4>
                  <div className="space-y-3">
                    {formData.agendaItems.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium">{item.topic || 'Untitled item'}</span>
                          </div>
                          <Badge variant="secondary">{item.time}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Owner: </span>
                            <span>{users.find(u => u.id === item.owner)?.name || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type: </span>
                            <span>{item.type}</span>
                          </div>
                          {item.expectedOutcome && (
                            <div className="md:col-span-3">
                              <span className="text-muted-foreground">Expected Outcome: </span>
                              <span>{item.expectedOutcome}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parking Lot */}
              {formData.parkingLot.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Parking Lot ({formData.parkingLot.length})
                  </h4>
                  <div className="space-y-2">
                    {formData.parkingLot.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span>{item.topic || 'Untitled topic'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions Summary */}
              {formData.decisionsSummary && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Summary of Decisions</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{formData.decisionsSummary}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Agenda
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AgendaManager;
