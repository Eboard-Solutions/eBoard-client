'use client';

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { authService } from '@/lib/auth';

const ROUTES = {
  dashboard: '/',
};

interface Notification {
  type: 'success' | 'error';
  message: string;
  description?: string;
}

export function SuperAdminLogin() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (
    type: 'success' | 'error',
    message: string,
    description?: string
  ) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 4200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showNotification('error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authService.superAdminLogin({
        email: trimmedEmail,
        password,
      });

      showNotification(
        'success',
        `Welcome back${data.user?.firstName ? `, ${data.user.firstName}` : ''}!`
      );

      // Redirect to dashboard - it handles role-based views
      setTimeout(() => {
        setLocation(ROUTES.dashboard);
      }, 1200);
    } catch (err: any) {
      console.error('Login error:', err);

      const msg =
        err.message ||
        err?.response?.data?.message ||
        'Something went wrong. Please try again.';

      showNotification('error', 'Login failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // JSX – unchanged except minor cleanups & safety
  // ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 px-5 py-12 sm:px-6 lg:px-8">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 w-full max-w-sm sm:max-w-md animate-in slide-in-from-top-6 fade-in-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200'
              : 'bg-red-50/95 border-red-200'
          } border rounded-xl shadow-2xl backdrop-blur-sm p-4`}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold text-sm ${
                  notification.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                }`}
              >
                {notification.message}
              </p>
              {notification.description && (
                <p
                  className={`mt-1 text-sm ${
                    notification.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {notification.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 shadow-xl mb-5 mx-auto">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="Logo"
              className="h-10 w-10"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Sign In
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Welcome back, please enter your credentials to access your account.
          </p>
        </div>

        <Card className="border-slate-200/70 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-slate-200/40 dark:shadow-black/50 rounded-2xl overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">
              Account Login
            </CardTitle>
            <CardDescription className="text-center mt-1.5">
              Access your E-Board dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 pr-11 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-medium">
                    Password
                  </Label>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 px-0"
                    type="button"
                    onClick={() => setLocation('/auth/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="w-full h-12 mt-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium hover:underline"
                onClick={() => setLocation('/auth/signup')}
              >
                Sign up
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 dark:text-slate-600 mt-10">
          © {new Date().getFullYear()} E-Board • All rights reserved
        </p>
      </div>
    </div>
  );
}