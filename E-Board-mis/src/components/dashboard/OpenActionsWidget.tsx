import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Task } from '@/types';
import { users } from '@/lib/store';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface OpenActionsWidgetProps {
  tasks: Task[];
}

const priorityColors = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'secondary'
} as const;

const statusColors = {
  todo: 'secondary',
  in_progress: 'default',
  review: 'warning',
  completed: 'success'
} as const;

export function OpenActionsWidget({ tasks }: OpenActionsWidgetProps) {
  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Overdue', variant: 'destructive' as const };
    if (days === 0) return { text: 'Due Today', variant: 'warning' as const };
    if (days === 1) return { text: 'Due Tomorrow', variant: 'secondary' as const };
    return { text: `${days} days left`, variant: 'secondary' as const };
  };

  const getAssignee = (assigneeId: string) => {
    return users.find(u => u.id === assigneeId);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Open Actions</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedTasks.map((task) => {
          const assignee = getAssignee(task.assigneeId);
          const dueDate = formatDueDate(task.dueDate);

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
                    <Badge variant={priorityColors[task.priority]} className="text-xs shrink-0">
                      {task.priority}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {assignee && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
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
                      <Badge variant={statusColors[task.status]} className="text-xs">
                        {task.status.replace('_', ' ')}
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
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p>All tasks completed!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}