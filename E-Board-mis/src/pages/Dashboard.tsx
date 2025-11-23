// src/pages/Dashboard.tsx
import { UpcomingMeetingsWidget } from '@/components/dashboard/UpcomingMeetingsWidget';
import { OpenActionsWidget } from '@/components/dashboard/OpenActionsWidget';
import { BudgetSummaryWidget } from '@/components/dashboard/BudgetSummaryWidget';
import { VotingOverviewWidget } from '@/components/dashboard/VotingOverviewWidget';
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget';
import { RecentDocumentsWidget } from '@/components/dashboard/RecentDocumentsWidget';
import { getDashboardStats, announcements } from '@/lib/store';
import { authService } from '@/lib/auth';                     // ← UNCOMMENTED & FIXED
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, X } from 'lucide-react';
import { useState } from 'react';

export function Dashboard() {
  const stats = getDashboardStats();
  const currentUser = authService.getCurrentUser();         // ← Now works!
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedAnnouncements.includes(a.id)
  );

  const pinnedAnnouncements = visibleAnnouncements.filter((a) => a.isPinned);

  const dismissAnnouncement = (id: string) => {
    setDismissedAnnouncements((prev) => [...prev, id]);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {currentUser?.name.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your board today.
        </p>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          {pinnedAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className="glass border-primary/40 bg-primary/5 overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Megaphone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{announcement.title}</h3>
                      <Badge variant="secondary" className="text-xs">Pinned</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {announcement.content}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => dismissAnnouncement(announcement.id)}
                    className="h-9 w-9 shrink-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <UpcomingMeetingsWidget meetings={stats.upcomingMeetings} />
          <AttendanceWidget attendanceTrend={stats.attendanceTrend} />
        </div>

        {/* Middle Column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <OpenActionsWidget tasks={stats.openTasks} />
          <VotingOverviewWidget polls={stats.activePolls} />
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <BudgetSummaryWidget budgetSummary={stats.budgetSummary} />
          <RecentDocumentsWidget documents={stats.recentDocuments} />
        </div>
      </div>
    </div>
  );
}