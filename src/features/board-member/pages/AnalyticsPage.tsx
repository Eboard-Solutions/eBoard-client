'use client';

import { CalendarDays, FileText, Award, Clock, TrendingUp } from 'lucide-react';
import { useAnalytics } from '@/hooks/api';
import { unwrap } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';

export function AnalyticsPage() {
  const { data } = useAnalytics();
  const analytics = unwrap<any>(data) ?? {
    attendanceRate: 0,
    taskCompletionRate: 0,
    votingParticipationRate: 0,
    meetingsThisQuarter: 0,
    documentsReviewed: 0,
    resolutionsPassed: 0,
    avgMeetingDuration: 0,
    monthlyTrend: [],
  };

  function RingGauge({ value, label, color, sub }: { value: number; label: string; color: string; sub?: string }) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
      <div className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="relative">
          <svg width="90" height="90" className="-rotate-90">
            <circle cx="45" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
            <circle cx="45" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className={color} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-black">{value}%</span>
        </div>
        <p className="text-sm font-semibold text-center">{label}</p>
        {sub && <p className="text-xs text-muted-foreground text-center">{sub}</p>}
      </div>
    );
  }

  const maxBar = Math.max(...analytics.monthlyTrend.map((m: any) => Math.max(m.meetings, m.tasks, m.votes)), 1);

  return (
    <MemberPortalLayout icon={TrendingUp} title="Analytics & Reports" color="bg-rose-500" subtitle="Board performance insights">

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <RingGauge value={analytics.attendanceRate} label="Meeting Attendance" color="text-indigo-500" sub={`${analytics.meetingsThisQuarter} meetings this quarter`} />
        <RingGauge value={analytics.taskCompletionRate} label="Task Completion" color="text-emerald-500" />
        <RingGauge value={analytics.votingParticipationRate} label="Voting Participation" color="text-amber-500" sub={`${analytics.resolutionsPassed} resolutions passed`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Meetings this quarter', value: analytics.meetingsThisQuarter, icon: CalendarDays, color: 'text-indigo-600' },
          { label: 'Documents reviewed', value: analytics.documentsReviewed, icon: FileText, color: 'text-sky-600' },
          { label: 'Resolutions passed', value: analytics.resolutionsPassed, icon: Award, color: 'text-emerald-600' },
          { label: 'Avg meeting duration', value: `${analytics.avgMeetingDuration}min`, icon: Clock, color: 'text-violet-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold mb-5">6-Month Activity Trend</h3>
        <div className="flex items-end gap-3 h-36">
          {analytics.monthlyTrend.map((m: any) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: '100px' }}>
                {[{ val: m.meetings, color: 'bg-indigo-500' }, { val: m.tasks, color: 'bg-emerald-500' }, { val: m.votes, color: 'bg-amber-500' }].map((b, j) => (
                  <div key={j} className={`flex-1 rounded-sm transition-all ${b.color}`} style={{ height: `${Math.round((b.val / maxBar) * 100)}%` }} title={`${b.val}`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{m.month}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {[{ label: 'Meetings', color: 'bg-indigo-500' }, { label: 'Tasks', color: 'bg-emerald-500' }, { label: 'Votes', color: 'bg-amber-500' }].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-sm ${l.color}`} />{l.label}
            </span>
          ))}
        </div>
      </div>
    </MemberPortalLayout>
  );
}