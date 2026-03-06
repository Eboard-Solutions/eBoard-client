import { Route, Router, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SignIn } from "@/pages/auth/SignIn";
import { SignUp } from "@/pages/auth/SignUp";
import { UserLogin } from "@/pages/auth/UserLogin";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { Dashboard } from "@/pages/Dashboard";
import { Meetings } from "@/pages/Meetings";
import LiveMeeting from "@/pages/LiveMeeting";
import Members from "@/pages/Members";
import { Documents } from "@/pages/Documents";
import { Voting } from "@/pages/Voting";
import { Tasks } from "@/pages/Tasks";
import { Finance } from "@/pages/Finance";
import { Announcements } from "@/pages/Announcements";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";
import { CreateAdmin } from "@/pages/admin/CreateAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

function UnauthorizedPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass max-w-md w-full border-destructive/50">
        <CardContent className="p-12">
          <div className="text-center">
            <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access this page.
            </p>
            <Button onClick={() => setLocation("/")}>
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Sorry, this page doesn't exist.
        </p>
        <Button onClick={() => setLocation("/")}>
          <Home className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router base="/">
        <Switch>
          {/* Auth Routes - No Layout */}
          <Route path="/auth/signin" component={SignIn} />
          <Route path="/auth/sign-up" component={SignUp} />
          <Route path="/auth/signup" component={SignUp} />
          <Route path="/auth/userLogin" component={UserLogin} />
          <Route path="/auth/forgot-password" component={ForgotPassword} />
          <Route path="/unauthorized" component={UnauthorizedPage} />

          {/* Root */}
          <Route path="/">
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Dashboard */}
          <Route path="/dashboard">
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/dashboard/board-member">
            <ProtectedRoute requiredRole={["board_member", "admin", "super_admin"]}>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Meetings */}
          <Route path="/meetings">
            <ProtectedRoute>
              <AppLayout>
                <Meetings />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          <Route path="/meetings/live/:id">
            <ProtectedRoute>
              <AppLayout>
                <LiveMeeting />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Members */}
          <Route path="/members">
            <ProtectedRoute>
              <AppLayout>
                <Members />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Documents */}
          <Route path="/documents">
            <ProtectedRoute>
              <AppLayout>
                <Documents />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Voting */}
          <Route path="/voting">
            <ProtectedRoute>
              <AppLayout>
                <Voting />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Tasks */}
          <Route path="/tasks">
            <ProtectedRoute>
              <AppLayout>
                <Tasks />
              </AppLayout>
            </ProtectedRoute>
          </Route>

        <Route path="/finance">
          <ProtectedRoute allowedRoles={['OrgAdmin', 'SuperAdmin']}>
            <AppLayout>
              <Finance />
            </AppLayout>
          </ProtectedRoute>
        </Route>

          {/* Announcements */}
          <Route path="/announcements">
            <ProtectedRoute>
              <AppLayout>
                <Announcements />
              </AppLayout>
            </ProtectedRoute>
          </Route>

        <Route path="/reports">
          <ProtectedRoute allowedRoles={['OrgAdmin', 'SuperAdmin']}>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        </Route>

          {/* Settings */}
          <Route path="/settings">
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          </Route>

          {/* Super Admin */}
          <Route path="/super-admin">
            <ProtectedRoute requiredRole="super_admin">
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          </Route>

        <Route path="/admin/create">
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <AppLayout>
              <CreateAdmin />
            </AppLayout>
          </ProtectedRoute>
        </Route>

          {/* 404 Fallback */}
          <Route component={NotFoundPage} />
        </Switch>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;