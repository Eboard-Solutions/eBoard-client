import { Route, Router, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/pages/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SignIn } from "@/pages/auth/SignIn";
import { SignUp } from "@/pages/auth/SignUp";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { Dashboard } from "@/pages/Dashboard";
import { Meetings } from "@/pages/Meetings";
import { LiveMeeting } from "@/pages/LiveMeeting";
import { Members } from "@/pages/Members";
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

function UnauthorizedPage() {
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
            <Button onClick={() => window.location.href = '/'}>
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
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Sorry, this page doesn't exist.
        </p>
        <Button onClick={() => window.location.href = '/'}>
          <Home className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router base="/">
      <Switch>
        {/* Auth Routes - No Layout */}
        <Route path="/auth/signin" component={SignIn} />
        <Route path="/auth/signup" component={SignUp} />
        <Route path="/auth/forgot-password" component={ForgotPassword} />
        <Route path="/unauthorized" component={UnauthorizedPage} />

        {/* Protected Routes - With Layout */}
        <Route path="/">
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
            <AppLayout>
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
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
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
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
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

        <Route path="/admin/create">
          <ProtectedRoute requiredRole="super_admin">
            <AppLayout>
              <CreateAdmin />
            </AppLayout>
          </ProtectedRoute>
        </Route>

        {/* 404 */}
        <Route component={NotFoundPage} />
      </Switch>
      <Toaster />
    </Router>
  );
}

export default App;