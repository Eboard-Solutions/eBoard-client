// src/pages/super-admin/SuperAdminDashboard.tsx
import {
  Users, Building2, ShieldAlert, Clock, TrendingUp, UserCheck, UserX,
  AlertTriangle, Calendar, ListTodo, Vote, DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUsers } from '@/hooks/api/useUsers';
import { useOrganisations, usePendingOrganisations } from '@/hooks/api/useOrganisations';
import { useAnalytics, useFinanceOverview } from '@/hooks/api/useOverview';
import { useLocation } from 'wouter';
import type { User, Organisation, Meeting, AnalyticsData, FinanceOverview } from '@/types/api.types';
import { SuperAdminPageHeader } from './_SuperAdminPageHeader';

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo:  'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
    violet:  'from-violet-500 to-violet-600 shadow-violet-500/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    amber:   'from-amber-500 to-amber-600 shadow-amber-500/25',
    rose:    'from-rose-500 to-rose-600 shadow-rose-500/25',
    blue:    'from-blue-500 to-blue-600 shadow-blue-500/25',
  };
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
            {subtext && <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{subtext}</p>}
          </div>
          <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${colorMap[color] ?? colorMap.indigo} flex items-center justify-center shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: usersResponse = [], isLoading: loadingUsers } = useUsers();
  const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.data ?? []);
  const { data: orgs = [], isLoading: loadingOrgs } = useOrganisations();
  const { data: pendingOrgs = [], isLoading: loadingPending } = usePendingOrganisations();
  const { data: analyticsRaw } = useAnalytics();
  const { data: financeRaw } = useFinanceOverview();

  const analytics = analyticsRaw as AnalyticsData | undefined;
  const finance = financeRaw as FinanceOverview | undefined;

  const activeUsers = users.filter((u: User) => u.status === 'active');
  const inactiveUsers = users.filter((u: User) => u.status !== 'active');
  const activeOrgs = orgs.filter((o: Organisation) => o.status === 'approved');
  const suspendedOrgs = orgs.filter((o: Organisation) => o.status === 'suspended');

  const upcomingMeetings = analytics?.upcomingMeetings ?? [];
  const openTasks = analytics?.openTasks ?? [];
  const activePolls = analytics?.activePolls ?? [];
  const budgetSummary = analytics?.budgetSummary;
  const totalBudget = finance?.budget?.total?.amount ?? budgetSummary?.totalAllocated ?? 0;
  const totalSpent = finance?.budget?.spent?.amount ?? budgetSummary?.totalSpent ?? 0;
  const budgetPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const isLoading = loadingUsers || loadingOrgs || loadingPending;

  return (
    <div className="space-y-4 sm:space-y-6">
      <SuperAdminPageHeader
        icon={ShieldAlert}
        eyebrow="Super Admin"
        title="Platform Dashboard"
        subtitle="Tenants, users, and the activity that's keeping the platform humming."
        stats={[
          { label: 'Users',         value: users.length,        icon: Users },
          { label: 'Organisations', value: orgs.length,         icon: Building2 },
          { label: 'Pending',       value: pendingOrgs.length,  icon: Clock },
          { label: 'Active Users',  value: activeUsers.length,  icon: TrendingUp },
        ]}
      />

      {/* Detail Cards — extra context below the hero stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={users.length} subtext={`${activeUsers.length} active, ${inactiveUsers.length} inactive`} color="indigo" />
          <StatCard icon={Building2} label="Organisations" value={orgs.length} subtext={`${activeOrgs.length} active, ${suspendedOrgs.length} suspended`} color="violet" />
          <StatCard icon={Clock} label="Pending Approval" value={pendingOrgs.length} subtext="Organisations awaiting review" color="amber" />
          <StatCard icon={TrendingUp} label="Active Users" value={activeUsers.length} subtext={`${users.length > 0 ? Math.round((activeUsers.length / users.length) * 100) : 0}% of total users`} color="emerald" />
        </div>
      )}

      {/* Analytics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Upcoming Meetings</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{upcomingMeetings.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Open Tasks</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{openTasks.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25 flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Active Polls</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{activePolls.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25 flex items-center justify-center">
                <Vote className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary */}
      {totalBudget > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Budget Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                ${totalSpent.toLocaleString()} spent of ${totalBudget.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{budgetPercent}%</span>
            </div>
            <Progress value={budgetPercent} className="h-2.5" />
          </CardContent>
        </Card>
      )}

      {/* Upcoming Meetings List */}
      {upcomingMeetings.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Upcoming Meetings
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 text-xs" onClick={() => setLocation('/super-admin/meetings')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {upcomingMeetings.slice(0, 5).map((m: Meeting) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.date ? new Date(m.date).toLocaleDateString() : '—'} · {m.startTime ?? ''}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px] shrink-0">{m.meetingFormat}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Organisations */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Pending Organisations
              </CardTitle>
              {pendingOrgs.length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {pendingOrgs.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                      <div className="h-2.5 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingOrgs.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No pending organisations</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingOrgs.slice(0, 5).map((org: Organisation) => (
                  <div key={org.organisationId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.organisationName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{org.OrgEmail}</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800 text-[10px] shrink-0">Pending</Badge>
                  </div>
                ))}
                {pendingOrgs.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full text-violet-600 dark:text-violet-400" onClick={() => setLocation('/super-admin/organisations')}>
                    View all {pendingOrgs.length} pending
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Recent Users
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400 text-xs" onClick={() => setLocation('/super-admin/users')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                      <div className="h-2.5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {users.slice(0, 5).map((user: User) => (
                  <div key={user.userId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
                      {user.status === 'active' ? (
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <UserX className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Row */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20" onClick={() => setLocation('/super-admin/users')}>
              <Users className="h-5 w-5 text-indigo-500" />
              <span className="text-xs font-medium">Users</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20" onClick={() => setLocation('/super-admin/organisations')}>
              <Building2 className="h-5 w-5 text-violet-500" />
              <span className="text-xs font-medium">Organisations</span>
            </Button>
            {/* <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-900/20" onClick={() => setLocation('/super-admin/meetings')}>
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-medium">Meetings</span>
            </Button>
            {/* <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-green-300 hover:bg-green-50 dark:hover:border-green-700 dark:hover:bg-green-900/20" onClick={() => setLocation('/super-admin/tasks')}>
              <ListTodo className="h-5 w-5 text-green-500" />
              <span className="text-xs font-medium">Tasks</span>
            </Button> */}
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20" onClick={() => setLocation('/super-admin/finance')}>
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="text-xs font-medium">Finance</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-amber-300 hover:bg-amber-50 dark:hover:border-amber-700 dark:hover:bg-amber-900/20" onClick={() => setLocation('/super-admin/settings')}>
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <span className="text-xs font-medium">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
