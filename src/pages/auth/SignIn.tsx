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
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowRight,
} from 'lucide-react';

import { authService } from '@/lib/auth';

const ROUTES = {
  superAdmin: '/super-admin',
  orgAdmin: '/dashboard/',
  boardMember: '/dashboard/board-member',
  default: '/dashboard',
  userLogin: '/auth/userLogin',
  signUp: '/auth/signUp',
};

interface Notification {
  type: 'success' | 'error';
  message: string;
  description?: string;
}

export function SignIn() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!trimmedEmail || !trimmedPassword) {
      showNotification('error', 'Email and password are required');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Attempting login...');

      const response = await authService.login({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const { user } = response;

      console.log('✅ Login successful:', {
        role: user.role,
        hasOrganisation: user.hasOrganisation,
      });

      let targetRoute = ROUTES.default;
      const role = user.role.toLowerCase();

      if (role.includes('superadmin') || role === 'superadmin') {
        targetRoute = ROUTES.superAdmin;
      } else if (role.includes('orgadmin') || role === 'orgadmin') {
        targetRoute = ROUTES.orgAdmin;
      } else if (role.includes('boardmember') || role === 'boardmember') {
        targetRoute = ROUTES.boardMember;
      } else {
        targetRoute = ROUTES.default;
      }

      showNotification('success', 'Login successful!', `Welcome back, ${user.firstName}!`);

      setTimeout(() => {
        setLocation(targetRoute);
      }, 1200);
    } catch (err: any) {
      console.error('[LOGIN ERROR]', err);

      let msg = 'Login failed. Please try again.';
      let redirectToUserLogin = false;

      if (err.message?.toLowerCase().includes('orgcode') || err.message?.includes('organization code')) {
        msg = 'Organization code required. Please use the member login page.';
        redirectToUserLogin = true;
      } else if (err.message) {
        msg = err.message;
      }

      showNotification('error', 'Login Failed', msg);

      if (redirectToUserLogin) {
        setTimeout(() => setLocation(ROUTES.userLogin), 2200);
      }

      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-12 sm:px-6 lg:px-8">

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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 shadow-2xl mb-6 mx-auto overflow-hidden">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="E-Board Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign In
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Welcome back • Super Admin / Organization Admin
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="border-gray-200/60 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="px-10 pt-10 pb-6 text-center">
            <CardTitle className="text-2xl font-semibold">Admin Login</CardTitle>
            <CardDescription className="mt-2 text-base">
              Access your administration dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">

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
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                    autoFocus
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
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 p-0 h-auto font-medium"
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
                    className="h-12 pl-11 pr-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
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

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full h-12 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 dark:text-gray-600 font-medium uppercase tracking-wider">
                New here?
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Sign Up Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-400 dark:hover:border-indigo-600 font-medium transition-all group"
              onClick={() => setLocation(ROUTES.signUp)}
            >
              <UserPlus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Create an Account
            </Button>

            {/* Footer link */}
            <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              Regular user or board member?{' '}
              <button
                type="button"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium underline-offset-4 hover:underline"
                onClick={() => setLocation(ROUTES.userLogin)}
              >
                Login with Organization Code
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