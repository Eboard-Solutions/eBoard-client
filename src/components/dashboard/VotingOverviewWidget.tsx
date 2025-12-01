import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Poll } from '@/types';
import { Vote, Clock } from 'lucide-react';

interface VotingOverviewWidgetProps {
  polls: Poll[];
}

export function VotingOverviewWidget({ polls }: VotingOverviewWidgetProps) {
  const formatTimeLeft = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft < 1) return 'Expires soon';
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `${daysLeft}d left`;
  };

  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  };

  const getQuorumStatus = (poll: Poll) => {
    if (!poll.requireQuorum) return null;
    const totalVotes = getTotalVotes(poll);
    const requiredVotes = Math.ceil((poll.quorumPercentage || 0) / 100 * 5); // Assuming 5 total voters
    const percentage = (totalVotes / requiredVotes) * 100;
    
    return {
      reached: totalVotes >= requiredVotes,
      percentage: Math.min(percentage, 100),
      totalVotes,
      requiredVotes
    };
  };

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Active Polls</CardTitle>
        <Button variant="ghost" size="sm">View All</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {polls.map((poll) => {
          const totalVotes = getTotalVotes(poll);
          const quorumStatus = getQuorumStatus(poll);

          return (
            <div
              key={poll.id}
              className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm leading-tight mb-1">
                      {poll.question}
                    </h4>
                    {poll.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {poll.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeLeft(poll.expiresAt)}
                  </Badge>
                </div>

                {/* Vote Options */}
                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    
                    return (
                      <div key={option.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{option.text}</span>
                          <span className="text-muted-foreground">
                            {option.votes} {option.votes === 1 ? 'vote' : 'votes'} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>

                {/* Quorum Status */}
                {quorumStatus && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Quorum: {quorumStatus.totalVotes}/{quorumStatus.requiredVotes}
                      </span>
                      {quorumStatus.reached ? (
                        <Badge variant="default" className="text-xs">
                          Quorum Reached
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {quorumStatus.percentage.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button className="w-full" size="sm">
                  <Vote className="h-4 w-4 mr-2" />
                  Cast Your Vote
                </Button>
              </div>
            </div>
          );
        })}

        {polls.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No active polls
          </div>
        )}
      </CardContent>
    </Card>
  );
}