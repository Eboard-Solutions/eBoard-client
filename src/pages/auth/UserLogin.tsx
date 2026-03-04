// src/pages/auth/UserLogin.tsx
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
  Hash,
} from 'lucide-react';

import authService from '@/lib/auth';

const ROUTES = {
  dashboard: '/',
  adminLogin: '/auth/signin',
};

interface Notification {
  type: 'success' | 'error';
  message: string;
  description?: string;
}

export function UserLogin() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (type: 'success' | 'error', message: string, description?: string) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedOrgCode = orgCode.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedOrgCode) {
      showNotification('error', 'All fields are required');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Attempting board member login...');
      
      const response = await authService.login({
        email: trimmedEmail,
        password: trimmedPassword,
        orgCode: trimmedOrgCode,
      });

      const { user } = response;

      console.log('✅ Login successful:', { role: user.role });

      showNotification('success', 'Login successful!', `Welcome back, ${user.firstName}!`);

      // Redirect to dashboard - it handles role-based views
      setTimeout(() => {
        setLocation(ROUTES.dashboard);
      }, 1200);
    } catch (err: unknown) {
      console.error('[LOGIN ERROR]', err);

      let msg = 'Login failed. Please try again.';

      if (err instanceof Error && err.message) {
        msg = err.message;
      }

      showNotification('error', 'Login Failed', msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950 dark:to-fuchsia-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-5 fade-in duration-300 ${
            notification.type === 'success'
              ? 'bg-green-50/95 border-green-200 text-green-900'
              : 'bg-red-50/95 border-red-200 text-red-900'
          } border rounded-xl shadow-xl backdrop-blur-sm p-4`}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-sm">{notification.message}</p>
              {notification.description && (
                <p className="mt-1 text-sm opacity-90">{notification.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-2xl mb-6 mx-auto overflow-hidden">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="E-Board Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Board Member Login
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Sign in to access your organization's board
          </p>
        </div>

        {/* Card */}
        <Card className="border-purple-200/60 dark:border-purple-800/50 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="px-10 pt-10 pb-6 text-center">
            <CardTitle className="text-2xl font-semibold">Member Sign In</CardTitle>
            <CardDescription className="mt-2 text-base">
              Enter your credentials and organization code
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Code */}
              <div className="space-y-2">
                <Label htmlFor="orgCode" className="font-medium text-gray-700 dark:text-gray-300">
                  Organization Code
                </Label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  <Input
                    id="orgCode"
                    type="text"
                    placeholder="Enter your organization code"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all uppercase"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ask your organization admin for the code
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-500 p-0 h-auto font-medium"
                    type="button"
                    onClick={() => setLocation('/auth/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                    minLength={8}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim() || !orgCode.trim()}
                className="w-full h-12 mt-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

            {/* Footer link */}
            <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              Are you an admin?{' '}
              <button
                type="button"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-500 font-medium underline-offset-4 hover:underline"
                onClick={() => setLocation(ROUTES.adminLogin)}
              >
                Sign in as Admin
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-10">
          © {new Date().getFullYear()} E-Board • All rights reserved
        </p>
      </div>
    </div>
  );
}