// src/App.tsx
import { Route, Router, Switch, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/sonner"; // or sonner Toaster
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { authService } from "@/lib/auth";

// ── Auth Pages ───────────────────────────────────────────────────────────────
import { SignIn } from "@/pages/auth/SignIn";
import { SignUp } from "@/pages/auth/SignUp";
import { UserLogin } from "@/pages/auth/UserLogin"; // ← possibly unused / duplicate?
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { ActivateAccount } from "@/pages/auth/ActivateAccount";
import { ResetPasswordForm } from "@/pages/auth/ResetPasswordForm";

// ── Main App Pages ───────────────────────────────────────────────────────────
import { Dashboard } from "@/pages/Dashboard";
import Meetings from "@/pages/Meetings";
import LiveMeeting from "@/pages/LiveMeeting";
import Members from "@/pages/Members";
import { Documents } from "@/pages/Documents";
import { Voting } from "@/pages/Voting";
import { Tasks } from "@/pages/Tasks";
import { Finance } from "@/pages/Finance";
import { Announcements } from "@/pages/Announcements";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import OrganisationPage from "@/pages/Organisation";

// ── Super Admin Pages ────────────────────────────────────────────────────────
import { SuperAdminDashboard } from "@/pages/super-admin/SuperAdminDashboard";
import { UsersManagement } from "@/pages/super-admin/UsersManagement";
import { OrganisationsManagement } from "@/pages/super-admin/OrganisationsManagement";
import { CreateSuperAdminPage } from "@/pages/super-admin/CreateSuperAdminPage";
import { MeetingsOverview } from "@/pages/super-admin/MeetingsOverview";
import { DocumentsOverview } from "@/pages/super-admin/DocumentsOverview";
import { TasksOverview } from "@/pages/super-admin/TasksOverview";
import { PollsOverview } from "@/pages/super-admin/PollsOverview";
import { AnnouncementsOverview } from "@/pages/super-admin/AnnouncementsOverview";
import { FinanceOverviewPage } from "@/pages/super-admin/FinanceOverviewPage";
import { SettingsManagement } from "@/pages/super-admin/SettingsManagement";

// ── Error / Utility Components ───────────────────────────────────────────────
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home } from "lucide-react";

function UnauthorizedPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-10 text-center">
          <ShieldAlert className="h-16 w-16 mx-auto mb-5 text-destructive" />
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-muted-foreground mb-8">
            You don&apos;t have permission to access this page.
          </p>
          <Button onClick={() => setLocation("/")}>
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
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
        <h1 className="text-7xl font-extrabold mb-4 text-primary">404</h1>
        <p className="text-2xl font-medium mb-6 text-muted-foreground">
          Page not found
        </p>
        <Button onClick={() => setLocation("/dashboard")}>
          <Home className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

function RootRedirect() {
  const user = authService.getUser();
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  if (!user) {
    return <Redirect to="/auth/signin" />;
  }

  return <Redirect to={isSuperAdmin ? "/super-admin" : "/dashboard"} />;
}

// ──────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router base="/">
        <Switch>
          {/* ── Public / Auth Routes ── */}
          <Route path="/auth/signin" component={SignIn} />
          <Route path="/auth/signup" component={SignUp} />
          <Route path="/auth/user-login" component={UserLogin} />{" "}
          {/* possibly legacy */}
          <Route path="/auth/forgot-password" component={ForgotPassword} />
          <Route path="/auth/activate-account" component={ActivateAccount} />
          <Route path="/auth/reset-password" component={ResetPasswordForm} />
          <Route path="/unauthorized" component={UnauthorizedPage} />
          {/* ── Root → smart redirect ── */}
          <Route path="/" component={RootRedirect} />
          {/* ── Main App Routes (user + admin) ── */}
          <Route path="/dashboard">
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/meetings">
            <ProtectedRoute>
              <AppLayout>
                <Meetings />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/meetings/live/:id">
            <ProtectedRoute>
              <AppLayout fullWidth>
                <LiveMeeting />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/members">
            <ProtectedRoute>
              <AppLayout>
                <Members />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/documents">
            <ProtectedRoute>
              <AppLayout>
                <Documents />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/voting">
            <ProtectedRoute>
              <AppLayout>
                <Voting />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/tasks">
            <ProtectedRoute>
              <AppLayout>
                <Tasks />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/finance">
            <ProtectedRoute requiredRoles={["admin", "superadmin"]}>
              <AppLayout>
                <Finance />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/announcements">
            <ProtectedRoute>
              <AppLayout>
                <Announcements />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/reports">
            <ProtectedRoute requiredRoles={["admin", "superadmin"]}>
              <AppLayout>
                <Reports />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/settings">
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/organisation">
            <ProtectedRoute>
              <AppLayout>
                <OrganisationPage />
              </AppLayout>
            </ProtectedRoute>
          </Route>
          {/* ── Super Admin Section ── */}
          <Route path="/super-admin">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <SuperAdminDashboard />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/users">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <UsersManagement />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/organisations">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <OrganisationsManagement />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/create-admin">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <CreateSuperAdminPage />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/meetings">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <MeetingsOverview />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/documents">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <DocumentsOverview />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/tasks">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <TasksOverview />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/polls">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <PollsOverview />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/announcements">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <AnnouncementsOverview />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/finance">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <FinanceOverviewPage />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/super-admin/settings">
            <ProtectedRoute requiredRoles={["superadmin"]}>
              <SuperAdminLayout>
                <SettingsManagement />
              </SuperAdminLayout>
            </ProtectedRoute>
          </Route>
          {/* ── Catch-all 404 ── */}
          <Route component={NotFoundPage} />
        </Switch>

        <Toaster richColors position="top-right" closeButton />
      </Router>
    </QueryClientProvider>
  );
}
