import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { users, currentUser } from '@/lib/store';
import { 
  Play, Pause, Square, Clock, Users, FileText, Gavel, 
  CheckCircle, AlertCircle, ChevronRight, Save, Send,
  Plus, Trash2, Edit3, Lock, Unlock, Vote, Sparkles,
  Timer, SkipForward, SkipBack, Calendar, MapPin,
  Check, X, ThumbsUp, ThumbsDown, Hand, CircleDot
} from 'lucide-react';
import type { 
  MeetingState, AgendaItemStatus, DecisionType, ApprovalMethod,
  ActionItemStatus, MeetingDecision, AgendaItemSession,
  MeetingActionItem, LiveNote, Participant, MeetingSession,
  MeetingVote
} from '@/types';

// Mock data for live meeting
const mockParticipants: Participant[] = users.map((user, index) => ({
  id: user.id,
  odlId: user.id,
  name: user.name,
  email: user.email,
  role: index === 0 ? 'CHAIR' : index === 1 ? 'SECRETARY' : 'MEMBER',
  attendanceStatus: 'PRESENT',
  joinedAt: new Date().toISOString(),
  isPresent: true,
  canVote: index < 4,
  hasVoted: false
}));

const mockAgendaItems: AgendaItemSession[] = [
  {
    id: 'a1',
    meetingId: '1',
    title: 'Call to Order and Roll Call',
    description: 'Official call to order and verification of quorum',
    ownerId: '1',
    ownerName: 'Sarah Johnson',
    duration: 5,
    order: 1,
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    actualDuration: 5,
    notes: [],
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'a2',
    meetingId: '1',
    title: 'Approval of Previous Minutes',
    description: 'Review and approve the minutes from last meeting',
    ownerId: '4',
    ownerName: 'David Kim',
    duration: 10,
    order: 2,
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    actualDuration: 10,
    notes: [],
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'a3',
    meetingId: '1',
    title: 'Financial Report Review',
    description: 'Q4 financial performance and budget status',
    ownerId: '3',
    ownerName: 'Emily Rodriguez',
    duration: 30,
    order: 3,
    status: 'ACTIVE',
    startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    notes: [],
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'a4',
    meetingId: '1',
    title: 'Strategic Initiative Discussion',
    description: 'Discussion on new strategic initiatives for 2025',
    ownerId: '2',
    ownerName: 'Michael Chen',
    duration: 45,
    order: 4,
    status: 'PENDING',
    notes: [],
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'a5',
    meetingId: '1',
    title: 'Vote on Partnership Proposal',
    description: 'Formal vote on Tech Corp partnership',
    ownerId: '2',
    ownerName: 'Michael Chen',
    duration: 20,
    order: 5,
    status: 'PENDING',
    notes: [],
    createdAt: '',
    updatedAt: ''
  }
];

export function LiveMeeting() {
  const [match, params] = useRoute('/meetings/live/:id');
  const meetingId = params?.id || '1';
  
  const [meetingState, setMeetingState] = useState<MeetingState>('IN_PROGRESS');
  const [activeTab, setActiveTab] = useState('agenda');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [agendaItems, setAgendaItems] = useState<AgendaItemSession[]>(mockAgendaItems);
  const [activeAgendaItemId, setActiveAgendaItemId] = useState('a3');
  const [participants] = useState<Participant[]>(mockParticipants);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [liveNotes, setLiveNotes] = useState<LiveNote[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [showActionItemForm, setShowActionItemForm] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<MeetingDecision | null>(null);
  const [userVote, setUserVote] = useState<'YES' | 'NO' | 'ABSTAIN'>('YES');
  const [actionItemDueDate, setActionItemDueDate] = useState('');

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeAgendaItem = agendaItems.find(item => item.id === activeAgendaItemId);
  const activeAgendaElapsed = activeAgendaItem?.startedAt 
    ? Math.floor((Date.now() - new Date(activeAgendaItem.startedAt).getTime()) / 1000)
    : 0;
  const activeAgendaProgress = activeAgendaItem 
    ? Math.min((activeAgendaElapsed / (activeAgendaItem.duration * 60)) * 100, 100)
    : 0;

  const handleActivateAgendaItem = (itemId: string) => {
    setAgendaItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'ACTIVE' as AgendaItemStatus,
          startedAt: new Date().toISOString()
        };
      }
      if (item.status === 'ACTIVE') {
        return {
          ...item,
          status: 'COMPLETED' as AgendaItemStatus,
          endedAt: new Date().toISOString(),
          actualDuration: item.startedAt 
            ? Math.floor((Date.now() - new Date(item.startedAt).getTime()) / 60000)
            : item.duration
        };
      }
      return item;
    }));
    setActiveAgendaItemId(itemId);
  };

  const handleCompleteAgendaItem = () => {
    setAgendaItems(prev => prev.map(item => {
      if (item.id === activeAgendaItemId) {
        return {
          ...item,
          status: 'COMPLETED' as AgendaItemStatus,
          endedAt: new Date().toISOString(),
          actualDuration: item.startedAt 
            ? Math.floor((Date.now() - new Date(item.startedAt).getTime()) / 60000)
            : item.duration
        };
      }
      return item;
    }));
    // Find next pending item
    const nextItem = agendaItems.find(item => item.status === 'PENDING');
    if (nextItem) {
      handleActivateAgendaItem(nextItem.id);
    } else {
      setActiveAgendaItemId('');
    }
  };

  const handleSkipAgendaItem = () => {
    setAgendaItems(prev => prev.map(item => {
      if (item.id === activeAgendaItemId) {
        return {
          ...item,
          status: 'SKIPPED' as AgendaItemStatus,
          endedAt: new Date().toISOString()
        };
      }
      return item;
    }));
    // Find next pending item
    const nextItem = agendaItems.find(item => item.status === 'PENDING');
    if (nextItem) {
      handleActivateAgendaItem(nextItem.id);
    } else {
      setActiveAgendaItemId('');
    }
  };

  const handleCreateDecision = (decision: Partial<MeetingDecision>) => {
    const newDecision: MeetingDecision = {
      id: `decision-${Date.now()}`,
      meetingId: '1',
      decisionText: decision.decisionText || '',
      decisionType: decision.decisionType || 'MOTION',
      description: decision.description,
      approvalMethod: decision.approvalMethod || 'VOTE',
      majorityRule: decision.majorityRule || 50,
      quorumRequired: decision.quorumRequired || 4,
      quorumPresent: participants.filter(p => p.isPresent).length,
      votes: [],
      yesVotes: 0,
      noVotes: 0,
      abstentions: 0,
      result: 'PENDING',
      isLocked: false,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      actionItemIds: []
    };
    setDecisions(prev => [...prev, newDecision]);
    setShowDecisionForm(false);
  };

  const handleCastVote = () => {
    if (!selectedDecision) return;
    
    const newVote: MeetingVote = {
      id: `vote-${Date.now()}`,
      decisionId: selectedDecision.id,
      odlId: currentUser.id,
      voterName: currentUser.name,
      vote: userVote,
      votedAt: new Date().toISOString(),
      isLocked: false
    };

    setDecisions(prev => prev.map(d => {
      if (d.id === selectedDecision.id) {
        const updatedDecision = {
          ...d,
          votes: [...d.votes, newVote],
          yesVotes: userVote === 'YES' ? d.yesVotes + 1 : d.yesVotes,
          noVotes: userVote === 'NO' ? d.noVotes + 1 : d.noVotes,
          abstentions: userVote === 'ABSTAIN' ? d.abstentions + 1 : d.abstentions
        };
        
        // Check if decision should be finalized
        const totalVotes = updatedDecision.yesVotes + updatedDecision.noVotes + updatedDecision.abstentions;
        const requiredMajority = (updatedDecision.majorityRule / 100) * updatedDecision.quorumPresent;
        
        if (totalVotes >= updatedDecision.quorumPresent) {
          updatedDecision.result = updatedDecision.yesVotes >= requiredMajority ? 'APPROVED' : 'REJECTED';
        }
        
        return updatedDecision;
      }
      return d;
    }));

    setShowVoteModal(false);
    setSelectedDecision(null);
  };

  const handleCreateActionItem = (actionItem: Partial<MeetingActionItem>) => {
    const newActionItem: MeetingActionItem = {
      id: `action-${Date.now()}`,
      meetingId: '1',
      decisionId: actionItem.decisionId,
      agendaItemId: activeAgendaItemId,
      title: actionItem.title || '',
      description: actionItem.description,
      ownerId: actionItem.ownerId || '',
      ownerName: actionItem.ownerName || '',
      dueDate: actionItem.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN' as ActionItemStatus,
      priority: actionItem.priority || 'medium',
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };
    setActionItems(prev => [...prev, newActionItem]);
    setShowActionItemForm(false);
  };

  const handleSaveNote = () => {
    if (!currentNote.trim()) return;
    
    const note: LiveNote = {
      id: `note-${Date.now()}`,
      meetingId: '1',
      agendaItemId: activeAgendaItemId || undefined,
      content: currentNote,
      version: 1,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false,
      timestamp: formatTime(elapsedTime)
    };
    
    setLiveNotes(prev => [...prev, note]);
    setCurrentNote('');
  };

  const handlePauseMeeting = () => {
    setMeetingState('PAUSED');
  };

  const handleResumeMeeting = () => {
    setMeetingState('IN_PROGRESS');
  };

  const handleCompleteMeeting = () => {
    setMeetingState('COMPLETED');
  };

  const presentCount = participants.filter(p => p.isPresent).length;
  const quorumRequired = 4;
  const hasQuorum = presentCount >= quorumRequired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Q1 Strategic Planning Session</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(elapsedTime)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {presentCount} present
              </span>
              <Badge variant={hasQuorum ? 'default' : 'destructive'}>
                {hasQuorum ? 'Quorum met' : 'Quorum not met'}
              </Badge>
              <Badge variant={meetingState === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                {meetingState}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {meetingState === 'IN_PROGRESS' ? (
            <Button variant="outline" onClick={handlePauseMeeting} className="gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button onClick={handleResumeMeeting} className="gap-2">
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          <Button variant="destructive" onClick={handleCompleteMeeting} className="gap-2">
            <Square className="h-4 w-4" />
            End Meeting
          </Button>
        </div>
      </div>

      {/* Active Agenda Item Card */}
      {activeAgendaItem && (
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="gap-1">
                    <Timer className="h-3 w-3" />
                    Currently Active
                  </Badge>
                  <Badge variant="outline">
                    Item {activeAgendaItem.order} of {agendaItems.length}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold mb-1">{activeAgendaItem.title}</h2>
                <p className="text-muted-foreground text-sm mb-3">{activeAgendaItem.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Owner: {activeAgendaItem.ownerName}</span>
                  <span>Planned: {activeAgendaItem.duration} min</span>
                  <span>Elapsed: {Math.floor(activeAgendaElapsed / 60)} min {activeAgendaElapsed % 60} sec</span>
                </div>
                <Progress value={activeAgendaProgress} className="mt-3 h-2" />
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleCompleteAgendaItem} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </Button>
                <Button variant="outline" onClick={handleSkipAgendaItem} className="gap-2">
                  <SkipForward className="h-4 w-4" />
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Agenda */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agenda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {agendaItems.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    item.id === activeAgendaItemId 
                      ? 'border-primary bg-primary/5' 
                      : item.status === 'COMPLETED'
                        ? 'border-green-500/30 bg-green-500/5'
                        : item.status === 'SKIPPED'
                          ? 'border-amber-500/30 bg-amber-500/5 opacity-60'
                          : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => item.status === 'PENDING' && handleActivateAgendaItem(item.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      item.status === 'COMPLETED' 
                        ? 'bg-green-500 text-white'
                        : item.status === 'SKIPPED'
                          ? 'bg-amber-500 text-white'
                          : item.id === activeAgendaItemId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                    }`}>
                      {item.status === 'COMPLETED' ? <Check className="h-3 w-3" /> : item.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${item.status === 'SKIPPED' ? 'line-through' : ''}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.duration} min</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants ({presentCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={users.find(u => u.id === participant.odlId)?.avatar} />
                      <AvatarFallback>{participant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">{participant.role}</p>
                    </div>
                    {participant.canVote && (
                      <Badge variant="outline" className="text-xs">Vote</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="col-span-9">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="agenda">Discussion</TabsTrigger>
              <TabsTrigger value="decisions">Decisions</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="ai">AI Assist</TabsTrigger>
            </TabsList>

            <TabsContent value="agenda" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Live Discussion Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Take notes during the discussion..."
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    rows={6}
                  />
                  <div className="flex justify-between">
                    <p className="text-sm text-muted-foreground">
                      {currentNote.length} characters
                    </p>
                    <Button onClick={handleSaveNote} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="decisions" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Decisions & Resolutions</h3>
                <Dialog open={showDecisionForm} onOpenChange={setShowDecisionForm}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Decision
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Decision</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Decision Text</Label>
                        <Textarea placeholder="Enter the decision or motion..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select defaultValue="MOTION">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MOTION">Motion</SelectItem>
                              <SelectItem value="RESOLUTION">Resolution</SelectItem>
                              <SelectItem value="INFORMAL">Informal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Approval Method</Label>
                          <Select defaultValue="VOTE">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VOTE">Vote</SelectItem>
                              <SelectItem value="CONSENSUS">Consensus</SelectItem>
                              <SelectItem value="UNANIMOUS">Unanimous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea placeholder="Additional context..." />
                      </div>
                      <Button onClick={() => handleCreateDecision({})} className="w-full">
                        Create Decision
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {decisions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No decisions recorded yet</p>
                    <p className="text-sm">Create a decision to start the voting process</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <Card key={decision.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{decision.decisionType}</Badge>
                              <Badge variant={decision.result === 'APPROVED' ? 'default' : decision.result === 'REJECTED' ? 'destructive' : 'secondary'}>
                                {decision.result || 'PENDING'}
                              </Badge>
                              {decision.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <h4 className="font-semibold">{decision.decisionText}</h4>
                            {decision.description && (
                              <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              <span>Yes: {decision.yesVotes}</span>
                              <span>No: {decision.noVotes}</span>
                              <span>Abstain: {decision.abstentions}</span>
                              <span className="text-muted-foreground">Quorum: {decision.quorumRequired}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!decision.isLocked && decision.result === 'PENDING' && (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedDecision(decision);
                                  setShowVoteModal(true);
                                }}
                                className="gap-1"
                              >
                                <CircleDot className="h-3 w-3" />
                                Vote
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setShowActionItemForm(true)}
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Action
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Action Items</h3>
                <Button onClick={() => setShowActionItemForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Action
                </Button>
              </div>

              {actionItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No action items yet</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium">Action</th>
                          <th className="text-left p-4 font-medium">Owner</th>
                          <th className="text-left p-4 font-medium">Due Date</th>
                          <th className="text-left p-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionItems.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-4">
                              <p className="font-medium">{item.title}</p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              )}
                            </td>
                            <td className="p-4">{item.ownerName}</td>
                            <td className="p-4">{new Date(item.dueDate).toLocaleDateString()}</td>
                            <td className="p-4">
                              <Badge variant={item.status === 'OPEN' ? 'default' : item.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}>
                                {item.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {liveNotes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No notes recorded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {liveNotes.map((note) => (
                        <div key={note.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{note.createdByName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{note.createdByName}</span>
                              {note.timestamp && (
                                <Badge variant="outline" className="text-xs">{note.timestamp}</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2">
                      <Sparkles className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Summarize Discussion</p>
                        <p className="text-xs text-muted-foreground">Generate a summary of the current agenda item discussion</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2">
                      <FileText className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Draft Resolution</p>
                        <p className="text-xs text-muted-foreground">AI-generated draft resolution text based on discussion</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Generate Minutes</p>
                        <p className="text-xs text-muted-foreground">Auto-generate meeting minutes from all data</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2">
                      <Plus className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Extract Actions</p>
                        <p className="text-xs text-muted-foreground">Create action items from notes and decisions</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Vote Modal */}
      <Dialog open={showVoteModal} onOpenChange={setShowVoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              {selectedDecision?.decisionText}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Vote</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={userVote === 'YES' ? 'default' : 'outline'}
                  onClick={() => setUserVote('YES')}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button 
                  variant={userVote === 'NO' ? 'destructive' : 'outline'}
                  onClick={() => setUserVote('NO')}
                  className="gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
                <Button 
                  variant={userVote === 'ABSTAIN' ? 'secondary' : 'outline'}
                  onClick={() => setUserVote('ABSTAIN')}
                  className="gap-2"
                >
                  <Hand className="h-4 w-4" />
                  Abstain
                </Button>
              </div>
            </div>
            <Button onClick={handleCastVote} className="w-full">
              Submit Vote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Item Modal */}
      <Dialog open={showActionItemForm} onOpenChange={setShowActionItemForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Description</Label>
              <Textarea placeholder="What needs to be done?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={actionItemDueDate}
                  onChange={(e) => setActionItemDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select defaultValue="medium">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleCreateActionItem({})} className="w-full">
              Create Action Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LiveMeeting;
