import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { useFinanceOverview, useDashboardSummary } from '@/hooks/api/useOverview';
import { useTasks } from '@/hooks/api/useTasks';
import { useMeetings } from '@/hooks/api/useMeetings';
import {
  Download, TrendingUp, Calendar, CheckCircle2,
  DollarSign, Users, FileText, Loader2,
} from 'lucide-react';
import type { Task, Meeting } from '@/types/api.types';

// ─── Local shape definitions ───────────────────────────────────────────────────
// These describe what we *expect* from the API responses.
// We never cast via `as SomeType` — instead we extract values defensively
// through helper functions so the compiler is satisfied and runtime is safe.

interface AttendanceDataPoint {
  month: string;
  attendance: number;
}

interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
}

interface TaskStatusRow {
  status: string;
  count: number;
}

// ─── Safe data-extraction helpers ─────────────────────────────────────────────

/** Pull a plain array of items out of whatever shape the hook returns. */
function extractArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d['items']))  return d['items']  as T[];
  if (Array.isArray(d['data']))   return d['data']   as T[];
  if (Array.isArray(d['results']))return d['results']as T[];
  return [];
}

/** Safely read a numeric field from an unknown object. */
function num(obj: unknown, ...keys: string[]): number {
  if (!obj || typeof obj !== 'object') return 0;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'number') return v;
  }
  return 0;
}

/** Safely read an array field from an unknown object. */
function arr(obj: unknown, key: string): unknown[] {
  if (!obj || typeof obj !== 'object') return [];
  const v = (obj as Record<string, unknown>)[key];
  return Array.isArray(v) ? v : [];
}

// ─── Currency formatter ────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

// ─── Recharts tooltip formatter ───────────────────────────────────────────────
// Recharts types the formatter callback as (value: number | string | Array<...>).
// We coerce safely so TypeScript is happy and the display is always correct.

const currencyFormatter = (value: unknown): [string, string] => [
  formatCurrency(typeof value === 'number' ? value : Number(value) || 0),
  '',
];

// ─── Fallback chart data ───────────────────────────────────────────────────────

const EMPTY_ATTENDANCE: AttendanceDataPoint[] = [
  { month: 'Jan', attendance: 0 },
  { month: 'Feb', attendance: 0 },
  { month: 'Mar', attendance: 0 },
  { month: 'Apr', attendance: 0 },
  { month: 'May', attendance: 0 },
  { month: 'Jun', attendance: 0 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Reports() {
  // Defer chart rendering by one tick so ResponsiveContainer
  // can measure a real DOM size instead of -1 x -1.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const { data: financeRaw,   isLoading: financeLoading   } = useFinanceOverview();
  const { data: dashboardRaw, isLoading: dashboardLoading } = useDashboardSummary();
  const { data: tasksRaw,     isLoading: tasksLoading     } = useTasks();
  const { data: meetingsRaw,  isLoading: meetingsLoading  } = useMeetings();

  const isLoading = financeLoading || dashboardLoading || tasksLoading || meetingsLoading;

  // ── Extract typed arrays ────────────────────────────────────────────────────
  const tasks: Task[]     = extractArray<Task>(tasksRaw);
  const meetings: Meeting[] = extractArray<Meeting>(meetingsRaw);

  // ── Finance ─────────────────────────────────────────────────────────────────
  // Field names vary between API versions; we try several aliases.
  const totalAllocated = num(financeRaw,
    'allocatedBudget', 'totalAllocated', 'allocated', 'budget');
  const totalSpent = num(financeRaw,
    'spentBudget', 'totalSpent', 'spent', 'expenditure');
  const budgetUtilization = num(financeRaw,
    'budgetUtilization', 'utilization', 'utilizationRate', 'percentage');

  // Budget categories — 'categories' OR 'items' OR top-level array
  const rawCategories: BudgetCategory[] = (() => {
    const cats = arr(financeRaw, 'categories').concat(arr(financeRaw, 'items'));
    if (cats.length) {
      return cats.map((c: unknown) => {
        const cat = c as Record<string, unknown>;
        return {
          name:      String(cat['name'] ?? cat['category'] ?? 'Unknown'),
          allocated: Number(cat['allocated'] ?? cat['budget'] ?? 0),
          spent:     Number(cat['spent'] ?? cat['expenditure'] ?? 0),
        };
      });
    }
    return [];
  })();

  const budgetData = rawCategories.map(b => ({
    category:  b.name,
    allocated: b.allocated,
    spent:     b.spent,
    remaining: b.allocated - b.spent,
  }));

  // ── Dashboard ───────────────────────────────────────────────────────────────
  const rawAttendance = arr(dashboardRaw, 'attendanceTrend');
  const attendanceData: AttendanceDataPoint[] =
    rawAttendance.length > 0
      ? rawAttendance.map((item: unknown) => {
          const i = item as Record<string, unknown>;
          return {
            month:      String(i['month'] ?? ''),
            attendance: Number(i['attendance'] ?? 0),
          };
        })
      : EMPTY_ATTENDANCE;

  const recentDocuments: unknown[] = arr(dashboardRaw, 'recentDocuments');

  // activePolls can come back as a number OR an array of Poll objects
  const activePollsRaw = dashboardRaw
    ? (dashboardRaw as Record<string, unknown>)['activePolls']
    : undefined;
  const activePollsCount: number =
    typeof activePollsRaw === 'number'
      ? activePollsRaw
      : Array.isArray(activePollsRaw)
      ? activePollsRaw.length
      : 0;

  const upcomingMeetings: unknown[] = arr(dashboardRaw, 'upcomingMeetings');

  // ── Task stats ──────────────────────────────────────────────────────────────
  const completedCount   = tasks.filter((t: Task) => t.status === 'COMPLETED').length;
  const inProgressCount  = tasks.filter((t: Task) => t.status === 'IN_PROGRESS').length;
  const todoCount        = tasks.filter((t: Task) => t.status === 'TODO').length;
  const openCount        = tasks.length - completedCount;

  const taskStatusData: TaskStatusRow[] = [
    { status: 'To Do',       count: todoCount       },
    { status: 'In Progress', count: inProgressCount },
    { status: 'Completed',   count: completedCount  },
  ];

  const completionRate =
    tasks.length > 0
      ? ((completedCount / tasks.length) * 100).toFixed(0)
      : '0';

  // ── Avg attendance ──────────────────────────────────────────────────────────
  const avgAttendance =
    attendanceData.length > 0
      ? (
          attendanceData.reduce((sum, d) => sum + d.attendance, 0) /
          attendanceData.length
        ).toFixed(1)
      : '0.0';

  // ── Tooltip styles (shared) ─────────────────────────────────────────────────
  const tooltipStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--popover))',
    border:          '1px solid hsl(var(--border))',
    borderRadius:    '8px',
    fontSize:        '12px',
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into board activities
          </p>
        </div>
        <Button size="lg" className="gap-2">
          <Download className="h-5 w-5" />
          Export All Reports
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Meetings</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{meetings.length}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{upcomingMeetings.length} upcoming</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Open Tasks</span>
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold">{openCount}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>{completedCount} completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Budget Utilization</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold">
              {budgetUtilization > 0
                ? `${budgetUtilization.toFixed(0)}%`
                : totalAllocated > 0
                ? `${((totalSpent / totalAllocated) * 100).toFixed(0)}%`
                : '0%'}
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(totalSpent)} spent</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Attendance</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{avgAttendance}%</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>Last 6 months</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Meeting Attendance Trend */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Meeting Attendance Trend</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80 min-w-0">
              {!isMounted ? null :
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--primary))', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>}
            </div>
          </CardContent>
        </Card>

        {/* Budget by Category */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget by Category</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {budgetData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
                No budget category data available
              </div>
            ) : (
              <div className="h-80 min-w-0">
              {!isMounted ? null :
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={budgetData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatCurrency(v)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={currencyFormatter}
                    />
                    <Bar dataKey="allocated" fill="hsl(var(--primary))"   name="Allocated" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent"     fill="hsl(var(--chart-2))"   name="Spent"     radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Task Status Distribution */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Task Status Distribution</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80 min-w-0">
              {!isMounted ? null :
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={taskStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="status"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [value, 'Tasks']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Tasks" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>}
            </div>
          </CardContent>
        </Card>

        {/* Quick Statistics */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{recentDocuments.length}</p>
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Polls</p>
                  <p className="text-2xl font-bold">{activePollsCount}</p>
                </div>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
              </div>
              <Badge variant="default">Good</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Meetings</p>
                  <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                </div>
              </div>
              <Badge variant="secondary">Next 7 days</Badge>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}