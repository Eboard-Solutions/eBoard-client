// src/App.tsx
import { useEffect, useState } from 'react';
import React from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { TokenService } from '@/api/client';

// ── Auth Pages ───────────────────────────────────────────────────────────────
import { SignIn }         from '@/pages/auth/SignIn';
import { SignUp }         from '@/pages/auth/SignUp';
import { UserLogin }      from '@/pages/auth/UserLogin';     // possibly legacy
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { ActivateAccount }    from '@/pages/auth/ActivateAccount';
import { ResetPasswordForm }  from '@/pages/auth/ResetPasswordForm';

// ── Main App Pages ───────────────────────────────────────────────────────────
import { Dashboard }     from '@/pages/Dashboard';
import CalendarPage      from '@/pages/CalendarPage';
import Meetings          from '@/pages/Meetings';
import Agendas           from '@/pages/Agendas';
import Minutes           from '@/pages/Minutes';
import LiveMeeting       from '@/pages/LiveMeeting';
import Members           from '@/pages/Members';
import { Documents }     from '@/pages/Documents';
import { Voting }        from '@/pages/Voting';
import { Tasks }         from '@/pages/Tasks';
import { Finance }       from '@/pages/Finance';
import { Announcements } from '@/pages/Announcements';
import { Reports }       from '@/pages/Reports';
import { Settings }      from '@/pages/Settings';
import OrganisationPage  from '@/pages/Organisation';
import Profile           from '@/pages/Profile';
import Landing           from '@/pages/Landing';

// ── Board Member Dashboard ───────────────────────────────────────────────────
import {
  BoardMemberDashboard,
  MeetingsPage        as BoardMeetingsPage,
  DocumentsPage       as BoardDocumentsPage,
  ResolutionsPage     as BoardResolutionsPage,
  TasksPage           as BoardTasksPage,
  PollsPage           as BoardPollsPage,
  AnnouncementsPage   as BoardAnnouncementsPage,
  MessagesPage        as BoardMessagesPage,
  NotificationsPage   as BoardNotificationsPage,
  CompliancePage      as BoardCompliancePage,
  AnalyticsPage       as BoardAnalyticsPage,
  ArchivesPage        as BoardArchivesPage,
  ProfilePage         as BoardProfilePage,
} from '@/features/board-member';

// ── Super Admin Pages ────────────────────────────────────────────────────────
import { SuperAdminDashboard }     from '@/pages/super-admin/SuperAdminDashboard';
import { UsersManagement }         from '@/pages/super-admin/UsersManagement';
import { OrganisationsManagement } from '@/pages/super-admin/OrganisationsManagement';
import { CreateSuperAdminPage }    from '@/pages/super-admin/CreateSuperAdminPage';
// import { MeetingsOverview }        from '@/pages/super-admin/MeetingsOverview';
// import { DocumentsOverview }       from '@/pages/super-admin/DocumentsOverview';
// import { TasksOverview }           from '@/pages/super-admin/TasksOverview';
// import { PollsOverview }           from '@/pages/super-admin/PollsOverview';
// import { AnnouncementsOverview }   from '@/pages/super-admin/AnnouncementsOverview';
import { FinanceOverviewPage }     from '@/pages/super-admin/FinanceOverviewPage';
import { SettingsManagement }      from '@/pages/super-admin/SettingsManagement';

import { Card, CardContent } from '@/components/ui/card';
import { Button }            from '@/components/ui/button';
import { ShieldAlert, Home } from 'lucide-react';

// ─── Utility Pages ───────────────────────────────────────────────────────────

function UnauthorizedPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/50">
        <CardContent className="p-10 text-center">
          <ShieldAlert className="h-16 w-16 mx-auto mb-5 text-destructive" />
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-muted-foreground mb-8">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => setLocation('/')}>
            <Home className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-7xl font-extrabold mb-4 text-indigo-600">404</h1>
        <p className="text-2xl font-medium mb-6 text-muted-foreground">
          Page not found
        </p>
        <Button onClick={() => setLocation('/dashboard')}>
          <Home className="mr-2 h-4 w-4" /> Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ─── Root Redirect (role-based) ─────────────────────────────────────────────

function RootRedirect() {
  const [, setLocation] = useLocation();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const token = TokenService.getAccessToken();
    if (!token) {
      setShowLanding(true);
      return;
    }

    const user = TokenService.getUser<{ role: string }>();
    if (!user) {
      setShowLanding(true);
      return;
    }

    const role = user.role?.toLowerCase().replace(/[_\s-]/g, '') ?? '';

    if (role === 'superadmin')  { setLocation('/super-admin'); return; }
    if (role === 'boardmember') { setLocation('/board');       return; }

    setLocation('/dashboard');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return showLanding ? <Landing /> : null;
}

// ─── Route Helpers ───────────────────────────────────────────────────────────

interface AppRouteProps {
  path: string;
  roles?: string[];
  fullWidth?: boolean;
  children: React.ReactNode;
}

function AppRoute({ path, roles, fullWidth, children }: AppRouteProps) {
  return (
    <Route path={path}>
      <ProtectedRoute requiredRoles={roles}>
        <AppLayout fullWidth={fullWidth}>{children}</AppLayout>
      </ProtectedRoute>
    </Route>
  );
}

function BoardRoute({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <Route path={path}>
      <ProtectedRoute requiredRoles={['boardmember', 'orgadmin', 'superadmin']}>
        <AppLayout fullWidth>{children}</AppLayout>
      </ProtectedRoute>
    </Route>
  );
}

function SuperRoute({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <Route path={path}>
      <ProtectedRoute requiredRoles={['superadmin']}>
        <SuperAdminLayout>{children}</SuperAdminLayout>
      </ProtectedRoute>
    </Route>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router base="/">
        <Switch>
          {/* ── Public / Auth ──────────────────────────────────────── */}
          <Route path="/auth/signin"          component={SignIn} />
          <Route path="/auth/signup"          component={SignUp} />
          <Route path="/auth/user-login"      component={UserLogin} />
          <Route path="/auth/forgot-password" component={ForgotPassword} />
          <Route path="/auth/activate-account"    component={ActivateAccount} />
          <Route path="/auth/reset-password"      component={ResetPasswordForm} />
          <Route path="/unauthorized"         component={UnauthorizedPage} />

          {/* ── Root: role-based redirect ──────────────────────────── */}
          <Route path="/" component={RootRedirect} />

          {/* ── Main App (most users + org admins) ─────────────────── */}
          <AppRoute path="/dashboard">     <Dashboard />        </AppRoute>
          <AppRoute path="/calendar">      <CalendarPage />      </AppRoute>
          <AppRoute path="/meetings">      <Meetings />         </AppRoute>
          <AppRoute path="/agendas">       <Agendas />          </AppRoute>
          <AppRoute path="/minutes">       <Minutes />          </AppRoute>
          <AppRoute path="/members">       <Members />          </AppRoute>
          <AppRoute path="/documents">     <Documents />        </AppRoute>
          <AppRoute path="/voting">        <Voting />           </AppRoute>
          <AppRoute path="/tasks">         <Tasks />            </AppRoute>
          <AppRoute path="/announcements"> <Announcements />    </AppRoute>
          <AppRoute path="/organisation">  <OrganisationPage /> </AppRoute>
          <AppRoute path="/profile">       <Profile />          </AppRoute>
          <AppRoute path="/settings">      <Settings />         </AppRoute>

          <AppRoute path="/meetings/live/:id" fullWidth>
            <LiveMeeting />
          </AppRoute>

          <AppRoute path="/finance"  roles={['admin', 'orgadmin', 'superadmin']}>
            <Finance />
          </AppRoute>
          <AppRoute path="/reports"  roles={['admin', 'orgadmin', 'superadmin']}>
            <Reports />
          </AppRoute>

          {/* ── Board Member Routes ────────────────────────────────── */}
          <BoardRoute path="/board">               <BoardMemberDashboard />   </BoardRoute>
          <BoardRoute path="/board/calendar">      <CalendarPage />          </BoardRoute>
          <BoardRoute path="/board/meetings">      <BoardMeetingsPage />      </BoardRoute>
          <BoardRoute path="/board/documents">     <BoardDocumentsPage />     </BoardRoute>
          <BoardRoute path="/board/resolutions">   <BoardResolutionsPage />   </BoardRoute>
          <BoardRoute path="/board/tasks">         <BoardTasksPage />         </BoardRoute>
          <BoardRoute path="/board/polls">         <BoardPollsPage />         </BoardRoute>
          <BoardRoute path="/board/announcements"> <BoardAnnouncementsPage /> </BoardRoute>
          <BoardRoute path="/board/messages">      <BoardMessagesPage />      </BoardRoute>
          <BoardRoute path="/board/notifications"> <BoardNotificationsPage /> </BoardRoute>
          <BoardRoute path="/board/compliance">    <BoardCompliancePage />    </BoardRoute>
          <BoardRoute path="/board/analytics">     <BoardAnalyticsPage />     </BoardRoute>
          <BoardRoute path="/board/archives">      <BoardArchivesPage />      </BoardRoute>
          <BoardRoute path="/board/profile">       <BoardProfilePage />       </BoardRoute>

          {/* ── Super Admin Routes ─────────────────────────────────── */}
          <SuperRoute path="/super-admin">                <SuperAdminDashboard />     </SuperRoute>
          <SuperRoute path="/super-admin/users">          <UsersManagement />         </SuperRoute>
          <SuperRoute path="/super-admin/organisations">  <OrganisationsManagement /> </SuperRoute>
          <SuperRoute path="/super-admin/create-admin">   <CreateSuperAdminPage />    </SuperRoute>
          {/* <SuperRoute path="/super-admin/meetings">       <MeetingsOverview />        </SuperRoute>
          <SuperRoute path="/super-admin/documents">      <DocumentsOverview />       </SuperRoute>
          <SuperRoute path="/super-admin/tasks">          <TasksOverview />           </SuperRoute>
          <SuperRoute path="/super-admin/polls">          <PollsOverview />           </SuperRoute>
          <SuperRoute path="/super-admin/announcements">  <AnnouncementsOverview />   </SuperRoute> */}
          <SuperRoute path="/super-admin/finance">        <FinanceOverviewPage />     </SuperRoute>
          <SuperRoute path="/super-admin/settings">       <SettingsManagement />      </SuperRoute>

          {/* ── 404 Catch-all ──────────────────────────────────────── */}
          <Route component={NotFoundPage} />
        </Switch>

        <Toaster richColors position="top-center" closeButton />
      </Router>
    </QueryClientProvider>
  );
}