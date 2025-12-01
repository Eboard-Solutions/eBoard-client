import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceWidgetProps {
  attendanceTrend: {
    month: string;
    attendance: number;
  }[];
}

export function AttendanceWidget({ attendanceTrend }: AttendanceWidgetProps) {
  const averageAttendance = attendanceTrend.reduce((sum, item) => sum + item.attendance, 0) / attendanceTrend.length;
  const latestAttendance = attendanceTrend[attendanceTrend.length - 1].attendance;
  const trend = latestAttendance > averageAttendance ? 'up' : 'down';

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Meeting Attendance</CardTitle>
        <Button variant="ghost" size="sm">View Report</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stats */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{latestAttendance}%</p>
            <p className="text-sm text-muted-foreground">Last meeting</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">{averageAttendance.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">6-month avg</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceTrend}>
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
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
          <span className="text-muted-foreground">Trend</span>
          <span className={trend === 'up' ? 'text-success font-medium' : 'text-destructive font-medium'}>
            {trend === 'up' ? '↑' : '↓'} {Math.abs(latestAttendance - averageAttendance).toFixed(1)}% vs average
          </span>
        </div>
      </CardContent>
    </Card>
  );
}