import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Poll } from '@/types/api.types';
import { Vote, Clock, Users } from 'lucide-react';

interface VotingOverviewWidgetProps {
  polls: Poll[];
}

export function VotingOverviewWidget({ polls }: VotingOverviewWidgetProps) {
  // FIX: expiresAt is Unix ms (number), not an ISO string
  const formatTimeLeft = (expiresAt?: number) => {
    if (!expiresAt) return 'No deadline';
    const ms = typeof expiresAt === 'string' ? parseInt(expiresAt, 10) : expiresAt;
    const expires = new Date(ms);
    const hoursLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60));
    if (hoursLeft < 0)  return 'Expired';
    if (hoursLeft < 1)  return 'Expires soon';
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    return `${Math.ceil(hoursLeft / 24)}d left`;
  };

  const getTotalVotes = (poll: Poll) =>
    (poll.options ?? []).reduce((s, o) => s + (o.votes ?? 0), 0);

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Vote className="h-4 w-4 text-primary" />Active Polls
        </CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {polls.map((poll) => {
          const total = getTotalVotes(poll);
          const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;

          return (
            <div key={poll.id}
              className="p-4 rounded-xl border border-border hover:bg-accent/40 transition-colors cursor-pointer space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-sm leading-snug flex-1">{poll.question}</h4>
                <Badge variant={isExpired ? 'destructive' : 'secondary'} className="text-xs shrink-0 gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeLeft(poll.expiresAt)}
                </Badge>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {(poll.options ?? []).map((opt) => {
                  const pct = total > 0 ? (opt.votes / total) * 100 : 0;
                  return (
                    <div key={opt.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{opt.text}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {opt.votes} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />{total} vote{total !== 1 ? 's' : ''}
                </span>
                {!isExpired && (
                  <Button size="sm" className="h-7 text-xs rounded-lg gap-1.5">
                    <Vote className="h-3 w-3" />Vote
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {polls.length === 0 && (
          <div className="text-center py-10 text-muted-foreground space-y-2">
            <Vote className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm">No active polls</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}