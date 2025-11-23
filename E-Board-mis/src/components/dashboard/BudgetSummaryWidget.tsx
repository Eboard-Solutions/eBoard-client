import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign } from 'lucide-react';

interface BudgetSummaryWidgetProps {
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    percentage: number;
  };
}

export function BudgetSummaryWidget({ budgetSummary }: BudgetSummaryWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const remaining = budgetSummary.totalAllocated - budgetSummary.totalSpent;
  const percentageRemaining = 100 - budgetSummary.percentage;

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Budget Overview</CardTitle>
        <Button variant="ghost" size="sm">Details</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Allocated</span>
            <span className="text-2xl font-bold">{formatCurrency(budgetSummary.totalAllocated)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-semibold">{budgetSummary.percentage.toFixed(1)}%</span>
          </div>
          <Progress value={budgetSummary.percentage} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-accent/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Spent</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(budgetSummary.totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetSummary.percentage.toFixed(1)}% of budget
            </p>
          </div>

          <div className="p-4 rounded-lg bg-accent/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Remaining</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(remaining)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {percentageRemaining.toFixed(1)}% available
            </p>
          </div>
        </div>

        {/* Budget Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fiscal Year 2024</span>
            {budgetSummary.percentage > 90 ? (
              <span className="text-destructive font-medium">Action Required</span>
            ) : budgetSummary.percentage > 75 ? (
              <span className="text-warning font-medium">Monitor Closely</span>
            ) : (
              <span className="text-success font-medium">On Track</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}