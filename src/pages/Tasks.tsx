import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTasks, useCreateTask } from '@/hooks/api/useTasks';
import { useOrganisationUsers } from '@/hooks/api/useUsers';
import { toast } from 'sonner';
import { Plus, Search, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import type { Task, CreateTaskData, User as ApiUser } from '@/types/api.types';

// Task type matching API response
interface TaskDisplay {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
}

export function Tasks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CreateTaskData>>({});

  // Fetch tasks from API
  const { data: tasksData, isLoading, error } = useTasks();
  const { data: usersData } = useOrganisationUsers();
  const createTaskMutation = useCreateTask();

  // Extract tasks from response
  const tasks: TaskDisplay[] = (() => {
    const rawTasks = Array.isArray(tasksData) ? tasksData : (tasksData as { items?: Task[] })?.items || [];
    return rawTasks.map((task: Task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: (task.status?.toLowerCase() || 'todo') as TaskDisplay['status'],
      priority: (task.priority?.toLowerCase() || 'medium') as TaskDisplay['priority'],
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
      assigneeId: task.assigneeId,
      assigneeName: task.assignee ? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim() : undefined,
      assigneeAvatar: task.assignee?.profilePictureUrl,
    }));
  })();

  // Extract users for assignment
  const users: ApiUser[] = Array.isArray(usersData) ? usersData : (usersData as { items?: ApiUser[] })?.items || [];

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = filteredTasks.filter(t => t.status === 'review');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const priorityColors = {
    urgent: 'destructive',
    high: 'warning',
    medium: 'secondary',
    low: 'outline'
  } as const;

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Overdue', variant: 'destructive' as const };
    if (days === 0) return { text: 'Due Today', variant: 'warning' as const };
    if (days === 1) return { text: 'Due Tomorrow', variant: 'secondary' as const };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), variant: 'secondary' as const };
  };

  const handleCreateTask = async () => {
    if (!newTask.title) {
      toast.error('Please enter a task title');
      return;
    }
    
    try {
      // Convert string date to number timestamp if provided
      const taskData: CreateTaskData = {
        ...newTask,
        dueDate: (newTask as { dueDate?: string | number }).dueDate 
          ? new Date((newTask as { dueDate: string | number }).dueDate).getTime() 
          : undefined,
      } as CreateTaskData;
      await createTaskMutation.mutateAsync(taskData);
      toast.success('Task created successfully');
      setIsCreateDialogOpen(false);
      setNewTask({});
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  const TaskCard = ({ task }: { task: TaskDisplay }) => {
    const assignee = users.find((u: ApiUser) => u.id === task.assigneeId);
    const dueDate = formatDueDate(task.dueDate);

    return (
      <Card className="glass hover:shadow-lg transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <Badge variant={priorityColors[task.priority]} className="text-xs shrink-0">
                {task.priority}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={assignee.profilePictureUrl} alt={`${assignee.firstName} ${assignee.lastName}`} />
                      <AvatarFallback className="text-xs">
                        {(assignee.firstName?.[0] || '') + (assignee.lastName?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {assignee.firstName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={dueDate.variant} className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {dueDate.text}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading tasks...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="glass">
        <CardContent className="p-12 text-center">
          <p className="text-destructive">Failed to load tasks. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Track action items and assignments
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a new task or action item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input 
                  id="title" 
                  placeholder="What needs to be done?" 
                  value={newTask.title || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Add details..."
                  rows={3}
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select onValueChange={(value) => setNewTask(prev => ({ ...prev, assigneeId: value }))}>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: ApiUser) => (
                        <SelectItem key={user.id} value={user.id}>
                          {`${user.firstName} ${user.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as CreateTaskData['priority'] }))}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input 
                  id="due-date" 
                  type="date" 
                  value={(newTask as { dueDate?: string }).dueDate || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value } as Partial<CreateTaskData>))}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and View Toggle */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks View */}
      {viewMode === 'list' ? (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({filteredTasks.length})</TabsTrigger>
            <TabsTrigger value="todo">To Do ({todoTasks.length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({inProgressTasks.length})</TabsTrigger>
            <TabsTrigger value="review">Review ({reviewTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </TabsContent>

          <TabsContent value="todo" className="space-y-3">
            {todoTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-3">
            {inProgressTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </TabsContent>

          <TabsContent value="review" className="space-y-3">
            {reviewTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
            {completedTasks.length === 0 && (
              <Card className="glass">
                <CardContent className="p-12">
                  <div className="text-center text-muted-foreground">
                    <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No completed tasks yet</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* To Do Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">To Do</h3>
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </div>
            {todoTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* In Progress Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">In Progress</h3>
              <Badge variant="default">{inProgressTasks.length}</Badge>
            </div>
            {inProgressTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* Review Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Review</h3>
              <Badge variant="warning">{reviewTasks.length}</Badge>
            </div>
            {reviewTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* Completed Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Completed</h3>
              <Badge variant="success">{completedTasks.length}</Badge>
            </div>
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}