import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useFinanceOverview, useDashboardSummary } from '@/hooks/api/useOverview';
import { useTasks } from '@/hooks/api/useTasks';
import { useMeetings } from '@/hooks/api/useMeetings';
import { Download, TrendingUp, Calendar, CheckCircle2, DollarSign, Users, FileText, Loader2 } from 'lucide-react';

import type { Task, Meeting, FinanceOverview, DashboardStats, PaginatedResponse } from '@/types/api.types';

// Local interfaces
interface AttendanceDataPoint {
  month: string;
  attendance: number;
}

interface BudgetItem {
  category: string;
  allocated: number;
  spent: number;
}

interface TaskStatusData {
  status: string;
  count: number;
}

export function Reports() {
  const { data: financeData, isLoading: financeLoading } = useFinanceOverview();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary();
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const { data: meetingsData, isLoading: meetingsLoading } = useMeetings();

  const isLoading = financeLoading || dashboardLoading || tasksLoading || meetingsLoading;

  // Safely extract tasks and meetings arrays
  const tasks: Task[] = Array.isArray(tasksData) 
    ? tasksData 
    : (tasksData as PaginatedResponse<Task>)?.items || [];
  const meetings: Meeting[] = Array.isArray(meetingsData) 
    ? meetingsData 
    : (meetingsData as PaginatedResponse<Meeting>)?.items || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Meeting attendance data from dashboard or fallback
  const attendanceData: AttendanceDataPoint[] = (dashboardData as DashboardStats)?.attendanceTrend || 
    [{ month: 'Jan', attendance: 0 }, { month: 'Feb', attendance: 0 }, { month: 'Mar', attendance: 0 }];

  // Budget data from finance overview or fallback
  const budgets: BudgetItem[] = ((financeData as FinanceOverview)?.categories || []).map(c => ({
    category: c.name,
    allocated: c.allocated,
    spent: c.spent,
  }));
  const budgetData = budgets.map((b: BudgetItem) => ({
    category: b.category,
    allocated: b.allocated,
    spent: b.spent,
    remaining: b.allocated - b.spent
  }));

  // Task completion data
  const taskStatusData: TaskStatusData[] = [
    { status: 'To Do', count: tasks.filter((t: Task) => t.status === 'TODO').length },
    { status: 'In Progress', count: tasks.filter((t: Task) => t.status === 'IN_PROGRESS').length },
    { status: 'Completed', count: tasks.filter((t: Task) => t.status === 'COMPLETED').length },
  ];

  // Dashboard stats from financeData and dashboardData with proper typing
  const typedFinance = financeData as FinanceOverview | undefined;
  const typedDashboard = dashboardData as DashboardStats | undefined;
  
  const stats = {
    budgetSummary: {
      totalAllocated: typedFinance?.allocatedBudget || 0,
      totalSpent: typedFinance?.spentBudget || 0,
      percentage: typedFinance?.budgetUtilization || 0,
    },
    recentDocuments: typedDashboard?.recentDocuments || [],
    activePolls: typedDashboard?.activePolls || 0,
    upcomingMeetings: typedDashboard?.upcomingMeetings || [],
    attendanceTrend: attendanceData,
  };

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
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
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
            <div className="flex items-center gap-1 mt-2 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              <span>3 upcoming</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Open Tasks</span>
              <CheckCircle2 className="h-4 w-4 text-warning" />
            </div>
            <p className="text-3xl font-bold">{tasks.filter((t: Task) => t.status !== 'COMPLETED').length}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>{tasks.filter((t: Task) => t.status === 'COMPLETED').length} completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Budget Utilization</span>
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{stats.budgetSummary.percentage.toFixed(0)}%</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>{formatCurrency(stats.budgetSummary.totalSpent)} spent</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Attendance</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">
              {(stats.attendanceTrend.reduce((sum, item) => sum + item.attendance, 0) / stats.attendanceTrend.length).toFixed(1)}%
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-success">
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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget by Category</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="category" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value: number | string) => formatCurrency(Number(value) || 0)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="allocated" fill="hsl(var(--primary))" name="Allocated" />
                  <Bar dataKey="spent" fill="hsl(var(--chart-2))" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Task Status Distribution</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="status" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.recentDocuments.length}</p>
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Polls</p>
                  <p className="text-2xl font-bold">{stats.activePolls}</p>
                </div>
              </div>
              <Badge variant="warning">Pending</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">
                    {tasks.length > 0 ? ((tasks.filter((t: Task) => t.status === 'COMPLETED').length / tasks.length) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
              <Badge variant="default">Good</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Meetings</p>
                  <p className="text-2xl font-bold">{stats.upcomingMeetings.length}</p>
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