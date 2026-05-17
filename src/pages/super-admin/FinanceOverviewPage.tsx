// src/pages/super-admin/FinanceOverviewPage.tsx
import { DollarSign, TrendingUp, Wallet, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useFinanceOverview } from '@/hooks/api/useOverview';
import type { FinanceOverview } from '@/types/api.types';
import { SuperAdminPageHeader } from './_SuperAdminPageHeader';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export function FinanceOverviewPage() {
  const { data, isLoading, isError } = useFinanceOverview();
  const finance = isError ? undefined : (data as FinanceOverview | undefined);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SuperAdminPageHeader
          icon={DollarSign}
          eyebrow="Platform Data"
          title="Finance"
          subtitle="Platform-wide budget, spending, and recent expenses."
          gradient="from-emerald-600 via-teal-600 to-cyan-700"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!finance && !isLoading) {
    return (
      <div className="space-y-6">
        <SuperAdminPageHeader
          icon={DollarSign}
          eyebrow="Platform Data"
          title="Finance"
          subtitle="Platform-wide budget, spending, and recent expenses."
          gradient="from-emerald-600 via-teal-600 to-cyan-700"
        />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No financial data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budget = finance?.budget;
  const categories = budget?.categories ?? [];
  const recentExpenses = finance?.recentExpenses ?? [];
  const totalBudget = budget?.total?.amount ?? 0;
  const totalSpent = budget?.spent?.amount ?? 0;
  const spentPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        icon={DollarSign}
        eyebrow="Platform Data"
        title="Finance"
        subtitle="Platform-wide budget, spending, and recent expenses."
        gradient="from-emerald-600 via-teal-600 to-cyan-700"
        stats={[
          { label: 'Total Budget', value: formatCurrency(totalBudget), icon: Wallet },
          { label: 'Total Spent',  value: formatCurrency(totalSpent),  icon: TrendingUp },
          { label: 'Used',         value: `${spentPercent}%`,          icon: PieChart },
        ]}
      />

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {budget?.total?.label ?? 'Total Budget'}
                </p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalBudget)}
                </p>
                {budget?.total?.subtext && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{budget.total.subtext}</p>
                )}
              </div>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {budget?.spent?.label ?? 'Total Spent'}
                </p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalSpent)}
                </p>
                {budget?.spent?.subtext && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{budget.spent.subtext}</p>
                )}
              </div>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Budget Used</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{spentPercent}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatCurrency(totalBudget - totalSpent)} remaining
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-white" />
              </div>
            </div>
            <Progress value={spentPercent} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      {categories.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-500" />
              Budget Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(cat => {
                  const pct = cat.allocated > 0 ? Math.round((cat.spent / cat.allocated) * 100) : 0;
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{cat.category}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{cat.fiscalYear}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(cat.allocated)}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(cat.spent)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-gray-500 w-8">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${
                          cat.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {cat.status?.toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExpenses.map((exp, idx) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">{exp.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{exp.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(exp.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {exp.date ? new Date(exp.date).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
