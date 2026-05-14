'use client';

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { BarChart3, Lock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePolls, useVotePoll } from '@/hooks/api';
import type { Poll } from '../types';
import { EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';

export function PollsPage() {
  const { data } = usePolls();
  const vote = useVotePoll();
  const polls = useMemo(() => unwrapList<Poll>(data) ?? [], [data]);

  const active = polls.filter((p) => p.status === 'ACTIVE');
  const closed = polls.filter((p) => p.status !== 'ACTIVE');

  function PollCard({ poll }: { poll: Poll }) {
    const [myChoice, setMyChoice] = useState<string[]>(poll.myResponse ?? []);
    const total = poll.totalResponses ?? 0;
    const hasVoted = (poll.myResponse ?? []).length > 0;

    return (
      <div className={`rounded-2xl border transition-all hover:shadow-md ${poll.status === 'ACTIVE' && !hasVoted ? 'border-violet-200 dark:border-violet-800 bg-violet-50/20 dark:bg-violet-950/10' : ''}`}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${poll.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{poll.status}</span>
                {poll.isAnonymous && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Anonymous</span>}
              </div>
              <h3 className="font-semibold text-foreground">{poll.question}</h3>
              {poll.description && <p className="text-xs text-muted-foreground mt-0.5">{poll.description}</p>}
            </div>
          </div>

          <div className="space-y-2.5">
            {(poll.options ?? []).map((opt, optIdx) => {
              const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
              const isChosen = myChoice.includes(opt.optionId);
              const canVote = poll.status === 'ACTIVE' && !hasVoted;
              return (
                <div key={opt.optionId ?? `opt-${optIdx}`} className="">
                  {canVote ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (poll.pollType === 'SINGLE') setMyChoice([opt.optionId]);
                        else setMyChoice((prev) => (prev.includes(opt.optionId) ? prev.filter((id) => id !== opt.optionId) : [...prev, opt.optionId]));
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm flex items-center gap-3 ${
                        isChosen ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 font-medium' : 'border-border'
                      }`}
                    >
                      <span className={`h-4 w-4 rounded-full flex-shrink-0 border flex items-center justify-center ${isChosen ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                        {isChosen && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className="flex-1 text-sm">{opt.label}</span>
                      {poll.pollType === 'SINGLE' ? null : <span className="text-xs text-muted-foreground">{opt.votes} votes</span>}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`h-4 w-4 rounded-full flex-shrink-0 border flex items-center justify-center ${isChosen ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {isChosen && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                          <span className={isChosen ? 'font-semibold text-indigo-600' : 'text-foreground'}>{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}% ({opt.votes})</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isChosen ? 'bg-indigo-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {poll.status === 'ACTIVE' && !hasVoted && myChoice.length > 0 && (
            <Button
              className="mt-4 w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={vote.isLoading}
              onClick={() => {
                // Prevent double submissions
                if (vote.isLoading) return;

                // For single-choice polls, send a single optionId
                if (poll.pollType === 'SINGLE') {
                  const optionId = myChoice[0];
                  if (!optionId) return;
                  vote.mutate({ pollId: poll.pollId, optionId } as any, {
                    onSuccess: () => toast.success('Response submitted!'),
                    onError: () => toast.error('Failed to submit response'),
                  });
                  return;
                }

                // For multiple-choice polls, submit each selected option as separate vote
                const ids = Array.from(new Set(myChoice));
                ids.forEach((id) => {
                  vote.mutate({ pollId: poll.pollId, optionId: id } as any);
                });
                toast.success('Responses submitted!');
              }}
            >
              {vote.isLoading ? 'Submitting…' : 'Submit Response'}
            </Button>
          )}

          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>{total} response{total !== 1 ? 's' : ''}</span>
            {poll.deadline && <span>Deadline: {format(new Date(poll.deadline), 'MMM d, yyyy')}</span>}
          </div>

          {!poll.isAnonymous && (poll.auditTrail?.length ?? 0) > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" />Audit Trail ({poll.auditTrail?.length ?? 0})
              </summary>
              <div className="mt-2 space-y-1">
                {(poll.auditTrail ?? []).slice(0, 5).map((e) => (
                  <div key={e.entryId} className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium">{e.userName}</span> {e.action} · {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                    {e.details && <p className="text-[10px] mt-0.5">{e.details}</p>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <MemberPortalLayout icon={BarChart3} title="Polls & Voting" color="bg-violet-600" subtitle="Active polls and voting history">
      {polls.length === 0 ? (
        <EmptyState icon={BarChart3} title="No polls available" />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Active · {active.length}</h2>
              {active.map((p, idx) => <PollCard key={p.pollId ?? p.id ?? `poll-${idx}`} poll={p} />)}
            </div>
          )}
          {closed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Closed · {closed.length}</h2>
              {closed.map((p, idx) => <PollCard key={p.pollId ?? p.id ?? `poll-${idx}`} poll={p} />)}
            </div>
          )}
        </div>
      )}
    </MemberPortalLayout>
  );
}