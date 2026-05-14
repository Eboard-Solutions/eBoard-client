// src/pages/super-admin/TasksOverview.tsx
import { useState, useMemo } from 'react';
import {
  ListTodo, Search, Clock, CheckCircle2, XCircle,
  ArrowUp, ArrowRight, ArrowDown, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTasks } from '@/hooks/api/useTasks';
import { usePermissions } from '@/lib/permissions';
import type { Task, TaskStatus, TaskPriority } from '@/types/api.types';

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  TODO:        { label: 'To Do',       color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700', icon: ArrowRight },
  REVIEW:      { label: 'Review',      color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700', icon: Clock },
  COMPLETED:   { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700', icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', icon: XCircle },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string; icon: React.ElementType }> = {
  LOW:    { label: 'Low',    color: 'text-gray-500',  icon: ArrowDown },
  MEDIUM: { label: 'Medium', color: 'text-blue-500',  icon: ArrowRight },
  HIGH:   { label: 'High',   color: 'text-orange-500', icon: ArrowUp },
  URGENT: { label: 'Urgent', color: 'text-red-500',    icon: AlertTriangle },
};

export function TasksOverview() {
  const { user, isLoading: authLoading } = usePermissions();
  
  const { data, isLoading, isError } = useTasks(undefined, !!user && !authLoading);
  // Backend returns ResponseObject { statusCode, message, data: Task[], pageInfo? }
  const tasks: Task[] = isError ? [] : (Array.isArray(data) ? data : (data as any)?.data ?? []);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  // Memoize filtered results — only recalculate when tasks, tab, or search change
  const filtered = useMemo(() => {
    let result = tasks;
    if (tab !== 'all') result = result.filter(t => t.status === tab);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, tab, search]);

  // Memoize counts — only recalculate when tasks change
  const counts = useMemo(() => ({
    all: tasks.length,
    TODO: tasks.filter(t => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
    CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length,
  }), [tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of all platform tasks</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {([
          { label: 'Total', value: counts.all, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'To Do', value: counts.TODO, color: 'text-gray-600 dark:text-gray-400' },
          { label: 'In Progress', value: counts.IN_PROGRESS, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Completed', value: counts.COMPLETED, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Cancelled', value: counts.CANCELLED, color: 'text-gray-500 dark:text-gray-500' },
        ] as const).map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="TODO">To Do</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          </TabsList>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {['all', 'TODO', 'IN_PROGRESS', 'COMPLETED'].map(t => (
          <TabsContent key={t} value={t} className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-gray-500 mt-3">Loading tasks...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <ListTodo className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {search ? 'No tasks match your search' : 'No tasks found'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((task, idx) => {
                        const sc = statusConfig[task.status] ?? statusConfig.TODO;
                        const StatusIcon = sc.icon;
                        const pc = priorityConfig[task.priority] ?? priorityConfig.MEDIUM;
                        const PriorityIcon = pc.icon;
                        return (
                          <TableRow key={task.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 flex items-center justify-center flex-shrink-0">
                                  <ListTodo className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</p>
                                  {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">{task.description}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1.5 text-xs font-medium ${pc.color}`}>
                                <PriorityIcon className="h-3.5 w-3.5" />
                                {pc.label}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                              {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
