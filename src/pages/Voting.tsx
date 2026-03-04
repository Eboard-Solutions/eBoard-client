import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePolls, useCreatePoll, useVotePoll } from '@/hooks/api/usePolls';
import { toast } from 'sonner';
import { Vote, Clock, Plus, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { Poll, CreatePollData, PollOption } from '@/types/api.types';

// Poll display interface to normalize API response
interface PollDisplay {
  id: string;
  question: string;
  description?: string;
  status: 'active' | 'closed' | 'draft';
  options: { id: string; text: string; votes: number }[];
  anonymous: boolean;
  allowMultiple: boolean;
  requireQuorum: boolean;
  quorumPercentage?: number;
  expiresAt: string;
  hasVoted?: boolean;
}

// Local form state type (uses string options for easier form handling)
interface PollFormState {
  question?: string;
  description?: string;
  options: string[];
  anonymous?: boolean;
  multipleChoice?: boolean;
  requireQuorum?: boolean;
  quorumPercentage?: number;
  expiresAt?: string;
}

// Compute default expiry outside component to avoid impure function in render
const getDefaultExpiry = () => new Date(Date.now() + 86400000).toISOString();

export function Voting() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPoll, setNewPoll] = useState<PollFormState>({
    options: ['', '', ''],
    anonymous: false,
    multipleChoice: false,
    requireQuorum: false,
  });

  // Fetch polls from API
  const { data: pollsData, isLoading } = usePolls();
  const createPollMutation = useCreatePoll();
  const votePollMutation = useVotePoll();

  // Extract and normalize polls
  const polls: PollDisplay[] = useMemo(() => {
    const rawPolls = Array.isArray(pollsData) ? pollsData : (pollsData as { items?: Poll[] })?.items || [];
    const defaultExpiry = getDefaultExpiry();
    return rawPolls.map((poll: Poll) => ({
      id: poll.id,
      question: poll.question || '',
      description: poll.description,
      status: (poll.status?.toLowerCase() || 'active') as PollDisplay['status'],
      options: (poll.options || []).map((opt: PollOption, idx: number) => ({
        id: opt.id || `opt-${idx}`,
        text: opt.text || '',
        votes: opt.votes || 0,
      })),
      anonymous: poll.anonymous || false,
      allowMultiple: poll.multipleChoice || false,
      requireQuorum: poll.requireQuorum || false,
      quorumPercentage: poll.quorumPercentage,
      expiresAt: poll.expiresAt ? new Date(poll.expiresAt).toISOString() : defaultExpiry,
      hasVoted: false, // This would need to come from API
    }));
  }, [pollsData]);

  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  const filteredActivePolls = activePolls.filter(poll =>
    poll.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalVotes = (poll: PollDisplay) => {
    return poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  };

  const getQuorumStatus = (poll: PollDisplay) => {
    if (!poll.requireQuorum) return null;
    const totalVotes = getTotalVotes(poll);
    const requiredVotes = Math.ceil((poll.quorumPercentage || 0) / 100 * 5);
    
    return {
      reached: totalVotes >= requiredVotes,
      percentage: (totalVotes / requiredVotes) * 100,
      totalVotes,
      requiredVotes
    };
  };

  const formatTimeLeft = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft < 1) return 'Expires soon';
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `${daysLeft}d left`;
  };

  const handleCreatePoll = async () => {
    if (!newPoll.question) {
      toast.error('Please enter a question');
      return;
    }
    const validOptions = (newPoll.options || []).filter(opt => opt?.trim());
    if (validOptions.length < 2) {
      toast.error('Please add at least 2 options');
      return;
    }
    
    try {
      const pollData: CreatePollData = {
        question: newPoll.question,
        description: newPoll.description,
        options: validOptions.map(text => ({ text })),
        anonymous: newPoll.anonymous,
        multipleChoice: newPoll.multipleChoice,
        requireQuorum: newPoll.requireQuorum,
        quorumPercentage: newPoll.quorumPercentage,
        expiresAt: newPoll.expiresAt ? new Date(newPoll.expiresAt).getTime() : undefined,
      };
      await createPollMutation.mutateAsync(pollData);
      toast.success('Poll created successfully');
      setIsCreateDialogOpen(false);
      setNewPoll({ options: ['', '', ''], anonymous: false, multipleChoice: false, requireQuorum: false });
    } catch {
      toast.error('Failed to create poll');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await votePollMutation.mutateAsync({ pollId, optionId });
      toast.success('Vote cast successfully');
    } catch {
      toast.error('Failed to cast vote');
    }
  };

  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...(prev.options || []), ''],
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewPoll(prev => ({
      ...prev,
      options: (prev.options || []).map((opt, i) => i === index ? value : opt),
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading polls...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voting & Polls</h1>
          <p className="text-muted-foreground mt-1">
            Participate in board votes and view results
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
              <DialogDescription>
                Create a poll or vote for board members
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Input 
                  id="question" 
                  placeholder="What should we vote on?" 
                  value={newPoll.question || ''}
                  onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Provide context for the vote"
                  rows={3}
                  value={newPoll.description || ''}
                  onChange={(e) => setNewPoll(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {(newPoll.options || []).map((option, index) => (
                    <Input 
                      key={index}
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label htmlFor="anonymous" className="cursor-pointer">Anonymous Voting</Label>
                  <Switch 
                    id="anonymous" 
                    checked={newPoll.anonymous || false}
                    onCheckedChange={(checked) => setNewPoll(prev => ({ ...prev, anonymous: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label htmlFor="multiple" className="cursor-pointer">Multiple Choice</Label>
                  <Switch 
                    id="multiple" 
                    checked={newPoll.multipleChoice || false}
                    onCheckedChange={(checked) => setNewPoll(prev => ({ ...prev, multipleChoice: checked }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="space-y-1">
                  <Label htmlFor="quorum" className="cursor-pointer">Require Quorum</Label>
                  <p className="text-xs text-muted-foreground">Minimum percentage of votes needed</p>
                </div>
                <Switch 
                  id="quorum" 
                  checked={newPoll.requireQuorum || false}
                  onCheckedChange={(checked) => setNewPoll(prev => ({ ...prev, requireQuorum: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Voting Deadline</Label>
                <Input 
                  id="expires" 
                  type="datetime-local" 
                  value={newPoll.expiresAt || ''}
                  onChange={(e) => setNewPoll(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePoll} disabled={createPollMutation.isPending}>
                  {createPollMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create & Publish'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search polls..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Polls Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            Active Polls ({activePolls.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedPolls.length})
          </TabsTrigger>
          <TabsTrigger value="results">Results & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filteredActivePolls.map((poll) => {
            const totalVotes = getTotalVotes(poll);
            const quorumStatus = getQuorumStatus(poll);
            const hasVoted = poll.hasVoted || false;

            return (
              <Card key={poll.id} className="glass">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{poll.question}</CardTitle>
                      {poll.description && (
                        <p className="text-sm text-muted-foreground">{poll.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeLeft(poll.expiresAt)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Voting Options */}
                  <div className="space-y-3">
                    {poll.options.map((option) => {
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                      
                      return (
                        <div
                          key={option.id}
                          onClick={() => !hasVoted && handleVote(poll.id, option.id)}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            hasVoted 
                              ? 'border-border cursor-default' 
                              : 'border-border hover:border-primary cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{option.text}</span>
                            <span className="text-sm text-muted-foreground">
                              {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Poll Info */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{totalVotes} total votes</span>
                      {poll.anonymous && <Badge variant="outline">Anonymous</Badge>}
                      {quorumStatus && (
                        <div className="flex items-center gap-2">
                          <span>Quorum: {quorumStatus.totalVotes}/{quorumStatus.requiredVotes}</span>
                          {quorumStatus.reached ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {!hasVoted ? (
                      <Button>
                        <Vote className="h-4 w-4 mr-2" />
                        Cast Vote
                      </Button>
                    ) : (
                      <Badge variant="default">Voted</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredActivePolls.length === 0 && (
            <Card className="glass">
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Vote className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No active polls</p>
                  <p className="text-sm">Create a new poll to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="closed">
          <Card className="glass">
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                <Vote className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No closed polls</p>
                <p className="text-sm">Completed polls will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="glass">
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                <Vote className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Results & Analytics</p>
                <p className="text-sm">Comprehensive voting analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}