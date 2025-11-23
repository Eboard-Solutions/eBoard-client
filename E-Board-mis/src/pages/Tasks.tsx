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
import { tasks, users } from '@/lib/store';
import { Plus, Search, Calendar, CheckCircle2, Clock } from 'lucide-react';

export function Tasks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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

  const statusColors = {
    todo: 'secondary',
    in_progress: 'default',
    review: 'warning',
    completed: 'success'
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

  const TaskCard = ({ task }: { task: typeof tasks[0] }) => {
    const assignee = users.find(u => u.id === task.assigneeId);
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
                      <AvatarImage src={assignee.avatar} alt={assignee.name} />
                      <AvatarFallback className="text-xs">
                        {assignee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {assignee.name.split(' ')[0]}
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
        
        <Dialog>
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
                <Input id="title" placeholder="What needs to be done?" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Add details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
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
                <Input id="due-date" type="date" />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Create Task</Button>
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