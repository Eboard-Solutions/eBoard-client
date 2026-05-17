// src/pages/super-admin/PollsOverview.tsx
import { useState, useMemo } from 'react';
import { Vote, Search, FileEdit, Play, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePolls } from '@/hooks/api/usePolls';
import type { Poll, PollStatus } from '@/types/api.types';
import { SuperAdminPageHeader } from './_SuperAdminPageHeader';
import { DataTableCard } from './_DataTableCard';

const statusConfig: Record<PollStatus, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: FileEdit },
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700', icon: Play },
  CLOSED:    { label: 'Closed',    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700', icon: Lock },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700', icon: Lock },
};

export function PollsOverview() {
  const { data, isLoading, isError } = usePolls();
  const polls: Poll[] = isError ? [] : (Array.isArray(data) ? data : (data as any)?.items ?? []);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    let result = polls;
    if (tab !== 'all') result = result.filter(p => p.status === tab);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.question?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [polls, tab, search]);

  const counts = useMemo(() => ({
    all: polls.length,
    DRAFT: polls.filter(p => p.status === 'DRAFT').length,
    ACTIVE: polls.filter(p => p.status === 'ACTIVE').length,
    CLOSED: polls.filter(p => p.status === 'CLOSED').length,
  }), [polls]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        icon={Vote}
        eyebrow="Platform Data"
        title="Polls & Voting"
        subtitle="Every poll across every organisation — drafts, active votes, closed results."
        gradient="from-purple-600 via-violet-600 to-fuchsia-700"
        stats={[
          { label: 'Total',  value: counts.all,    icon: Vote },
          { label: 'Draft',  value: counts.DRAFT,  icon: FileEdit },
          { label: 'Active', value: counts.ACTIVE, icon: Play },
          { label: 'Closed', value: counts.CLOSED, icon: Lock },
        ]}
      />

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="DRAFT">Draft</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed</TabsTrigger>
          </TabsList>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search polls..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {['all', 'DRAFT', 'ACTIVE', 'CLOSED'].map(t => (
          <TabsContent key={t} value={t} className="mt-4">
            <DataTableCard>
                {isLoading ? (
                  <div className="p-10 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">Loading polls...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Vote className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {search ? 'No polls match your search' : 'No polls found'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Poll</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead>Total Votes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((poll, idx) => {
                        const sc = statusConfig[poll.status] ?? statusConfig.DRAFT;
                        const StatusIcon = sc.icon;
                        const totalVotes = poll.options?.reduce((sum, o) => sum + (o.votes || 0), 0) ?? 0;
                        return (
                          <TableRow key={poll.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 flex items-center justify-center flex-shrink-0">
                                  <Vote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[300px]">{poll.question}</p>
                                  {poll.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[300px]">{poll.description}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 max-w-[200px]">
                                {poll.options?.slice(0, 3).map(opt => {
                                  const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                  return (
                                    <div key={opt.id} className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{opt.text}</span>
                                      <span className="text-[10px] text-gray-400 shrink-0">{pct}%</span>
                                    </div>
                                  );
                                })}
                                {(poll.options?.length ?? 0) > 3 && (
                                  <span className="text-[10px] text-gray-400">+{(poll.options?.length ?? 0) - 3} more</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {totalVotes}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {poll.createdAt ? new Date(poll.createdAt).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </DataTableCard>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
