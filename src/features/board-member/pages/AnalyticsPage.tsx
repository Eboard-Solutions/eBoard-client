'use client';

import { CalendarDays, FileText, Award, Clock, TrendingUp } from 'lucide-react';
import { useAnalytics } from '@/hooks/api';
import { unwrap } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget';
import { BudgetSummaryWidget } from '@/components/dashboard/BudgetSummaryWidget';

type AttendancePoint = {
  month: string;
  attendance: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function AnalyticsPage() {
  const { data } = useAnalytics();
  const analytics = unwrap<any>(data) ?? {};

  const attendanceTrend: AttendancePoint[] = Array.isArray(analytics.attendanceTrend)
    ? analytics.attendanceTrend.map((point: any) => ({
        month: String(point?.month ?? ''),
        attendance: toNumber(point?.value),
      }))
    : [];

  const upcomingMeetings = Array.isArray(analytics.upcomingMeetings) ? analytics.upcomingMeetings : [];
  const openTasks = Array.isArray(analytics.openTasks) ? analytics.openTasks : [];
  const activePolls = Array.isArray(analytics.activePolls) ? analytics.activePolls : [];
  const recentDocuments = Array.isArray(analytics.recentDocuments) ? analytics.recentDocuments : [];
  const budgetSummary = analytics.budgetSummary ?? {
    totalAllocated: 0,
    totalSpent: 0,
    percentage: 0,
  };

  const latestAttendance = attendanceTrend.length > 0 ? attendanceTrend[attendanceTrend.length - 1].attendance : 0;
  const averageAttendance =
    attendanceTrend.length > 0
      ? attendanceTrend.reduce((sum, point) => sum + point.attendance, 0) / attendanceTrend.length
      : 0;

  const summaryCards = [
    { label: 'Upcoming meetings', value: upcomingMeetings.length, icon: CalendarDays, color: 'text-indigo-600' },
    { label: 'Open tasks', value: openTasks.length, icon: FileText, color: 'text-emerald-600' },
    { label: 'Active polls', value: activePolls.length, icon: Award, color: 'text-amber-600' },
    { label: 'Recent documents', value: recentDocuments.length, icon: Clock, color: 'text-violet-600' },
  ];

  return (
    <MemberPortalLayout icon={TrendingUp} title="Analytics & Reports" color="bg-rose-500" subtitle="Board performance insights">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <AttendanceWidget attendanceTrend={attendanceTrend} />

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Attendance Snapshot</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Latest attendance</p>
              <p className="text-2xl font-bold mt-1">{latestAttendance}%</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">6-month average</p>
              <p className="text-2xl font-bold mt-1">{averageAttendance.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-4 col-span-2">
              <p className="text-xs text-muted-foreground">Attendance trend points</p>
              <p className="text-2xl font-bold mt-1">{attendanceTrend.length}</p>
            </div>
          </div>
        </div>
      </div>

      <BudgetSummaryWidget budgetSummary={budgetSummary} />
    </MemberPortalLayout>
  );
}