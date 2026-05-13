'use client';

import { useState, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';
import { CheckSquare, Clock, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasks, useUpdateTask } from '@/hooks/api';
import type { Task } from '../types';
import { PageHeader, SearchBar, EmptyState, unwrapList } from '../components/page-helpers';

export function TasksPage() {
  const { data } = useTasks();
  const updateTask = useUpdateTask();
  const tasks = useMemo(() => unwrapList<Task>(data), [data]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [selected, setSelected] = useState<Task | null>(null);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [progressInput, setProgressInput] = useState<number>(0);

  const filtered = useMemo(
    () =>
      tasks
        .filter((t) => {
          const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
          const matchFilter = filter === 'all' ? true : filter === 'active' ? t.status !== 'COMPLETED' : t.status === filter;
          return matchSearch && matchFilter;
        })
        .sort((a, b) => {
          const p = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
        }),
    [tasks, search, filter],
  );

  const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-slate-100 text-slate-600',
  };

  const STATUS_DOT: Record<string, string> = {
    OVERDUE: 'bg-red-500',
    IN_PROGRESS: 'bg-blue-500',
    COMPLETED: 'bg-emerald-500',
    PENDING: 'bg-amber-500',
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
      <PageHeader icon={CheckSquare} title="My Tasks" color="bg-emerald-600" subtitle="Action items and deliverables" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks…" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-40 text-sm shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All tasks</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title={filter === 'active' ? 'All caught up!' : 'No tasks found'} sub={filter === 'active' ? 'No active tasks assigned to you.' : undefined} />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.taskId}
              className={`rounded-2xl border transition-all hover:shadow-md cursor-pointer ${
                t.status === 'OVERDUE' ? 'border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10' : ''
              }`}
              onClick={() => { setSelected(t); setProgressInput(t.progress); }}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-3 w-3 rounded-full shrink-0 mt-1.5 ${STATUS_DOT[t.status]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                          {t.status === 'OVERDUE' && <span className="text-[10px] font-bold text-red-600">OVERDUE</span>}
                        </div>
                        <p className={`font-semibold text-sm ${t.status === 'COMPLETED' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {t.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />Due {isToday(new Date(t.dueDate)) ? 'Today' : format(new Date(t.dueDate), 'MMM d')}
                            </span>
                          )}
                          <span>Assigned by {t.assignedBy}</span>
                          {t.deliverables.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />{t.deliverables.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {t.status !== 'COMPLETED' && (
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                            updateTask.mutate({ taskId: t.taskId, data: { status: 'COMPLETED', progress: 100 } as any });
                            toast.success('Task completed');
                          }}>
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${t.status === 'OVERDUE' ? 'bg-red-500' : t.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">{t.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNewDeliverable(''); } }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>Assigned by {selected.assignedBy}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress — {progressInput}%</Label>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={progressInput} onChange={(e) => setProgressInput(Number(e.target.value))} className="w-full accent-indigo-600" />
                  <Button size="sm" className="mt-2 h-8 text-xs w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                    updateTask.mutate({ taskId: selected.taskId, data: { progress: progressInput, status: progressInput === 100 ? 'COMPLETED' : progressInput > 0 ? 'IN_PROGRESS' : 'PENDING' } as any });
                    toast.success('Progress updated');
                  }}>
                    Update Progress
                  </Button>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Notes</Label>
                  <Textarea defaultValue={selected.notes} rows={3} className="text-sm resize-none" onBlur={(e) => updateTask.mutate({ taskId: selected.taskId, data: { notes: e.target.value } as any })} placeholder="Add notes…" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Deliverables ({selected.deliverables.length})</h4>
                  <div className="space-y-2 mb-2">
                    {selected.deliverables.map((d) => (
                      <div key={d.deliverableId} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1">{d.title}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(d.submittedAt), 'MMM d')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newDeliverable} onChange={(e) => setNewDeliverable(e.target.value)} placeholder="Add deliverable…" className="h-8 text-sm flex-1" />
                    <Button size="sm" className="h-8" onClick={() => {
                      if (newDeliverable.trim()) {
                        updateTask.mutate({ taskId: selected.taskId, data: { deliverables: [{ title: newDeliverable.trim() } as any] } as any });
                        setNewDeliverable('');
                        toast.success('Deliverable added');
                      }
                    }}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setSelected(null); setNewDeliverable(''); }}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}