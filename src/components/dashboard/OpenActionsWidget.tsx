import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, CheckCircle2, User } from 'lucide-react';

// Support both legacy and API task types
interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assignee?: { id: string; name?: string; firstName?: string; lastName?: string; avatar?: string };
  dueDate?: string;
  deadline?: string;
}

interface OpenActionsWidgetProps {
  tasks: Task[];
}

const priorityColors: Record<string, 'destructive' | 'warning' | 'secondary' | 'default'> = {
  URGENT: 'destructive',
  urgent: 'destructive',
  HIGH: 'warning',
  high: 'warning',
  MEDIUM: 'secondary',
  medium: 'secondary',
  LOW: 'secondary',
  low: 'secondary'
};

const statusColors: Record<string, 'secondary' | 'default' | 'warning'> = {
  TODO: 'secondary',
  todo: 'secondary',
  IN_PROGRESS: 'default',
  in_progress: 'default',
  REVIEW: 'warning',
  review: 'warning',
  COMPLETED: 'default',
  completed: 'default'
};

export function OpenActionsWidget({ tasks }: OpenActionsWidgetProps) {
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return { text: 'No due date', variant: 'secondary' as const };
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Overdue', variant: 'destructive' as const };
    if (days === 0) return { text: 'Due Today', variant: 'warning' as const };
    if (days === 1) return { text: 'Due Tomorrow', variant: 'secondary' as const };
    return { text: `${days} days left`, variant: 'secondary' as const };
  };

  const getAssigneeName = (task: Task): string | null => {
    if (task.assignee) {
      if (task.assignee.name) return task.assignee.name;
      if (task.assignee.firstName || task.assignee.lastName) {
        return `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim();
      }
    }
    return null;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { 
      URGENT: 0, urgent: 0, 
      HIGH: 1, high: 1, 
      MEDIUM: 2, medium: 2, 
      LOW: 3, low: 3 
    };
    return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
  });

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Open Actions</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedTasks.map((task) => {
          const assigneeName = getAssigneeName(task);
          const dueDate = formatDueDate(task.dueDate || task.deadline);
          const status = task.status?.toLowerCase().replace('_', ' ') || 'pending';
          const priority = task.priority?.toUpperCase() || 'MEDIUM';

          return (
            <div
              key={task.id}
              className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="h-4 w-4 rounded border-2 border-muted-foreground group-hover:border-primary transition-colors" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                    <Badge variant={priorityColors[priority] || 'secondary'} className="text-xs shrink-0">
                      {priority.toLowerCase()}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {assigneeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {assigneeName.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        </div>
                      )}
                      <Badge variant={statusColors[task.status] || 'secondary'} className="text-xs">
                        {status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      <Badge variant={dueDate.variant} className="text-xs">
                        {dueDate.text}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p>All tasks completed!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}