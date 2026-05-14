'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { format, formatDistanceToNow, differenceInSeconds, isPast } from 'date-fns';
import { toast } from 'sonner';
import {
  BarChart3, Lock, BookOpen, Search, Filter, TrendingUp,
  Clock, CheckCircle2, Users, AlertCircle, ChevronDown,
  ThumbsUp, MessageSquare, BarChart2, Zap, Award,
  ArrowUpRight, RotateCcw, X, Check, Loader2,
  SortAsc, Eye, ChevronRight, Flame, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePolls, useVotePoll } from '@/hooks/api';
import { authService } from '@/api/services';
import type { Poll as ApiPoll, PollOption as ApiPollOption } from '@/types/api.types';
import type { Poll } from '../types';
import { EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey  = 'newest' | 'deadline' | 'popular' | 'unanswered';
type FilterKey = 'all' | 'active' | 'closed' | 'voted' | 'pending';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPct(votes: number, total: number) {
  return total > 0 ? Math.round((votes / total) * 100) : 0;
}

function getSecondsLeft(deadline?: string): number {
  if (!deadline) return 0;
  return Math.max(0, differenceInSeconds(new Date(deadline), new Date()));
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCountdown(deadline?: string) {
  const [secs, setSecs] = useState(() => getSecondsLeft(deadline));
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setSecs(getSecondsLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return secs;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Stat Card
function StatCard({
  icon: Icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; delay?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${color}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
          <p className="text-3xl font-black tabular-nums text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color.replace('bg-', 'bg-').replace('-500', '-100')} dark:bg-opacity-20`}>
          <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

// Countdown Timer
function Countdown({ deadline }: { deadline?: string }) {
  const secs = useCountdown(deadline);
  if (!deadline || isPast(new Date(deadline))) return null;

  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  const isUrgent = secs < 3600;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
      isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
    }`}>
      <Clock className={`h-3 w-3 ${isUrgent ? 'animate-pulse' : ''}`} />
      {d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m ${s}s left`}
    </div>
  );
}

// Animated Result Bar
function ResultBar({
  label, votes, total, isMyChoice, rank,
}: {
  label: string; votes: number; total: number; isMyChoice: boolean; rank: number;
}) {
  const pct = getPct(votes, total);
  const isTop = rank === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
            isMyChoice
              ? 'bg-indigo-600 border-indigo-600'
              : 'bg-background border-muted-foreground/30'
          }`}>
            {isMyChoice && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>
          <span className={`truncate ${isMyChoice ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}>
            {label}
          </span>
          {isTop && total > 0 && (
            <span className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <Flame className="h-2.5 w-2.5" />Top
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-xs text-muted-foreground tabular-nums">{votes} votes</span>
          <span className={`text-xs font-bold tabular-nums w-9 text-right ${isMyChoice ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isMyChoice ? 'bg-indigo-500' : isTop ? 'bg-violet-500' : 'bg-muted-foreground/30'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Vote Option Button
function VoteOption({
  opt, isChosen, pollType, onClick, disabled,
}: {
  opt: Poll['options'][number]; isChosen: boolean;
  pollType: string; onClick: () => void; disabled?: boolean;
}) {
  const isSingle = pollType === 'SINGLE';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 active:scale-[0.99] motion-reduce:active:scale-100 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isChosen
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-500/10'
          : 'border-border hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-muted/50 text-foreground'
      }`}
      role={isSingle ? 'radio' : 'checkbox'}
      aria-checked={isChosen}
      aria-disabled={disabled || undefined}
    >
      <div className={`h-5 w-5 ${isSingle ? 'rounded-full' : 'rounded-md'} flex-shrink-0 border-2 flex items-center justify-center transition-all ${
        isChosen ? 'bg-indigo-600 border-indigo-600' : 'bg-background border-muted-foreground/40 group-hover:border-indigo-400'
      }`}>
        {isChosen && (
          isSingle
            ? <div className="h-2 w-2 rounded-full bg-white" />
            : <Check className="h-3 w-3 text-white" strokeWidth={3} />
        )}
      </div>
      <span className="flex-1 text-sm font-medium">{opt.label}</span>
    </button>
  );
}

// Confirm Modal
function ConfirmModal({
  open, onConfirm, onCancel, isPending, choices, options,
}: {
  open: boolean; onConfirm: () => void; onCancel: () => void;
  isPending: boolean; choices: string[]; options: Poll['options'];
}) {
  if (!open) return null;
  const selected = options.filter(o => choices.includes(o.optionId));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Confirm Your Vote</h3>
            <p className="text-xs text-muted-foreground">This action may be final</p>
          </div>
        </div>
        <div className="space-y-2">
          {selected.map(o => (
            <div key={o.optionId} className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
              <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{o.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" onClick={onCancel} disabled={isPending} className="flex-1 h-10">
            <X className="h-4 w-4 mr-1.5" />Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isPending ? 'Submitting…' : 'Confirm Vote'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Skeleton
function PollSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4 animate-pulse">
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="h-5 w-3/4 rounded-lg bg-muted" />
      <div className="h-4 w-1/2 rounded-lg bg-muted" />
      <div className="space-y-2.5">
        {[0,1,2].map(i => <div key={i} className="h-11 rounded-xl bg-muted" />)}
      </div>
    </div>
  );
}

// Analytics mini chart
function ParticipationChart({ polls }: { polls: Poll[] }) {
  const data = polls.slice(0, 6).map(p => ({
    name: p.question.slice(0, 16) + (p.question.length > 16 ? '…' : ''),
    responses: p.totalResponses ?? 0,
    status: p.status,
  }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
          formatter={(v: number) => [v, 'Responses']}
        />
        <Bar dataKey="responses" radius={[5,5,0,0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.status === 'ACTIVE' ? '#6366f1' : '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Poll Card ───────────────────────────────────────────────────────────
function PollCard({ poll, onVoteSuccess }: { poll: Poll; onVoteSuccess?: () => void }) {
  const vote = useVotePoll();
  const serverChoice = useMemo(
    () => (poll.myResponse ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0),
    [poll.myResponse],
  );
  const [myChoice, setMyChoice]       = useState<string[]>(serverChoice);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAudit, setShowAudit]     = useState(false);
  const [reactions, setReactions]     = useState<Record<string, number>>({});
  const [comment, setComment]         = useState('');
  const [comments, setComments]       = useState<{ text: string; ts: Date }[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  // Keep local selection in sync when the server confirms a vote (or another
  // tab does). Compare by content so we don't fight the user mid-selection.
  useEffect(() => {
    if (serverChoice.length === 0) return;
    setMyChoice(prev => {
      const sameLength = prev.length === serverChoice.length;
      const sameIds = sameLength && prev.every(id => serverChoice.includes(id));
      return sameIds ? prev : serverChoice;
    });
  }, [serverChoice]);

  const total    = poll.totalResponses ?? 0;
  const hasVoted = serverChoice.length > 0;
  const canVote  = poll.status === 'ACTIVE' && !hasVoted && !submitting;
  const isNew    = !hasVoted && poll.status === 'ACTIVE';

  // Sort options by votes for ranking
  const sortedOptions = useMemo(() =>
    [...(poll.options ?? [])].sort((a, b) => b.votes - a.votes),
  [poll.options]);

  const handleOptionClick = useCallback((optionId: string) => {
    if (!canVote) return;
    if (!optionId) return;
    if (poll.pollType === 'SINGLE') {
      setMyChoice(prev => (prev.length === 1 && prev[0] === optionId ? prev : [optionId]));
      return;
    }
    setMyChoice(prev =>
      prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
    );
  }, [canVote, poll.pollType]);

  const handleSubmit = useCallback(async () => {
    if (submitting || vote.isPending) return;
    const ids = [...new Set(myChoice.filter(Boolean))];
    if (ids.length === 0) {
      toast.error('Pick an option first');
      return;
    }
    if (poll.pollType === 'SINGLE' && ids.length > 1) {
      toast.error('Only one option allowed');
      return;
    }
    setSubmitting(true);
    try {
      if (poll.pollType === 'SINGLE') {
        await vote.mutateAsync({ pollId: poll.pollId, optionId: ids[0] });
        toast.success('Vote submitted!', { description: 'Your response has been recorded.' });
      } else {
        const results = await Promise.allSettled(
          ids.map(id => vote.mutateAsync({ pollId: poll.pollId, optionId: id })),
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed === 0) {
          toast.success('Votes submitted!', { description: `${ids.length} selection${ids.length !== 1 ? 's' : ''} recorded.` });
        } else if (failed === ids.length) {
          throw new Error('all votes failed');
        } else {
          toast.warning('Partial submission', { description: `${ids.length - failed} of ${ids.length} recorded — please retry the rest.` });
        }
      }
      setShowConfirm(false);
      onVoteSuccess?.();
    } catch {
      toast.error('Failed to submit', { description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, vote, poll.pollType, poll.pollId, myChoice, onVoteSuccess]);

  const addReaction = (emoji: string) => setReactions(r => ({ ...r, [emoji]: (r[emoji] ?? 0) + 1 }));

  const participationRate = Math.min(100, Math.round((total / Math.max(total + 3, 10)) * 100));

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        onConfirm={handleSubmit}
        onCancel={() => { if (!submitting) setShowConfirm(false); }}
        isPending={submitting || vote.isPending}
        choices={myChoice}
        options={poll.options ?? []}
      />

      <article
        className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
          isNew
            ? 'border-indigo-200 dark:border-indigo-800/60 bg-card shadow-sm shadow-indigo-100/50 dark:shadow-none ring-1 ring-inset ring-indigo-200/50 dark:ring-indigo-800/30'
            : 'border-border bg-card hover:border-border/80'
        } hover:-translate-y-1 hover:shadow-lg`}
        aria-label={`Poll: ${poll.question}`}
      >
        {/* Unvoted accent bar */}
        {isNew && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />}

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  poll.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-muted text-muted-foreground border-border/60'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${poll.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                  {poll.status === 'ACTIVE' ? 'Active' : 'Closed'}
                </span>

                {poll.isAnonymous && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/60">
                    <Lock className="h-2.5 w-2.5" />Anonymous
                  </span>
                )}

                {isNew && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Zap className="h-2.5 w-2.5" />Needs Vote
                  </span>
                )}

                {poll.pollType === 'MULTIPLE' && (
                  <span className="text-[11px] text-muted-foreground font-medium">Multi-select</span>
                )}
              </div>

              <h3 className="text-base sm:text-[17px] font-bold tracking-tight text-foreground leading-snug">
                {poll.question}
              </h3>
              {poll.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{poll.description}</p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />{total} response{total !== 1 ? 's' : ''}
            </span>
            {poll.deadline && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Closes {format(new Date(poll.deadline), 'MMM d, yyyy')}
              </span>
            )}
            <Countdown deadline={poll.deadline} />
          </div>

          {/* Participation bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Participation</span>
              <span className="font-bold text-foreground tabular-nums">{participationRate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${participationRate}%` }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2.5" role={poll.pollType === 'SINGLE' ? 'radiogroup' : 'group'}
            aria-label="Poll options">
            {canVote
              ? (poll.options ?? []).map((opt, idx) => (
                  <VoteOption
                    key={opt.optionId ?? `opt-${idx}`}
                    opt={opt}
                    isChosen={!!opt.optionId && myChoice.includes(opt.optionId)}
                    pollType={poll.pollType}
                    onClick={() => handleOptionClick(opt.optionId)}
                    disabled={submitting || vote.isPending}
                  />
                ))
              : sortedOptions.map((opt, idx) => (
                  <ResultBar
                    key={opt.optionId ?? `opt-${idx}`}
                    label={opt.label}
                    votes={opt.votes}
                    total={total}
                    isMyChoice={(poll.myResponse ?? myChoice).includes(opt.optionId)}
                    rank={idx}
                  />
                ))
            }
          </div>

          {/* Submit CTA */}
          {canVote && myChoice.length > 0 && (
            <Button
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm shadow-indigo-500/20 transition-all"
              disabled={submitting || vote.isPending}
              onClick={() => setShowConfirm(true)}
            >
              {submitting || vote.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              {submitting || vote.isPending
                ? 'Submitting…'
                : `Submit ${poll.pollType === 'MULTIPLE' && myChoice.length > 1 ? `${myChoice.length} responses` : 'Response'}`}
            </Button>
          )}

          {/* Voted success */}
          {hasVoted && poll.status === 'ACTIVE' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Your response has been recorded
            </div>
          )}

          {/* Footer: reactions + audit */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-3">
            {/* Reactions */}
            {!poll.isAnonymous && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {['👍','🔥','💡','🎯'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(emoji)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border/60 bg-background hover:bg-muted transition-colors"
                  >
                    {emoji}
                    {reactions[emoji] ? <span className="text-muted-foreground">{reactions[emoji]}</span> : null}
                  </button>
                ))}
              </div>
            )}

            {/* Audit trail toggle */}
            {!poll.isAnonymous && (poll.auditTrail?.length ?? 0) > 0 && (
              <button
                onClick={() => setShowAudit(a => !a)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {showAudit ? 'Hide' : 'Show'} history ({poll.auditTrail?.length ?? 0})
                <ChevronDown className={`h-3 w-3 transition-transform ${showAudit ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Comment box (non-anonymous only) */}
          {!poll.isAnonymous && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && comment.trim()) {
                      setComments(c => [...c, { text: comment.trim(), ts: new Date() }]);
                      setComment('');
                    }
                  }}
                  placeholder="Leave a comment… (Enter to post)"
                  className="flex-1 h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    if (comment.trim()) {
                      setComments(c => [...c, { text: comment.trim(), ts: new Date() }]);
                      setComment('');
                    }
                  }}
                  className="h-9 w-9 rounded-xl border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              </div>
              {comments.length > 0 && (
                <div className="space-y-1.5">
                  {comments.map((c, i) => (
                    <div key={i} className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 flex items-start gap-2">
                      <span className="font-medium text-foreground">You</span>
                      <span className="flex-1">{c.text}</span>
                      <span className="text-muted-foreground/60 shrink-0">
                        {formatDistanceToNow(c.ts, { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Trail */}
          {showAudit && (
            <div className="space-y-1.5 pt-2">
              {(poll.auditTrail ?? []).slice(0, 5).map(e => (
                <div key={e.entryId} className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">{e.userName}</span>
                    {' '}{e.action}
                    <span className="text-muted-foreground/60"> · {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</span>
                    {e.details && <p className="text-[11px] mt-0.5 text-muted-foreground/70">{e.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ polls }: { polls: Poll[] }) {
  const totalResponses = polls.reduce((s, p) => s + (p.totalResponses ?? 0), 0);
  const active         = polls.filter(p => p.status === 'ACTIVE').length;
  const pieData = [
    { name: 'Active',  value: active,              color: '#6366f1' },
    { name: 'Closed',  value: polls.length - active, color: '#e2e8f0' },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Engagement Analytics</p>
          <p className="text-xs text-muted-foreground">Participation overview</p>
        </div>
      </div>

      {/* Pie */}
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={80} height={80}>
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={38} strokeWidth={0}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 flex-1">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-bold text-foreground tabular-nums">{d.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
            <span className="text-muted-foreground">Total responses</span>
            <span className="font-bold text-foreground tabular-nums">{totalResponses}</span>
          </div>
        </div>
      </div>

      {/* Participation bar chart */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Responses per poll</p>
        <ParticipationChart polls={polls} />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
// Map the API's Poll shape ({ id, options:[{id,text,...}], multipleChoice, anonymous,
// expiresAt, status }) onto the local Poll shape this page renders against
// ({ pollId, options:[{optionId,label,...}], pollType, isAnonymous, deadline, … }).
// Without this the page reads `opt.optionId` as undefined, which made every
// option appear selected after a single click.
function adaptApiPoll(api: ApiPoll, currentUserId: string): Poll {
  const options = (api.options ?? []).map((opt: ApiPollOption, idx) => {
    const voterIds = Array.isArray(opt.voterIds) ? opt.voterIds : [];
    const votes = typeof opt.votes === 'number' ? opt.votes : voterIds.length;
    return {
      optionId: opt.id || `opt-${idx}`,
      label: opt.text ?? '',
      votes,
      voterIds,
    };
  });

  const myResponse = currentUserId
    ? options.filter(o => o.voterIds.includes(currentUserId)).map(o => o.optionId)
    : [];

  const rawStatus = (api.status ?? '').toString().toUpperCase();
  const expired = typeof api.expiresAt === 'number' && api.expiresAt <= Date.now();
  const status: Poll['status'] =
    rawStatus === 'CLOSED' || rawStatus === 'CANCELLED' || expired
      ? 'CLOSED'
      : rawStatus === 'DRAFT'
        ? 'DRAFT'
        : 'ACTIVE';

  return {
    pollId: api.id,
    question: api.question ?? '',
    description: api.description,
    options,
    status,
    pollType: api.multipleChoice ? 'MULTIPLE' : 'SINGLE',
    isAnonymous: !!api.anonymous,
    deadline: typeof api.expiresAt === 'number' ? new Date(api.expiresAt).toISOString() : '',
    createdBy: api.createdBy ?? '',
    myResponse,
    totalResponses: options.reduce((s, o) => s + o.votes, 0),
    auditTrail: [],
    organisationId: '',
    createdAt: api.createdAt ?? '',
  };
}

export function PollsPage() {
  const { data, isLoading, refetch } = usePolls();
  const currentUserId = authService.getUser()?.userId ?? '';
  const polls = useMemo(() => {
    const list = unwrapList<ApiPoll>(data);
    return list.map(p => adaptApiPoll(p, currentUserId));
  }, [data, currentUserId]);

  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<FilterKey>('all');
  const [sort,       setSort]       = useState<SortKey>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const active   = polls.filter(p => p.status === 'ACTIVE');
  const pending  = active.filter(p => !(p.myResponse ?? []).length);
  const voted    = polls.filter(p => (p.myResponse ?? []).length > 0);
  const closed   = polls.filter(p => p.status !== 'ACTIVE');
  const totalRes = polls.reduce((s, p) => s + (p.totalResponses ?? 0), 0);

  const filtered = useMemo(() => {
    let result = [...polls];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.question.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter === 'active')  result = result.filter(p => p.status === 'ACTIVE');
    if (filter === 'closed')  result = result.filter(p => p.status !== 'ACTIVE');
    if (filter === 'voted')   result = result.filter(p => (p.myResponse ?? []).length > 0);
    if (filter === 'pending') result = result.filter(p => p.status === 'ACTIVE' && !(p.myResponse ?? []).length);

    // Sort
    if (sort === 'deadline') result.sort((a, b) => (a.deadline ?? '9') < (b.deadline ?? '9') ? -1 : 1);
    if (sort === 'popular')  result.sort((a, b) => (b.totalResponses ?? 0) - (a.totalResponses ?? 0));
    if (sort === 'unanswered') result.sort((a, b) => {
      const aP = a.status === 'ACTIVE' && !(a.myResponse ?? []).length ? 0 : 1;
      const bP = b.status === 'ACTIVE' && !(b.myResponse ?? []).length ? 0 : 1;
      return aP - bP;
    });

    return result;
  }, [polls, search, filter, sort]);

  const FILTER_OPTIONS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',     label: 'All',     count: polls.length },
    { key: 'active',  label: 'Active',  count: active.length },
    { key: 'pending', label: 'Pending', count: pending.length },
    { key: 'voted',   label: 'Voted',   count: voted.length },
    { key: 'closed',  label: 'Closed',  count: closed.length },
  ];

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'newest',     label: 'Newest first' },
    { key: 'deadline',   label: 'Deadline' },
    { key: 'popular',    label: 'Most responses' },
    { key: 'unanswered', label: 'Needs vote' },
  ];

  return (
    <MemberPortalLayout icon={BarChart3} title="Polls & Voting" color="bg-violet-600" subtitle="Active polls and voting history">

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={BarChart2}    label="Total Polls"    value={polls.length}    sub={`${active.length} active`}         color="bg-indigo-500"  delay={0}   />
        <StatCard icon={Zap}          label="Needs Your Vote" value={pending.length}  sub="Awaiting response"                color="bg-violet-500"  delay={50}  />
        <StatCard icon={CheckCircle2} label="Voted"          value={voted.length}    sub={`${Math.round((voted.length/Math.max(polls.length,1))*100)}% participated`} color="bg-emerald-500" delay={100} />
        <StatCard icon={Users}        label="Total Responses" value={totalRes}       sub="Across all polls"                 color="bg-amber-500"   delay={150} />
      </div>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search polls… (press / to focus)"
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              aria-label="Search polls"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(f => !f)}
            className={`h-10 px-3.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
              showFilters || filter !== 'all' || sort !== 'newest'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
            aria-expanded={showFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {(filter !== 'all' || sort !== 'newest') && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            )}
          </button>

          <button
            onClick={() => { refetch(); setRefreshKey(k => k + 1); }}
            className="h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all flex items-center justify-center"
            aria-label="Refresh"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {showFilters && (
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      filter === f.key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    {f.label} {f.count > 0 && <span className="ml-1 opacity-60">{f.count}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sort by</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      sort === s.key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <SortAsc className="h-3 w-3" />{s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter pills row */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_OPTIONS.filter(f => f.key !== 'all').map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(prev => prev === f.key ? 'all' : f.key)}
              className={`h-7 px-3 rounded-full text-xs font-semibold border transition-all ${
                filter === f.key
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`ml-1.5 tabular-nums ${filter === f.key ? 'opacity-80' : 'opacity-50'}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[0,1,2].map(i => <PollSkeleton key={i} />)}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState icon={BarChart3} title="No polls available" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-base font-semibold text-foreground">No polls match your filters</p>
          <p className="text-sm text-muted-foreground mt-1.5 mb-4">Try adjusting your search or filter criteria</p>
          <button
            onClick={() => { setSearch(''); setFilter('all'); setSort('newest'); }}
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Poll list */}
          <div className="xl:col-span-2 space-y-4">
            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {polls.length} polls
              </p>
              {pending.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-full">
                  <AlertCircle className="h-3 w-3" />
                  {pending.length} awaiting your vote
                </span>
              )}
            </div>

            {filtered.map((p, idx) => (
              <PollCard key={p.pollId ?? `poll-${idx}`} poll={p} onVoteSuccess={() => refetch()} />
            ))}
          </div>

          {/* Right sidebar: analytics */}
          <div className="space-y-5">
            <AnalyticsPanel polls={polls} />

            {/* Top polls */}
            {polls.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                    <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Most Engaged</p>
                </div>
                <div className="space-y-2">
                  {[...polls].sort((a,b) => (b.totalResponses??0)-(a.totalResponses??0)).slice(0,3).map((p,i) => (
                    <div key={p.pollId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${
                        i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                        i === 1 ? 'bg-muted text-muted-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.question}</p>
                        <p className="text-[11px] text-muted-foreground">{p.totalResponses ?? 0} responses</p>
                      </div>
                      {p.status === 'ACTIVE' && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick tips */}
            <div className="rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/10 p-4 space-y-2">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Tips</p>
              {[
                { icon: Eye, text: 'Results update after voting' },
                { icon: Lock, text: 'Anonymous polls hide identities' },
                { icon: Star, text: 'Press / to search quickly' },
              ].map(tip => (
                <div key={tip.text} className="flex items-start gap-2.5 text-xs text-indigo-700/80 dark:text-indigo-400/80">
                  <tip.icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </MemberPortalLayout>
  );
}