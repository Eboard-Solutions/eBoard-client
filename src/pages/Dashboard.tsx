// src/pages/Dashboard.tsx
import { useState } from 'react';
import { UpcomingMeetingsWidget } from '@/components/dashboard/UpcomingMeetingsWidget';
import { OpenActionsWidget } from '@/components/dashboard/OpenActionsWidget';
import { BudgetSummaryWidget } from '@/components/dashboard/BudgetSummaryWidget';
import { VotingOverviewWidget } from '@/components/dashboard/VotingOverviewWidget';
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget';
import { RecentDocumentsWidget } from '@/components/dashboard/RecentDocumentsWidget';

// Import React Query hooks for real data
import { useMyMeetings } from '@/hooks/api/useMeetings';
import { useAnnouncements } from '@/hooks/api/useAnnouncements';
import { useDocuments } from '@/hooks/api/useDocuments';
import { useTasks } from '@/hooks/api/useTasks';
import { usePolls } from '@/hooks/api/usePolls';
import { useAnalytics, useFinanceOverview } from '@/hooks/api/useOverview';
import { usePendingOrganisations, useOrganisations } from '@/hooks/api/useOrganisations';
import { authService } from '@/api/services';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';
import {
    Megaphone, X, Loader2, Users, Building2, CheckCircle,
    Clock, AlertTriangle, TrendingUp, BarChart3,
    Vote, ListTodo
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    variant?: 'default' | 'warning' | 'success';
}

function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
    const variantStyles = {
        default: 'border-border',
        warning: 'border-yellow-500/40 bg-yellow-500/5',
        success: 'border-green-500/40 bg-green-500/5',
    };

    return (
        <Card className={`glass ${variantStyles[variant]}`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                        {trend !== undefined && (
                            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trend >= 0 ? '+' : ''}{trend}% from last month
                            </p>
                        )}
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ActivityItem({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD - Role-based component selector
// ═══════════════════════════════════════════════════════════════════════════════

export function Dashboard() {
    const currentUser = authService.getCurrentUser();

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

    // Normalize role to lowercase for comparison
    const role = currentUser.role?.toLowerCase();

    if (role === 'superadmin' || role === 'super_admin') {
        return <SuperAdminDashboard userName={currentUser.name} />;
    }

    if (role === 'orgadmin' || role === 'org_admin' || role === 'admin') {
        return <OrgAdminDashboard userName={currentUser.name} />;
    }

    // Default: regular user/board member dashboard
    return <UserDashboard userName={currentUser.name} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN DASHBOARD - System-wide management view
// ═══════════════════════════════════════════════════════════════════════════════

function SuperAdminDashboard({ userName }: { userName: string }) {
    const { data: analyticsRes, isLoading: statsLoading } = useAnalytics();
    const { data: pendingOrgsRes, isLoading: pendingLoading } = usePendingOrganisations();
    const { data: allOrgsRes, isLoading: orgsLoading } = useOrganisations();

    const isLoading = statsLoading || pendingLoading || orgsLoading;

    const analytics = analyticsRes?.data;
    const pendingOrgsList = Array.isArray(pendingOrgsRes) ? pendingOrgsRes : [];
    const orgsList = Array.isArray(allOrgsRes) ? allOrgsRes : [];

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    System Administration
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome back, {userName?.split(' ')[0] ?? 'Admin'}. Here's your system overview.
                </p>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading system data...</span>
                </div>
            )}

            {!isLoading && (
                <>
                    {/* System Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Organizations"
                            value={orgsList.length}
                            icon={Building2}
                        />
                        <StatCard
                            title="Active Users"
                            value={analytics?.openTasks?.length || 0}
                            icon={Users}
                        />
                        <StatCard
                            title="Pending Approvals"
                            value={pendingOrgsList.length}
                            icon={Clock}
                            variant={pendingOrgsList.length > 0 ? 'warning' : 'default'}
                        />
                        <StatCard
                            title="System Health"
                            value="Good"
                            icon={CheckCircle}
                            variant="success"
                        />
                    </div>

                    {/* Pending Organizations */}
                    {pendingOrgsList.length > 0 && (
                        <Card className="glass border-yellow-500/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    Pending Organization Approvals
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {pendingOrgsList.slice(0, 5).map((org: any) => (
                                        <div key={org.organisationId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div>
                                                <p className="font-medium">{org.organisationName ?? org.id}</p>
                                                <p className="text-sm text-muted-foreground">{org.OrgEmail}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="default">Approve</Button>
                                                <Button size="sm" variant="outline">Review</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {pendingOrgsList.length > 5 && (
                                    <Button variant="link" className="mt-4 w-full">
                                        View all {pendingOrgsList.length} pending organizations
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Organizations Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="glass">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Recent Organizations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {orgsList.slice(0, 5).map((org: any) => (
                                        <div key={org.organisationId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div>
                                                <p className="font-medium">{org.organisationName ?? org.id}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {org.status || 'Active'}
                                                </p>
                                            </div>
                                            <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                                                {org.status || 'Active'}
                                            </Badge>
                                        </div>
                                    ))}
                                    {orgsList.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No organizations registered yet.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    System Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <ActivityItem label="Organizations" value={orgsList.length} />
                                    <ActivityItem label="Pending approvals" value={pendingOrgsList.length} />
                                    <ActivityItem label="Total members" value={analytics?.openTasks?.length || 0} />
                                    <ActivityItem label="Active meetings" value={analytics?.upcomingMeetings?.length ?? 0} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ADMIN DASHBOARD - Organization management view
// ═══════════════════════════════════════════════════════════════════════════════

function OrgAdminDashboard({ userName }: { userName: string }) {
    const { data: analyticsRes, isLoading: analyticsLoading } = useAnalytics();
    const { data: financeRes, isLoading: financeLoading } = useFinanceOverview();
    const { data: meetingsRes, isLoading: meetingsLoading } = useMyMeetings();
    const { data: tasksRes, isLoading: tasksLoading } = useTasks();
    const { data: pollsRes, isLoading: pollsLoading } = usePolls();
    const { data: announcementsRes, isLoading: announcementsLoading } = useAnnouncements();

    const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

    const isLoading = analyticsLoading || financeLoading || meetingsLoading || tasksLoading || pollsLoading || announcementsLoading;

    const analytics = analyticsRes?.data;
    const finance = financeRes?.data;
    const meetings = Array.isArray(meetingsRes?.data) ? meetingsRes.data : [];
    const tasks = Array.isArray(tasksRes?.data) ? tasksRes.data : (tasksRes?.data as any)?.items || [];
    const polls = Array.isArray(pollsRes?.data) ? pollsRes.data : (pollsRes?.data as any)?.items || [];
    const announcements = Array.isArray(announcementsRes?.data) ? announcementsRes.data : (announcementsRes?.data as any)?.items || [];

    const pinnedAnnouncements = announcements.filter(
        (a: any) => a.isPinned && !dismissedAnnouncements.includes(a.id)
    );

    // Transform meetings for widgets
    const upcomingMeetings = meetings
        .filter((m: any) => new Date(m.date) > new Date())
        .slice(0, 5)
        .map((meeting: any) => ({
            id: meeting.id,
            title: meeting.title,
            startAt: meeting.startTime,
            endAt: meeting.endTime,
            timezone: 'UTC',
            location: meeting.location || meeting.onlineMeetingLink,
            isRecurring: meeting.meetingFrequency !== 'once',
            status: (meeting.status || 'upcoming') as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
            agenda: [],
            attendees: [],
            createdBy: '',
            createdAt: meeting.createdAt || '',
        }));

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Organization Dashboard
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome back, {userName?.split(' ')[0] ?? 'Admin'}. Manage your organization effectively.
                </p>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading organization data...</span>
                </div>
            )}

            {/* Pinned Announcements */}
            {!isLoading && pinnedAnnouncements.length > 0 && (
                <div className="space-y-4">
                    {pinnedAnnouncements.map((announcement: any) => (
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
                                            <Badge variant="secondary" className="text-xs">Pinned</Badge>
                                        </div>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {announcement.content}
                                        </p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setDismissedAnnouncements(prev => [...prev, announcement.id])}
                                        className="h-9 w-9 shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Active Members"
                            value={analytics?.openTasks?.length || 0}
                            icon={Users}
                        />
                        <StatCard
                            title="Open Tasks"
                            value={tasks.filter((t: any) => t.status !== 'completed').length}
                            icon={ListTodo}
                            variant={tasks.filter((t: any) => t.status !== 'completed').length > 5 ? 'warning' : 'default'}
                        />
                        <StatCard
                            title="Active Polls"
                            value={polls.length}
                            icon={Vote}
                        />
                        <StatCard
                            title="Budget Used"
                            value={`${finance?.budget?.total?.amount ? Math.round((finance.budget.spent?.amount ?? 0) / finance.budget.total.amount * 100) : 0}%`}
                            icon={TrendingUp}
                            variant={(finance?.budget?.total?.amount && (finance.budget.spent?.amount ?? 0) / finance.budget.total.amount > 0.8) ? 'warning' : 'default'}
                        />
                    </div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-12 gap-6">
                        {/* Left Column */}
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            <UpcomingMeetingsWidget meetings={upcomingMeetings} />
                            <AttendanceWidget attendanceTrend={
                                analytics?.attendanceTrend?.map((t: any) => ({
                                    month: t.month,
                                    attendance: t.value,
                                })) || []
                            } />
                        </div>

                        {/* Middle Column */}
                        <div className="col-span-12 lg:col-span-5 space-y-6">
                            <OpenActionsWidget tasks={tasks.slice(0, 5)} />
                            <VotingOverviewWidget polls={polls.slice(0, 5)} />
                        </div>

                        {/* Right Column */}
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            <BudgetSummaryWidget budgetSummary={{
                                totalAllocated: finance?.budget?.total?.amount || 0,
                                totalSpent: finance?.budget?.spent?.amount || 0,
                                percentage: finance?.budget?.total?.amount ? Math.round((finance.budget.spent?.amount ?? 0) / finance.budget.total.amount * 100) : 0,
                            }} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD - Regular board member view
// ═══════════════════════════════════════════════════════════════════════════════

function UserDashboard({ userName }: { userName: string }) {
    const { data: meetingsRes, isLoading: meetingsLoading } = useMyMeetings();
    const { data: announcementsRes, isLoading: announcementsLoading } = useAnnouncements();
    const { data: documentsRes, isLoading: documentsLoading } = useDocuments({ limit: 5 });
    const { data: tasksRes, isLoading: tasksLoading } = useTasks();
    const { data: pollsRes, isLoading: pollsLoading } = usePolls();

    const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);

    // Extract data from paginated responses
    const announcements = Array.isArray(announcementsRes?.data) ? announcementsRes.data : (announcementsRes?.data as any)?.items || [];
    const documents = Array.isArray(documentsRes?.data) ? documentsRes.data : (documentsRes?.data as any)?.items || [];
    const meetings = Array.isArray(meetingsRes?.data) ? meetingsRes.data : [];
    const tasks = Array.isArray(tasksRes?.data) ? tasksRes.data : (tasksRes?.data as any)?.items || [];
    const polls = Array.isArray(pollsRes?.data) ? pollsRes.data : (pollsRes?.data as any)?.items || [];

    // Filter and transform announcements for display
    const visibleAnnouncements = announcements.filter(
        (a: any) => !dismissedAnnouncements.includes(a.id)
    );
    const pinnedAnnouncements = visibleAnnouncements.filter((a: any) => a.isPinned);

    // Transform meetings for widgets - filter upcoming ones
    const upcomingMeetings = meetings
        .filter((m: any) => new Date(m.date) > new Date())
        .slice(0, 5)
        .map((meeting: any) => ({
            id: meeting.id,
            title: meeting.title,
            startAt: meeting.startTime,
            endAt: meeting.endTime,
            timezone: 'UTC',
            location: meeting.location || meeting.onlineMeetingLink,
            isRecurring: meeting.meetingFrequency !== 'once',
            status: (meeting.status || 'upcoming') as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
            agenda: [],
            attendees: [],
            createdBy: '',
            createdAt: meeting.createdAt || '',
        }));

    // Transform documents for widget
    const recentDocuments = documents.slice(0, 5).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        tags: doc.tags || [],
        version: doc.version,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
        accessLevel: doc.accessLevel || 'private',
    }));

    const isLoading = meetingsLoading || announcementsLoading || documentsLoading || tasksLoading || pollsLoading;

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {userName?.split(' ')[0] ?? 'User'}!
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Here's what's happening with your board today.
                </p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
                </div>
            )}

            {/* Pinned Announcements */}
            {!isLoading && pinnedAnnouncements.length > 0 && (
                <div className="space-y-4">
                    {pinnedAnnouncements.map((announcement: any) => (
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
                                        onClick={() => setDismissedAnnouncements(prev => [...prev, announcement.id])}
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
            {!isLoading && (
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <UpcomingMeetingsWidget meetings={upcomingMeetings} />
                        <AttendanceWidget attendanceTrend={[]} />
                    </div>

                    {/* Middle Column */}
                    <div className="col-span-12 lg:col-span-5 space-y-6">
                        <OpenActionsWidget tasks={tasks.slice(0, 5)} />
                        <VotingOverviewWidget polls={polls.slice(0, 5)} />
                    </div>

                    {/* Right Column */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <BudgetSummaryWidget budgetSummary={{
                            totalAllocated: 0,
                            totalSpent: 0,
                            percentage: 0,
                        }} />
                        <RecentDocumentsWidget documents={recentDocuments} />
                    </div>
                </div>
            )}
        </div>
    );
}