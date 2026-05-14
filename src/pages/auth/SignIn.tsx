'use client';

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
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
  Hash,
  User,
  Building2,
  Shield,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

import { authService } from '@/lib/auth';

type LoginType = 'user' | 'orgAdmin' | 'superAdmin';

const ROUTES = {
  dashboard: '/',
  signup: '/auth/signup',
};

// Permissive email check — strict enough to catch obvious typos
// ("name@.com", "name@host"), loose enough not to fight on edge-case TLDs.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LOGIN_TABS: {
  type: LoginType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    type: 'user',
    label: 'User',
    icon: <User className="h-4 w-4" />,
    description: 'Board member login with org code',
  },
  {
    type: 'orgAdmin',
    label: 'Org Admin',
    icon: <Building2 className="h-4 w-4" />,
    description: 'Organization administrator',
  },
  {
    type: 'superAdmin',
    label: 'Super Admin',
    icon: <Shield className="h-4 w-4" />,
    description: 'System administrator',
  },
];

export function SignIn() {
  const [, setLocation] = useLocation();

  const [loginType, setLoginType] = useState<LoginType>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // `touched` powers inline error styling: don't shout at the user before they
  // actually try a field, but light up red the moment they leave it invalid.
  const [touched, setTouched] = useState<{ email: boolean; password: boolean; orgCode: boolean }>({
    email: false, password: false, orgCode: false,
  });

  // Live field-level validity — computed on every render so the red borders
  // and helper text update as the user types, without needing extra state.
  const emailInvalid = touched.email && !!email && !EMAIL_RE.test(email.trim());
  const passwordInvalid = touched.password && !!password && password.length < 8;
  const orgCodeInvalid = touched.orgCode && loginType === 'user' && !orgCode.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedOrgCode = orgCode.trim();

    // Force-touch every field so any latent inline errors show on submit.
    setTouched({ email: true, password: true, orgCode: true });

    if (!trimmedEmail || !trimmedPassword) {
      toast.error('Missing details', { description: 'Email and password are required.' });
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      toast.error('Invalid email', { description: 'Please enter a valid email address.' });
      return;
    }
    if (loginType === 'user' && !trimmedOrgCode) {
      toast.error('Organisation code required', { description: 'Board members need their org code to sign in.' });
      return;
    }

    setIsLoading(true);

    try {
      let response;

      switch (loginType) {
        case 'user':
          response = await authService.login({
            email: trimmedEmail,
            password: trimmedPassword,
            orgCode: trimmedOrgCode,
          });
          break;

        case 'orgAdmin':
          response = await authService.orgAdminLogin({
            email: trimmedEmail,
            password: trimmedPassword,
          });
          break;

        case 'superAdmin':
          response = await authService.superAdminLogin({
            email: trimmedEmail,
            password: trimmedPassword,
          });
          break;
      }

      const { user } = response;
      const displayName =
        user?.firstName || user?.email?.split('@')[0] || 'User';

      // Quick success toast, then redirect immediately. Don't wrap the
      // navigation in setTimeout — the token is already in localStorage,
      // but a delay lets ProtectedRoute mount with stale state and bounce
      // back to /auth/signin.
      toast.success('Login successful, redirecting…', {
        description: `Welcome back, ${displayName}!`,
        duration: 2000,
      });
      setLocation(ROUTES.dashboard);
    } catch (err: unknown) {
      console.error('[LOGIN ERROR]', err);

      // Surface whatever the server actually said. 401 → invalid credentials;
      // anything else → fall back to a generic message but include the raw.
      let msg = 'Invalid email or password';
      let status: number | undefined;
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        status = axiosErr.response?.status;
        msg = axiosErr.response?.data?.message || axiosErr.message || msg;
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }

      if (status === 401 || status === 403) {
        toast.error('Invalid email or password', { description: 'Please check your details and try again.' });
      } else {
        toast.error('Login failed', { description: msg });
      }
      setIsLoading(false);
    }
  };

  const currentTab = LOGIN_TABS.find((t) => t.type === loginType)!;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Feedback toasts come from the app-wide <Toaster /> (sonner) mounted
          in App.tsx — colour cues and dismiss button are configured there. */}
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

              {/* Org Code — only for User login */}
              {loginType === 'user' && (
                <div className="space-y-2">
                  <Label
                    htmlFor="orgCode"
                    className="font-medium text-gray-700 dark:text-gray-300"
                  >
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
                      onBlur={() => setTouched(t => ({ ...t, orgCode: true }))}
                      aria-invalid={orgCodeInvalid || undefined}
                      className={`h-12 pl-11 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 transition-all uppercase ${
                        orgCodeInvalid
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                      required
                      autoFocus
                    />
                  </div>
                  {orgCodeInvalid && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> Organisation code is required.
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="font-medium text-gray-700 dark:text-gray-300"
                >
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
                    onBlur={() => setTouched(t => ({ ...t, email: true }))}
                    aria-invalid={emailInvalid || undefined}
                    className={`h-12 pl-11 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 transition-all ${
                      emailInvalid
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    required
                    autoFocus={loginType !== 'user'}
                    autoComplete="email"
                  />
                </div>
                {emailInvalid && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> Enter a valid email address.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="font-medium text-gray-700 dark:text-gray-300"
                  >
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
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    aria-invalid={passwordInvalid || undefined}
                    className={`h-12 pl-11 pr-11 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 transition-all ${
                      passwordInvalid
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                    required
                    minLength={8}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {passwordInvalid && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" /> Password must be at least 8 characters.
                  </p>
                )}
              </div>

              {/* Submit */}
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

            {/* Footer — hide for super admin */}
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