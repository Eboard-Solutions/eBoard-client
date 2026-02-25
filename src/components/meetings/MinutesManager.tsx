import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Download,
  FileCheck,
  ListChecks,
  Gavel,
  AlertCircle,
  Eye,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Printer
} from 'lucide-react';
import { users, meetings } from '@/lib/store';
import { Minutes, AgendaSummary, Decision, ActionItem, AttendanceRecord, NextMeetingDetails } from '@/types';

interface MinutesFormData {
  meetingId: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  attendance: AttendanceRecord[];
  approvalOfPreviousMinutes: string;
  agendaSummaries: AgendaSummary[];
  decisions: Decision[];
  actionItems: ActionItem[];
  nextMeetingDetails: NextMeetingDetails;
  attachments: string[];
  preparedBy: string;
  approvedBy: string;
}

interface MinutesManagerProps {
  meetingId?: string;
  onSave?: (data: MinutesFormData) => void;
}

const TABS = [
  { id: 'details', label: 'Details', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: Users },
  { id: 'agenda', label: 'Agenda Summaries', icon: FileText },
  { id: 'decisions', label: 'Decisions', icon: Gavel },
  { id: 'actions', label: 'Action Items', icon: ListChecks },
  { id: 'preview', label: 'Preview', icon: Eye },
];

export function MinutesManager({ meetingId, onSave }: MinutesManagerProps) {
  const meeting = meetingId ? meetings.find(m => m.id === meetingId) : null;
  
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState<MinutesFormData>({
    meetingId: meeting?.id || '',
    title: meeting?.title || '',
    date: meeting?.startAt ? new Date(meeting.startAt).toISOString().split('T')[0] : '',
    time: meeting?.startAt ? new Date(meeting.startAt).toTimeString().slice(0, 5) : '',
    endTime: meeting?.endAt ? new Date(meeting.endAt).toTimeString().slice(0, 5) : '',
    location: meeting?.location || '',
    attendance: meeting?.attendees.map(id => ({
      userId: id,
      present: true,
      role: ''
    })) || [],
    approvalOfPreviousMinutes: '',
    agendaSummaries: meeting?.agenda.map(a => ({
      id: a.id,
      topic: a.title,
      discussion: '',
      decision: '',
      presenter: a.owner
    })) || [],
    decisions: [],
    actionItems: [],
    nextMeetingDetails: {
      date: '',
      time: '',
      location: '',
      agenda: ''
    },
    attachments: [],
    preparedBy: '',
    approvedBy: ''
  });

  const currentTabIndex = TABS.findIndex(t => t.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;

  const goToNextTab = () => {
    if (!isLastTab) {
      setActiveTab(TABS[currentTabIndex + 1].id);
    }
  };

  const goToPreviousTab = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1].id);
    }
  };

  const updateAttendance = (userId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attendance: prev.attendance.map(a => 
        a.userId === userId ? { ...a, [field]: value } : a
      )
    }));
  };

  const addAgendaSummary = () => {
    setFormData(prev => ({
      ...prev,
      agendaSummaries: [
        ...prev.agendaSummaries,
        {
          id: `agenda-sum-${Date.now()}`,
          topic: '',
          discussion: '',
          decision: '',
          presenter: ''
        }
      ]
    }));
  };

  const removeAgendaSummary = (id: string) => {
    setFormData(prev => ({
      ...prev,
      agendaSummaries: prev.agendaSummaries.filter(a => a.id !== id)
    }));
  };

  const updateAgendaSummary = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      agendaSummaries: prev.agendaSummaries.map(a => 
        a.id === id ? { ...a, [field]: value } : a
      )
    }));
  };

  const addDecision = () => {
    setFormData(prev => ({
      ...prev,
      decisions: [
        ...prev.decisions,
        {
          id: `decision-${Date.now()}`,
          title: '',
          description: '',
          approvedBy: '',
          date: ''
        }
      ]
    }));
  };

  const removeDecision = (id: string) => {
    setFormData(prev => ({
      ...prev,
      decisions: prev.decisions.filter(d => d.id !== id)
    }));
  };

  const updateDecision = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      decisions: prev.decisions.map(d => 
        d.id === id ? { ...d, [field]: value } : d
      )
    }));
  };

  const addActionItem = () => {
    setFormData(prev => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        {
          id: `action-${Date.now()}`,
          action: '',
          owner: '',
          dueDate: '',
          status: 'pending'
        }
      ]
    }));
  };

  const removeActionItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter(a => a.id !== id)
    }));
  };

  const updateActionItem = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.map(a => 
        a.id === id ? { ...a, [field]: value } : a
      )
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  const presentCount = formData.attendance.filter(a => a.present).length;
  const absentCount = formData.attendance.filter(a => !a.present).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meeting Minutes</h1>
          <p className="text-muted-foreground mt-1">Create and manage meeting minutes</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Minutes
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <div key={tab.id} className="flex items-center">
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{index + 1}</span>
                    </button>
                    {index < TABS.length - 1 && (
                      <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Next/Previous Navigation */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToPreviousTab}
                disabled={isFirstTab}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentTabIndex + 1} / {TABS.length}
              </span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToNextTab}
                disabled={isLastTab}
                className="h-8 w-8"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Contents */}
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
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
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
                <Label>Location</Label>
                <Input 
                  placeholder="Conference Room A or Virtual (Zoom)"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Prepared By</Label>
                <Select 
                  value={formData.preparedBy} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, preparedBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Approved By</Label>
                <Select 
                  value={formData.approvedBy} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, approvedBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Approval of Previous Minutes</Label>
                <Select 
                  value={formData.approvalOfPreviousMinutes} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, approvalOfPreviousMinutes: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'attendance' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Attendance
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Present: {presentCount}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Absent: {absentCount}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map(user => {
                const attendance = formData.attendance.find(a => a.userId === user.id);
                const isPresent = attendance?.present ?? true;
                
                return (
                  <div 
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isPresent
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-red-500/50 bg-red-500/5'
                    }`}
                    onClick={() => updateAttendance(user.id, 'present', !isPresent)}
                  >
                    <Checkbox 
                      checked={isPresent}
                      onCheckedChange={() => updateAttendance(user.id, 'present', !isPresent)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.position || user.role}</p>
                    </div>
                    {isPresent ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">Present</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Absent</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'agenda' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Agenda Item Summaries
              </div>
              <Button variant="outline" size="sm" onClick={addAgendaSummary} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.agendaSummaries.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No agenda summaries added.</p>
                <Button onClick={addAgendaSummary} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.agendaSummaries.map((item, index) => (
                  <div key={item.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Item {index + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeAgendaSummary(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Topic</Label>
                        <Input 
                          placeholder="Topic"
                          value={item.topic}
                          onChange={(e) => updateAgendaSummary(item.id, 'topic', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Presenter</Label>
                        <Select 
                          value={item.presenter} 
                          onValueChange={(value) => updateAgendaSummary(item.id, 'presenter', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select presenter" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Discussion</Label>
                        <Textarea 
                          placeholder="Discussion points..."
                          value={item.discussion}
                          onChange={(e) => updateAgendaSummary(item.id, 'discussion', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Decision/Outcome</Label>
                        <Input 
                          placeholder="Decision or outcome"
                          value={item.decision || ''}
                          onChange={(e) => updateAgendaSummary(item.id, 'decision', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'decisions' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                Decisions & Resolutions
              </div>
              <Button variant="outline" size="sm" onClick={addDecision} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Decision
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.decisions.length === 0 ? (
              <div className="text-center py-8">
                <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No decisions recorded.</p>
                <Button onClick={addDecision} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Decision
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.decisions.map((decision, index) => (
                  <div key={decision.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary">Decision {index + 1}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeDecision(decision.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Title</Label>
                        <Input 
                          placeholder="Decision title"
                          value={decision.title}
                          onChange={(e) => updateDecision(decision.id, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea 
                          placeholder="Decision description..."
                          value={decision.description}
                          onChange={(e) => updateDecision(decision.id, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Approved By</Label>
                        <Select 
                          value={decision.approvedBy || ''} 
                          onValueChange={(value) => updateDecision(decision.id, 'approvedBy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select approver" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input 
                          type="date"
                          value={decision.date || ''}
                          onChange={(e) => updateDecision(decision.id, 'date', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'actions' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Action Items
              </div>
              <Button variant="outline" size="sm" onClick={addActionItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Action
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.actionItems.length === 0 ? (
              <div className="text-center py-8">
                <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No action items recorded.</p>
                <Button onClick={addActionItem} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Action Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Action</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Owner</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.actionItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <Input 
                            placeholder="Action description"
                            value={item.action}
                            onChange={(e) => updateActionItem(item.id, 'action', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Select 
                            value={item.owner} 
                            onValueChange={(value) => updateActionItem(item.id, 'owner', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <Input 
                            type="date"
                            value={item.dueDate}
                            onChange={(e) => updateActionItem(item.id, 'dueDate', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Select 
                            value={item.status} 
                            onValueChange={(value) => updateActionItem(item.id, 'status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <Button variant="ghost" size="icon" onClick={() => removeActionItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Next Meeting Details */}
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Meeting Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Next Meeting Date</Label>
                  <Input 
                    type="date"
                    value={formData.nextMeetingDetails.date || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      nextMeetingDetails: { ...prev.nextMeetingDetails, date: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Meeting Time</Label>
                  <Input 
                    type="time"
                    value={formData.nextMeetingDetails.time || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      nextMeetingDetails: { ...prev.nextMeetingDetails, time: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Meeting Location</Label>
                  <Input 
                    placeholder="Location"
                    value={formData.nextMeetingDetails.location || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      nextMeetingDetails: { ...prev.nextMeetingDetails, location: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agenda Highlights</Label>
                  <Input 
                    placeholder="Brief agenda highlights"
                    value={formData.nextMeetingDetails.agenda || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      nextMeetingDetails: { ...prev.nextMeetingDetails, agenda: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Full Preview */}
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Minutes Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white text-black p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
                  <h1 className="text-2xl font-bold mb-2">{formData.title || 'Meeting Minutes'}</h1>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                    {formData.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    )}
                    {formData.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formData.time} - {formData.endTime || ''}
                      </span>
                    )}
                    {formData.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {formData.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attendance */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Attendance
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-sm text-gray-600 mb-1">Present ({presentCount})</h3>
                      <ul className="list-disc list-inside text-sm">
                        {formData.attendance.filter(a => a.present).map(a => {
                          const user = users.find(u => u.id === a.userId);
                          return <li key={a.userId}>{user?.name || 'Unknown'}</li>;
                        })}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-gray-600 mb-1">Absent ({absentCount})</h3>
                      <ul className="list-disc list-inside text-sm">
                        {formData.attendance.filter(a => !a.present).map(a => {
                          const user = users.find(u => u.id === a.userId);
                          return <li key={a.userId}>{user?.name || 'Unknown'}</li>;
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Approval of Previous Minutes */}
                {formData.approvalOfPreviousMinutes && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Approval of Previous Minutes</h2>
                    <p className="text-sm capitalize">{formData.approvalOfPreviousMinutes.replace('_', ' ')}</p>
                  </div>
                )}

                {/* Agenda Summaries */}
                {formData.agendaSummaries.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Agenda Item Summaries
                    </h2>
                    {formData.agendaSummaries.map((item, index) => (
                      <div key={item.id} className="mb-4 pl-4 border-l-2 border-gray-200">
                        <h3 className="font-medium">{item.topic || `Agenda Item ${index + 1}`}</h3>
                        {item.presenter && (
                          <p className="text-sm text-gray-600">Presenter: {users.find(u => u.id === item.presenter)?.name}</p>
                        )}
                        {item.discussion && (
                          <p className="text-sm mt-1"><span className="font-medium">Discussion:</span> {item.discussion}</p>
                        )}
                        {item.decision && (
                          <p className="text-sm mt-1"><span className="font-medium">Decision:</span> {item.decision}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Decisions */}
                {formData.decisions.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Gavel className="h-4 w-4" />
                      Decisions & Resolutions
                    </h2>
                    {formData.decisions.map((decision, index) => (
                      <div key={decision.id} className="mb-3 p-3 bg-gray-50 rounded">
                        <h3 className="font-medium">{decision.title || `Decision ${index + 1}`}</h3>
                        <p className="text-sm">{decision.description}</p>
                        {decision.approvedBy && (
                          <p className="text-xs text-gray-600 mt-1">Approved by: {users.find(u => u.id === decision.approvedBy)?.name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Items */}
                {formData.actionItems.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Action Items
                    </h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Action</th>
                          <th className="text-left py-2">Owner</th>
                          <th className="text-left py-2">Due Date</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.actionItems.map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="py-2">{item.action}</td>
                            <td className="py-2">{users.find(u => u.id === item.owner)?.name || '-'}</td>
                            <td className="py-2">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                            <td className="py-2 capitalize">{item.status.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Next Meeting */}
                {(formData.nextMeetingDetails.date || formData.nextMeetingDetails.time) && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Next Meeting</h2>
                    <p className="text-sm">
                      {formData.nextMeetingDetails.date && (
                        <span>{new Date(formData.nextMeetingDetails.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      )}
                      {formData.nextMeetingDetails.time && (
                        <span> at {formData.nextMeetingDetails.time}</span>
                      )}
                      {formData.nextMeetingDetails.location && (
                        <span> - {formData.nextMeetingDetails.location}</span>
                      )}
                    </p>
                    {formData.nextMeetingDetails.agenda && (
                      <p className="text-sm text-gray-600 mt-1">Agenda: {formData.nextMeetingDetails.agenda}</p>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="border-t-2 border-gray-300 pt-4 mt-6 flex justify-between text-sm text-gray-600">
                  <div>
                    <p className="font-medium">Prepared By:</p>
                    <p>{users.find(u => u.id === formData.preparedBy)?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Approved By:</p>
                    <p>{users.find(u => u.id === formData.approvedBy)?.name || '---'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print Preview
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save Minutes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinutesManager;
