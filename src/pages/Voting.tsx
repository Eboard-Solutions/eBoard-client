import { useState, useMemo, useEffect } from 'react';
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
import { useOrganisationUsers } from '@/hooks/api/useUsers';
import { authService } from '@/api/services';
import { toast } from 'sonner';
import {
  Vote,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  TrendingUp,
  Trophy,
  Sparkles,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { Poll, CreatePollData, PollOption } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PollDisplay {
  id: string;
  question: string;
  description?: string;
  status: 'active' | 'closed' | 'draft';
  options: { id: string; text: string; votes: number; voterIds: string[] }[];
  anonymous: boolean;
  allowMultiple: boolean;
  requireQuorum: boolean;
  quorumPercentage?: number;
  expiresAt: number | undefined;
  hasVoted: boolean;
  votedOptionIds: string[];
  totalVotes: number;
  createdAt?: string;
}

interface PollFormState {
  question: string;
  description: string;
  options: string[];
  anonymous: boolean;
  multipleChoice: boolean;
  requireQuorum: boolean;
  quorumPercentage: number;
  expiresAt: string; // datetime-local "YYYY-MM-DDTHH:mm"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Default poll deadline = 24h from now, in the local-time format
// expected by <input type="datetime-local"> (no timezone suffix).
function defaultExpiryLocal(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): PollFormState {
  return {
    question: '',
    description: '',
    options: ['', ''],
    anonymous: false,
    multipleChoice: false,
    requireQuorum: false,
    quorumPercentage: 50,
    expiresAt: defaultExpiryLocal(),
  };
}

// Unwrap whatever shape the polls hook returns:
//   { data: { data: Poll[] } }       (axios passthrough)
//   { data: Poll[] }                 (ResponseObject)
//   Poll[]                           (already unwrapped)
//   { items: Poll[] }                (paginated wrapper)
function unwrapPolls(res: unknown): Poll[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as Poll[];
  const r = res as Record<string, unknown>;
  const d = r.data ?? r;
  if (Array.isArray(d)) return d as Poll[];
  const dd = d as Record<string, unknown>;
  if (Array.isArray(dd?.data)) return dd.data as Poll[];
  if (Array.isArray(dd?.items)) return dd.items as Poll[];
  return [];
}

function unwrapUsers(res: unknown): unknown[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  const d = r.data ?? r;
  if (Array.isArray(d)) return d;
  const dd = d as Record<string, unknown>;
  if (Array.isArray(dd?.data)) return dd.data as unknown[];
  return [];
}

function isExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  return expiresAt < Date.now();
}

function formatTimeLeft(expiresAt: number | undefined, status: PollDisplay['status']): string {
  if (status === 'closed') return 'Closed';
  if (!expiresAt) return 'No deadline';
  const ms = expiresAt - Date.now();
  if (ms < 0) return 'Expired';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Expires soon';
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `${days}d left`;
}

function formatExpiresOn(expiresAt?: number): string {
  if (!expiresAt) return '—';
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Browser uuid generator with a fallback for very old browsers / non-secure
// contexts where `crypto.randomUUID` isn't available.
function makeId(): string {
  const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Auxiliary components (declared up-front so Vite/Fast-Refresh always
//     has them in scope when <Voting /> renders) ─────────────────────────

function PollSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-muted/60 animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-muted/40 animate-pulse" />
                </div>
                <div className="h-6 w-3/4 rounded-md bg-muted/60 animate-pulse" />
                <div className="h-4 w-1/2 rounded-md bg-muted/40 animate-pulse" />
              </div>
              <div className="h-5 w-20 rounded-full bg-muted/40 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="rounded-lg border-2 border-border p-3.5 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-1/3 rounded bg-muted/50 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-muted/40 animate-pulse" />
                </div>
                <div className="h-2 w-full rounded-full bg-muted/30 animate-pulse" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="glass">
      <CardContent className="p-12 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
        <p className="text-lg font-semibold">Couldn't load polls</p>
        <p className="text-sm text-muted-foreground mb-4">
          Check your connection and try again.
        </p>
        <Button onClick={onRetry}>Retry</Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Voting() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'closed' | 'results'>('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPoll, setNewPoll] = useState<PollFormState>(emptyForm);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  const currentUser = authService.getUser();
  const currentUserId = currentUser?.userId ?? '';

  const { data: pollsRes, isLoading, isError, refetch } = usePolls();
  const { data: usersRes } = useOrganisationUsers();
  const createPollMutation = useCreatePoll();
  const votePollMutation = useVotePoll();

  const totalMembers = useMemo(() => {
    const list = unwrapUsers(usersRes);
    return Math.max(list.length, 1);
  }, [usersRes]);

  // Force a re-render once a minute so countdowns ("3h left") stay accurate
  // without spamming the network. The actual data still refreshes via the
  // 60-second react-query interval in usePolls. We only keep this timer alive
  // when there's at least one poll with a deadline that hasn't passed yet.
  const [, setTick] = useState(0);
  const hasLiveCountdown = useMemo(() => {
    const list = unwrapPolls(pollsRes);
    return list.some(
      (p) => typeof p.expiresAt === 'number' && p.expiresAt > Date.now(),
    );
  }, [pollsRes]);
  useEffect(() => {
    if (!hasLiveCountdown) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [hasLiveCountdown]);

  const polls: PollDisplay[] = useMemo(() => {
    const raw = unwrapPolls(pollsRes);
    return raw.map((poll: Poll) => {
      const options = (poll.options || []).map((opt: PollOption, idx: number) => {
        const voterIds = Array.isArray(opt.voterIds) ? opt.voterIds : [];
        return {
          id: opt.id || `opt-${idx}`,
          text: opt.text || '',
          votes: typeof opt.votes === 'number' ? opt.votes : voterIds.length,
          voterIds,
        };
      });

      const votedOptionIds = currentUserId
        ? options.filter((o) => o.voterIds.includes(currentUserId)).map((o) => o.id)
        : [];

      const expiresAt = typeof poll.expiresAt === 'number' ? poll.expiresAt : undefined;
      const apiStatus = (poll.status ?? '').toString().toUpperCase();
      const computedStatus: PollDisplay['status'] =
        apiStatus === 'CLOSED' || apiStatus === 'CANCELLED'
          ? 'closed'
          : apiStatus === 'DRAFT'
            ? 'draft'
            : isExpired(expiresAt)
              ? 'closed'
              : 'active';

      return {
        id: poll.id,
        question: poll.question || '',
        description: poll.description,
        status: computedStatus,
        options,
        anonymous: poll.anonymous || false,
        allowMultiple: poll.multipleChoice || false,
        requireQuorum: poll.requireQuorum || false,
        quorumPercentage: poll.quorumPercentage,
        expiresAt,
        hasVoted: votedOptionIds.length > 0,
        votedOptionIds,
        totalVotes: options.reduce((s, o) => s + o.votes, 0),
        createdAt: poll.createdAt,
      };
    });
  }, [pollsRes, currentUserId]);

  const activePolls = polls.filter((p) => p.status === 'active');
  const closedPolls = polls.filter((p) => p.status === 'closed');
  const myVoteCount = polls.filter((p) => p.hasVoted).length;
  const turnoutAvg = useMemo(() => {
    if (polls.length === 0) return 0;
    const ratios = polls.map((p) => p.totalVotes / totalMembers);
    return Math.min(100, Math.round((ratios.reduce((s, r) => s + r, 0) / polls.length) * 100));
  }, [polls, totalMembers]);

  const filterByQuery = (list: PollDisplay[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.question.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q),
    );
  };

  const filteredActive = filterByQuery(activePolls);
  const filteredClosed = filterByQuery(closedPolls);

  const getQuorumStatus = (poll: PollDisplay) => {
    if (!poll.requireQuorum) return null;
    const pct = poll.quorumPercentage || 0;
    const requiredVotes = Math.max(1, Math.ceil((pct / 100) * totalMembers));
    const reached = poll.totalVotes >= requiredVotes;
    return {
      reached,
      percentage: Math.min(100, (poll.totalVotes / requiredVotes) * 100),
      totalVotes: poll.totalVotes,
      requiredVotes,
    };
  };

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const handleCreatePoll = async () => {
    const question = newPoll.question.trim();
    if (!question) {
      toast.error('Please enter a question');
      return;
    }
    const validOptions = newPoll.options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      toast.error('Please add at least 2 options');
      return;
    }
    if (newPoll.requireQuorum) {
      const q = newPoll.quorumPercentage;
      if (!Number.isFinite(q) || q < 1 || q > 100) {
        toast.error('Quorum must be between 1% and 100%');
        return;
      }
    }
    // Backend requires expiresAt — refuse to submit without one and surface a
    // friendly error so we don't waste a round-trip on a 400.
    if (!newPoll.expiresAt) {
      toast.error('Please choose a voting deadline');
      return;
    }
    const parsed = new Date(newPoll.expiresAt).getTime();
    if (!Number.isFinite(parsed)) {
      toast.error('Invalid voting deadline');
      return;
    }
    if (parsed <= Date.now()) {
      toast.error('Deadline must be in the future');
      return;
    }
    const expiresAtMs = parsed;

    try {
      const pollData: CreatePollData = {
        question,
        description: newPoll.description.trim() || undefined,
        // Backend's PollOption DTO requires both `id` and `text` to be
        // non-empty — sending `{ text }` alone fails validation with 400.
        options: validOptions.map((text) => ({
          id: makeId(),
          text,
          votes: 0,
          voterIds: [],
        })),
        anonymous: newPoll.anonymous,
        multipleChoice: newPoll.multipleChoice,
        requireQuorum: newPoll.requireQuorum,
        quorumPercentage: newPoll.requireQuorum ? newPoll.quorumPercentage : undefined,
        expiresAt: expiresAtMs,
        status: 'ACTIVE',
      };
      await createPollMutation.mutateAsync(pollData);
      toast.success('Poll published');
      setIsCreateDialogOpen(false);
      setNewPoll(emptyForm());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create poll';
      toast.error(msg);
    }
  };

  const handleVote = async (poll: PollDisplay, optionId: string) => {
    if (poll.status !== 'active') return;
    if (isExpired(poll.expiresAt)) {
      toast.error('This poll has already expired');
      return;
    }
    if (!poll.allowMultiple && poll.votedOptionIds.includes(optionId)) {
      toast.info('You already voted for this option');
      return;
    }
    setVotingOptionId(optionId);
    try {
      await votePollMutation.mutateAsync({ pollId: poll.id, optionId });
      toast.success('Vote cast successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cast vote';
      toast.error(msg);
    } finally {
      setVotingOptionId(null);
    }
  };

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const addOption = () =>
    setNewPoll((p) => ({ ...p, options: [...p.options, ''] }));

  const removeOption = (index: number) =>
    setNewPoll((p) => ({
      ...p,
      options: p.options.length <= 2 ? p.options : p.options.filter((_, i) => i !== index),
    }));

  const updateOption = (index: number, value: string) =>
    setNewPoll((p) => ({
      ...p,
      options: p.options.map((opt, i) => (i === index ? value : opt)),
    }));

  // ─── Render ────────────────────────────────────────────────────────────────
  // We deliberately do NOT block the entire page on `isLoading`. The header,
  // stats, search, and tabs render instantly with skeleton placeholders inside
  // the list area — so the page feels snappy even when the polls API is slow
  // or the user is on a cold cache.

  const stats: Array<{ label: string; value: string | number; icon: typeof Vote; tone: string }> = [
    { label: 'Active Polls', value: activePolls.length, icon: Vote, tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Closed Polls', value: closedPolls.length, icon: Trophy, tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
    { label: 'My Votes',     value: myVoteCount,        icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Avg. Turnout', value: `${turnoutAvg}%`,    icon: TrendingUp, tone: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Vote className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Voting & Polls</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Participate in board votes and view live results.
            </p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 shadow-md">
              <Plus className="h-5 w-5" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create New Poll
              </DialogTitle>
              <DialogDescription>
                Compose a poll for the board. Members will be notified when it's published.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="question">Question <span className="text-destructive">*</span></Label>
                <Input
                  id="question"
                  placeholder="What should we vote on?"
                  value={newPoll.question}
                  onChange={(e) => setNewPoll((p) => ({ ...p, question: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide context for the vote"
                  rows={3}
                  value={newPoll.description}
                  onChange={(e) => setNewPoll((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options <span className="text-destructive">*</span></Label>
                  <span className="text-xs text-muted-foreground">{newPoll.options.length} options</span>
                </div>
                <div className="space-y-2">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6 text-center tabular-nums">
                        {index + 1}.
                      </span>
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={newPoll.options.length <= 2}
                        onClick={() => removeOption(index)}
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={addOption} type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <Label htmlFor="anonymous" className="cursor-pointer">Anonymous</Label>
                    <p className="text-xs text-muted-foreground">Hide voter identities</p>
                  </div>
                  <Switch
                    id="anonymous"
                    checked={newPoll.anonymous}
                    onCheckedChange={(checked) => setNewPoll((p) => ({ ...p, anonymous: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <Label htmlFor="multiple" className="cursor-pointer">Multiple choice</Label>
                    <p className="text-xs text-muted-foreground">Pick more than one</p>
                  </div>
                  <Switch
                    id="multiple"
                    checked={newPoll.multipleChoice}
                    onCheckedChange={(checked) => setNewPoll((p) => ({ ...p, multipleChoice: checked }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quorum" className="cursor-pointer">Require Quorum</Label>
                    <p className="text-xs text-muted-foreground">
                      Minimum % of {totalMembers} members needed to validate the result.
                    </p>
                  </div>
                  <Switch
                    id="quorum"
                    checked={newPoll.requireQuorum}
                    onCheckedChange={(checked) => setNewPoll((p) => ({ ...p, requireQuorum: checked }))}
                  />
                </div>
                {newPoll.requireQuorum && (
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={newPoll.quorumPercentage}
                      onChange={(e) =>
                        setNewPoll((p) => ({
                          ...p,
                          quorumPercentage: Math.max(1, Math.min(100, Number(e.target.value) || 0)),
                        }))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      = {Math.max(1, Math.ceil((newPoll.quorumPercentage / 100) * totalMembers))} of {totalMembers} votes
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Voting Deadline</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={newPoll.expiresAt}
                  onChange={(e) => setNewPoll((p) => ({ ...p, expiresAt: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Poll closes automatically after this time. Defaults to 24h from now.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePoll} disabled={createPollMutation.isPending}>
                  {createPollMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing…
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

      {/* ─── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Search ──────────────────────────────────────────────────── */}
      <Card className="glass">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search polls by question or description…"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            Active <span className="ml-1.5 text-xs opacity-70">({filteredActive.length})</span>
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed <span className="ml-1.5 text-xs opacity-70">({filteredClosed.length})</span>
          </TabsTrigger>
          <TabsTrigger value="results">Results & Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Active polls ─────────────────────────────── */}
        <TabsContent value="active" className="space-y-4">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <PollSkeletonList />
          ) : filteredActive.length === 0 ? (
            <EmptyState
              icon={Vote}
              title={searchQuery ? 'No matches' : 'No active polls'}
              hint={searchQuery ? 'Try a different search.' : 'Create a new poll to get started.'}
            />
          ) : (
            filteredActive.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={(optionId) => handleVote(poll, optionId)}
                isVoting={votePollMutation.isPending && votingOptionId !== null}
                votingOptionId={votingOptionId}
                quorumStatus={getQuorumStatus(poll)}
                totalMembers={totalMembers}
              />
            ))
          )}
        </TabsContent>

        {/* ─── Closed polls ─────────────────────────────── */}
        <TabsContent value="closed" className="space-y-4">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <PollSkeletonList count={1} />
          ) : filteredClosed.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title={searchQuery ? 'No matches' : 'No closed polls'}
              hint={
                searchQuery
                  ? 'Try a different search.'
                  : 'Polls move here once they expire or are closed.'
              }
            />
          ) : (
            filteredClosed.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={() => undefined}
                isVoting={false}
                votingOptionId={null}
                quorumStatus={getQuorumStatus(poll)}
                totalMembers={totalMembers}
              />
            ))
          )}
        </TabsContent>

        {/* ─── Results & analytics ──────────────────────── */}
        <TabsContent value="results">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <PollSkeletonList count={2} />
          ) : (
            <ResultsPanel
              polls={polls}
              totalMembers={totalMembers}
              myVoteCount={myVoteCount}
              turnoutAvg={turnoutAvg}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

interface QuorumStatus {
  reached: boolean;
  percentage: number;
  totalVotes: number;
  requiredVotes: number;
}

interface PollCardProps {
  poll: PollDisplay;
  onVote: (optionId: string) => void;
  isVoting: boolean;
  votingOptionId: string | null;
  quorumStatus: QuorumStatus | null;
  totalMembers: number;
}

function PollCard({ poll, onVote, isVoting, votingOptionId, quorumStatus, totalMembers }: PollCardProps) {
  const { totalVotes, status, hasVoted } = poll;
  const winner = status === 'closed' && totalVotes > 0
    ? poll.options.reduce((best, o) => (o.votes > best.votes ? o : best))
    : null;
  const turnout = totalMembers > 0 ? Math.min(100, Math.round((totalVotes / totalMembers) * 100)) : 0;

  return (
    <Card className="glass overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant={status === 'active' ? 'default' : status === 'closed' ? 'secondary' : 'outline'}
                className="capitalize"
              >
                {status}
              </Badge>
              {poll.allowMultiple && <Badge variant="outline" className="text-xs">Multi-select</Badge>}
              {poll.anonymous && <Badge variant="outline" className="text-xs">Anonymous</Badge>}
              {hasVoted && (
                <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Voted
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl leading-tight">{poll.question}</CardTitle>
            {poll.description && (
              <p className="text-sm text-muted-foreground mt-1.5">{poll.description}</p>
            )}
          </div>
          <Badge
            variant={status === 'closed' || isExpired(poll.expiresAt) ? 'destructive' : 'secondary'}
            className="shrink-0 gap-1"
          >
            <Clock className="h-3 w-3" />
            {formatTimeLeft(poll.expiresAt, status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Options */}
        <div className="space-y-2.5">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            const youVoted = poll.votedOptionIds.includes(option.id);
            const isThisVoting = isVoting && votingOptionId === option.id;
            const isWinner = winner?.id === option.id && status === 'closed';
            const canVote =
              status === 'active' &&
              !isExpired(poll.expiresAt) &&
              (poll.allowMultiple || !hasVoted || youVoted);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => canVote && !isThisVoting && onVote(option.id)}
                disabled={!canVote || isThisVoting}
                className={[
                  'w-full text-left p-3.5 rounded-lg border-2 transition-all',
                  youVoted
                    ? 'border-primary bg-primary/5'
                    : isWinner
                      ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-border',
                  canVote ? 'hover:border-primary/60 hover:bg-accent/40 cursor-pointer' : 'cursor-default',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="font-medium flex items-center gap-2 min-w-0">
                    {youVoted && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    {isWinner && !youVoted && <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    <span className="truncate">{option.text}</span>
                    {isThisVoting && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                    {option.votes} {option.votes === 1 ? 'vote' : 'votes'} · {percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} · {turnout}% turnout
            </span>
            {quorumStatus && (
              <span className="flex items-center gap-1.5">
                <span className="text-xs">
                  Quorum {quorumStatus.totalVotes}/{quorumStatus.requiredVotes}
                </span>
                {quorumStatus.reached ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            )}
            {poll.expiresAt && (
              <span className="text-xs">Closes {formatExpiresOn(poll.expiresAt)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon: typeof Vote;
  title: string;
  hint: string;
}

function EmptyState({ icon: Icon, title, hint }: EmptyStateProps) {
  return (
    <Card className="glass">
      <CardContent className="p-12">
        <div className="text-center text-muted-foreground">
          <Icon className="h-14 w-14 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium mb-1 text-foreground">{title}</p>
          <p className="text-sm">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResultsPanelProps {
  polls: PollDisplay[];
  totalMembers: number;
  myVoteCount: number;
  turnoutAvg: number;
}

function ResultsPanel({ polls, totalMembers, myVoteCount, turnoutAvg }: ResultsPanelProps) {
  const closed = polls.filter((p) => p.status === 'closed' && p.totalVotes > 0);
  const totalVotesCast = polls.reduce((s, p) => s + p.totalVotes, 0);

  if (polls.length === 0) {
    return (
      <EmptyState
        icon={Vote}
        title="Results & Analytics"
        hint="Once polls have votes, you'll see analytics here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile label="Total Polls" value={polls.length} />
        <SummaryTile label="Total Votes" value={totalVotesCast} />
        <SummaryTile label="Avg. Turnout" value={`${turnoutAvg}%`} />
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Closed Poll Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {closed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed polls yet.</p>
          ) : (
            closed.map((poll) => {
              const winner = poll.options.reduce((b, o) => (o.votes > b.votes ? o : b));
              const winningPct = poll.totalVotes > 0 ? (winner.votes / poll.totalVotes) * 100 : 0;
              return (
                <div key={poll.id} className="rounded-lg border border-border p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-medium text-sm">{poll.question}</p>
                    <Badge variant="secondary" className="shrink-0">
                      <Trophy className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                      {winner.text}
                    </Badge>
                  </div>
                  <Progress value={winningPct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {winner.votes} of {poll.totalVotes} votes · {winningPct.toFixed(0)}% · turnout{' '}
                    {totalMembers > 0 ? Math.round((poll.totalVotes / totalMembers) * 100) : 0}%
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm">
            You've cast <strong>{myVoteCount}</strong> vote{myVoteCount === 1 ? '' : 's'} across{' '}
            <strong>{polls.length}</strong> poll{polls.length === 1 ? '' : 's'}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
      </CardContent>
    </Card>
  );
}

