import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { useFinanceOverview } from '@/hooks/api/useOverview';
import type { FinanceOverview } from '@/types/api.types';
import { DollarSign, Plus, TrendingUp, TrendingDown, Download, Search, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Local interfaces derived from FinanceOverview
interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  date: string;
  budgetId: string;
}

export function Finance() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: financeData, isLoading } = useFinanceOverview();

  const typedFinance = financeData as (FinanceOverview & {
    categories?: Array<{ name: string; allocated: number; spent: number }>;
    recentTransactions?: Array<{ id: string; description: string; amount: number; date: string; category: string }>;
  }) | undefined;

  // Extract budgets from categories
  const budgets: Budget[] = (typedFinance?.categories ?? []).map((c, idx: number) => ({
    id: `cat-${idx}`,
    category: c.name,
    allocated: c.allocated,
    spent: c.spent,
  }));

  // Extract expenses from recent transactions
  const expenses: Expense[] = (typedFinance?.recentTransactions ?? []).map((t) => ({
    id: t.id,
    title: t.description,
    amount: t.amount,
    status: 'approved' as const,
    date: t.date,
    budgetId: t.category,
  }));

  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const spentPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = budgets.map((budget, index) => ({
    name: budget.category,
    value: budget.spent,
    allocated: budget.allocated,
    color: ['#0b6efd', '#12b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
  }));

  const filteredExpenses = expenses.filter(exp =>
    exp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingExpenses = expenses.filter(e => e.status === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground mt-1">
            Budget management and expense tracking
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Submit Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Expense</DialogTitle>
                <DialogDescription>
                  Submit a new expense for approval
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-title">Expense Title</Label>
                  <Input id="exp-title" placeholder="e.g., Office Supplies" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgets.map(budget => (
                          <SelectItem key={budget.id} value={budget.category}>
                            {budget.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt">Receipt (optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <p className="text-sm text-muted-foreground">Click to upload receipt</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button>Submit for Approval</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Budget</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
            <p className="text-xs text-muted-foreground mt-1">Fiscal Year 2024</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {spentPercentage.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalRemaining)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(100 - spentPercentage).toFixed(1)}% available
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Badge variant="warning">{pendingExpenses.length}</Badge>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(pendingExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget by Category */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.map((budget) => {
                const percentage = (budget.spent / budget.allocated) * 100;
                const remaining = budget.allocated - budget.spent;

                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{budget.category}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(budget.spent)} of {formatCurrency(budget.allocated)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{percentage.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(remaining)} left
                        </p>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Spending Distribution */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Spending Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Expenses</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingExpenses.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {filteredExpenses.map((expense) => {
                const budget = budgets.find(b => b.id === expense.budgetId);
                
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{expense.title}</h4>
                        <Badge
                          variant={
                            expense.status === 'approved' ? 'default' :
                            expense.status === 'pending' ? 'warning' :
                            expense.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {expense.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{budget?.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingExpenses.map((expense) => {
                const budget = budgets.find(b => b.id === expense.budgetId);
                
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{expense.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{budget?.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold">{formatCurrency(expense.amount)}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Reject</Button>
                        <Button size="sm">Approve</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingExpenses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No pending expenses
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                No approved expenses to display
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}