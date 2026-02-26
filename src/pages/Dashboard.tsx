// src/pages/Dashboard.tsx
import { useState } from 'react';
import { UpcomingMeetingsWidget } from '@/components/dashboard/UpcomingMeetingsWidget';
import { OpenActionsWidget } from '@/components/dashboard/OpenActionsWidget';
import { BudgetSummaryWidget } from '@/components/dashboard/BudgetSummaryWidget';
import { VotingOverviewWidget } from '@/components/dashboard/VotingOverviewWidget';
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget';
import { RecentDocumentsWidget } from '@/components/dashboard/RecentDocumentsWidget';

import { getDashboardStats, announcements } from '@/lib/store';

// ────────────────────────────────────────────────
// Pick **ONE** of the following import styles:
// ────────────────────────────────────────────────

// Option A – default export (most common fix for this exact error)
import authService from '@/lib/auth';

// Option B – named export (only if auth.ts uses export const authService = {...})
// import { authService } from '@/lib/auth';

// ────────────────────────────────────────────────

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, X } from 'lucide-react';

export function Dashboard() {
  const stats = getDashboardStats();

  // Safest access pattern – prevents crash even if shape is wrong
  const currentUser = authService?.getCurrentUser?.() ?? null;

  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedAnnouncements.includes(a.id)
  );

  const pinnedAnnouncements = visibleAnnouncements.filter((a) => a.isPinned);

  const dismissAnnouncement = (id: string) => {
    setDismissedAnnouncements((prev) => [...prev, id]);
  };

  // Optional: early return if no user (prevents accessing .name on null)
  if (!currentUser) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold">Not signed in</h2>
        <p className="mt-2 text-muted-foreground">
          Please sign in to view the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {currentUser.name?.split(' ')[0] ?? 'User'}!
        </h1>
        <p className="mt-1 text-muted-foreground">
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
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Megaphone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{announcement.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        Pinned
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
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