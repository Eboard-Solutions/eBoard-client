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
  Hash,
  User,
  Building2,
  Shield,
  UserPlus,
  ArrowRight,
} from 'lucide-react';

import { authService } from '@/lib/auth';

type LoginType = 'user' | 'orgAdmin' | 'superAdmin';

const ROUTES = {
  dashboard: '/',
  signup: '/auth/signup',
};

interface Notification {
  type: 'success' | 'error';
  message: string;
  description?: string;
}

const LOGIN_TABS: { type: LoginType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'user', label: 'User', icon: <User className="h-4 w-4" />, description: 'Board member login with org code' },
  { type: 'orgAdmin', label: 'Org Admin', icon: <Building2 className="h-4 w-4" />, description: 'Organization administrator' },
  { type: 'superAdmin', label: 'Super Admin', icon: <Shield className="h-4 w-4" />, description: 'System administrator' },
];

export function SignIn() {
  const [, setLocation] = useLocation();

  const [loginType, setLoginType] = useState<LoginType>('user');
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

    if (!trimmedEmail || !trimmedPassword) {
      showNotification('error', 'Email and password are required');
      return;
    }

    if (loginType === 'user' && !trimmedOrgCode) {
      showNotification('error', 'Organization code is required for user login');
      return;
    }

    setIsLoading(true);

    try {
      let response;

      switch (loginType) {
        case 'user':
          console.log('🔐 Attempting user login with org code...');
          response = await authService.login({
            email: trimmedEmail,
            password: trimmedPassword,
            orgCode: trimmedOrgCode,
          });
          break;

        case 'orgAdmin':
          console.log('🔐 Attempting org-admin login...');
          response = await authService.orgAdminLogin({
            email: trimmedEmail,
            password: trimmedPassword,
          });
          break;

        case 'superAdmin':
          console.log('🔐 Attempting super-admin login...');
          response = await authService.superAdminLogin({
            email: trimmedEmail,
            password: trimmedPassword,
          });
          break;
      }

      const { user } = response;

      console.log('✅ Login successful:', { 
        role: user?.role, 
        hasOrganisation: user?.hasOrganisation 
      });

      const displayName = user?.firstName || user?.email?.split('@')[0] || 'User';
      showNotification('success', 'Login successful!', `Welcome back, ${displayName}!`);

      // Redirect to dashboard
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

  const currentTab = LOGIN_TABS.find(t => t.type === loginType)!;

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
        <div className="text-center mb-8">
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
            Welcome back to E-Board
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="border-gray-200/60 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4">
            {/* Login Type Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
              {LOGIN_TABS.map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setLoginType(tab.type)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    loginType === tab.type
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <CardTitle className="text-xl font-semibold text-center">
              {currentTab.label} Login
            </CardTitle>
            <CardDescription className="text-center mt-1">
              {currentTab.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Org Code - Only for User login */}
              {loginType === 'user' && (
                <div className="space-y-2">
                  <Label htmlFor="orgCode" className="font-medium text-gray-700 dark:text-gray-300">
                    Organization Code
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
                    <Input
                      id="orgCode"
                      type="text"
                      placeholder="e.g. KIR001"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                      className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

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
                    placeholder={
                      loginType === 'superAdmin' 
                        ? 'superadmin@example.com' 
                        : loginType === 'orgAdmin'
                        ? 'admin@company.com'
                        : 'user@example.com'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                    autoFocus={loginType !== 'user'}
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
                disabled={
                  isLoading || 
                  !email.trim() || 
                  !password.trim() || 
                  (loginType === 'user' && !orgCode.trim())
                }
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

            {/* Footer link - only show for non-superadmin */}
            {loginType !== 'superAdmin' && (
              <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium underline-offset-4 hover:underline"
                  onClick={() => setLocation(ROUTES.signup)}
                >
                  Register Organization
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-8">
          © {new Date().getFullYear()} E-Board • All rights reserved
        </p>
      </div>
    </div>
  );
}