// 'use client';

// import { useState, useMemo } from 'react';
// import { formatDistanceToNow } from 'date-fns';
// import { toast } from 'sonner';
// import { Vote, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { useResolutions, useCastResolutionVote } from '@/hooks/api';
// import type { Resolution } from '../types';
// import { PageHeader, SearchBar, EmptyState, unwrapList } from '../components/page-helpers';

// export function ResolutionsPage() {
//   const { data } = useResolutions();
//   const castVote = useCastResolutionVote();
//   const resolutions = useMemo(() => unwrapList<Resolution>(data), [data]);

//   const [search, setSearch] = useState('');
//   const [status, setStatus] = useState('all');
//   const [voteTarget, setVoteTarget] = useState<Resolution | null>(null);
//   const [choice, setChoice] = useState<'FOR' | 'AGAINST' | 'ABSTAIN' | null>(null);
//   const [comment, setComment] = useState('');

//   const filtered = useMemo(
//     () =>
//       resolutions
//         .filter((r) => (!search || r.title.toLowerCase().includes(search.toLowerCase())) && (status === 'all' || r.status === status))
//         .sort((a, b) => {
//           if (a.status === 'OPEN' && !a.myVote && !(b.status === 'OPEN' && !b.myVote)) return -1;
//           if (b.status === 'OPEN' && !b.myVote && !(a.status === 'OPEN' && !a.myVote)) return 1;
//           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
//         }),
//     [resolutions, search, status],
//   );

//   const STATUS_COLORS: Record<string, string> = {
//     OPEN: 'bg-amber-100 text-amber-700',
//     PASSED: 'bg-emerald-100 text-emerald-700',
//     REJECTED: 'bg-red-100 text-red-700',
//     DEFERRED: 'bg-blue-100 text-blue-700',
//     DRAFT: 'bg-slate-100 text-slate-600',
//     WITHDRAWN: 'bg-slate-100 text-slate-400',
//   };

//   return (
//     <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
//       <PageHeader icon={Vote} title="Resolutions" color="bg-amber-500" subtitle="Board resolutions and voting" />

//       <div className="flex flex-col sm:flex-row gap-3 mb-5">
//         <SearchBar value={search} onChange={setSearch} placeholder="Search resolutions…" />
//         <Select value={status} onValueChange={setStatus}>
//           <SelectTrigger className="h-9 w-40 text-sm shrink-0"><SelectValue /></SelectTrigger>
//           <SelectContent>
//             {['all', 'OPEN', 'PASSED', 'REJECTED', 'DEFERRED', 'DRAFT'].map((s) => (
//               <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>

//       {filtered.length === 0 ? <EmptyState icon={Vote} title="No resolutions found" /> : (
//         <div className="space-y-4">
//           {filtered.map((r) => {
//             const total = r.votesFor + r.votesAgainst + r.abstentions;
//             const forPct = total > 0 ? Math.round((r.votesFor / total) * 100) : 0;
//             const agPct = total > 0 ? Math.round((r.votesAgainst / total) * 100) : 0;
//             const canVote = r.status === 'OPEN' && !r.myVote;

//             return (
//               <div key={r.resolutionId} className={`rounded-2xl border transition-all hover:shadow-md ${r.status === 'OPEN' && !r.myVote ? 'border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10' : ''}`}>
//                 <div className="p-5">
//                   <div className="flex items-start justify-between gap-3 mb-3">
//                     <div className="min-w-0 flex-1">
//                       <div className="flex items-center gap-2 flex-wrap mb-1">
//                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT}`}>{r.status}</span>
//                         {r.status === 'OPEN' && !r.myVote && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><AlertCircle className="h-2.5 w-2.5" />Your vote needed</span>}
//                         {r.myVote && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="h-2.5 w-2.5" />Voted · {r.myVote}</span>}
//                       </div>
//                       <h3 className="font-semibold text-foreground">{r.title}</h3>
//                       <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
//                       <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-muted-foreground">
//                         <span>Proposed by {r.proposedBy}</span>
//                         {r.secondedBy && <span>· Seconded by {r.secondedBy}</span>}
//                         {r.votingDeadline && <span>· Deadline: {formatDistanceToNow(new Date(r.votingDeadline), { addSuffix: true })}</span>}
//                       </div>
//                     </div>
//                     {canVote && (
//                       <Button size="sm" className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => { setVoteTarget(r); setChoice(null); setComment(''); }}>
//                         <Vote className="h-3.5 w-3.5" />Vote
//                       </Button>
//                     )}
//                   </div>

//                   {total > 0 && (
//                     <div className="space-y-1.5 mt-3 pt-3 border-t border-border/40">
//                       <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
//                         {forPct > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${forPct}%` }} />}
//                         {agPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${agPct}%` }} />}
//                         {(100 - forPct - agPct) > 0 && <div className="bg-slate-300 dark:bg-slate-600 transition-all" style={{ width: `${100 - forPct - agPct}%` }} />}
//                       </div>
//                       <div className="flex items-center gap-4 text-xs text-muted-foreground">
//                         <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{r.votesFor} For</span>
//                         <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{r.votesAgainst} Against</span>
//                         <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" />{r.abstentions} Abstain</span>
//                         <span>· {r.totalVotes}/{r.quorumRequired} quorum</span>
//                       </div>
//                     </div>
//                   )}

//                   {r.outcome && <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-300">{r.outcome}</div>}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       <Dialog open={!!voteTarget} onOpenChange={(o) => { if (!o) setVoteTarget(null); }}>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2"><Vote className="h-5 w-5 text-amber-500" />Cast Your Vote</DialogTitle>
//             <DialogDescription className="line-clamp-3">{voteTarget?.title}</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <p className="text-sm text-muted-foreground">{voteTarget?.description}</p>
//             <div className="grid grid-cols-3 gap-3">
//               {([
//                 ['FOR', CheckCircle2, 'border-emerald-300 bg-emerald-50 text-emerald-700'],
//                 ['AGAINST', XCircle, 'border-red-300 bg-red-50 text-red-700'],
//                 ['ABSTAIN', MinusCircle, 'border-slate-300 bg-slate-50 text-slate-700'],
//               ] as const).map(([v, Icon, cls]) => (
//                 <button key={v} type="button" onClick={() => setChoice(v)}
//                   className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${choice === v ? cls + ' ring-2 ring-offset-1 ring-current' : 'border-border hover:border-border/80'}`}
//                 >
//                   <Icon className="h-6 w-6" /><span className="text-sm font-semibold">{v}</span>
//                 </button>
//               ))}
//             </div>
//             <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment…" rows={3} className="text-sm resize-none" />
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setVoteTarget(null)}>Cancel</Button>
//             <Button disabled={!choice} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
//               if (!choice || !voteTarget) return;
//               castVote.mutate({ resolutionId: voteTarget.resolutionId, vote: choice, comment: comment.trim() || undefined });
//               toast.success(`Vote cast: ${choice}`);
//               setVoteTarget(null);
//             }}>
//               <Vote className="h-4 w-4" />Confirm Vote
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }


'use client';

import { Vote, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { toast } from 'sonner';

export function ResolutionsPage() {
  return (
    <MemberPortalLayout icon={Vote} title="Resolutions" color="bg-amber-500" subtitle="Board resolutions and voting">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10 p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
        <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Resolutions are being finalized in the backend and will be available soon.
        </p>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => toast('Resolutions are coming soon')}
        >
          Notify me
        </Button>
      </div>
    </MemberPortalLayout>
  );
}
