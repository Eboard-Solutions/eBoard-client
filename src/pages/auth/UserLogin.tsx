// src/pages/auth/UserLogin.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Hash,
  ArrowRight,
  ShieldCheck,
  Users,
  Building2,
} from 'lucide-react';

import authService from '@/lib/auth';

const ROUTES = {
  dashboard: '/',
  adminLogin: '/auth/signin',
  forgotPassword: '/auth/forgot-password',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function UserLogin() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedOrgCode = orgCode.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedOrgCode) {
      toast.error('All fields are required');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      toast.error('Invalid email', { description: 'Please enter a valid email address.' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({
        email: trimmedEmail,
        password: trimmedPassword,
        orgCode: trimmedOrgCode,
      });

      const { user } = response;
      toast.success('Login successful, redirecting…', {
        description: `Welcome back, ${user.firstName}!`,
        duration: 2000,
      });
      setLocation(ROUTES.dashboard);
    } catch (err: unknown) {
      console.error('[LOGIN ERROR]', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Login failed. Please try again.');

      if (status === 401 || status === 403) {
        toast.error('Invalid email or password', { description: 'Please check your details and try again.' });
      } else {
        toast.error('Login failed', { description: msg });
      }
      setIsLoading(false);
    }
  };

  const isFormValid = email.trim() && password.trim() && orgCode.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Feedback toasts come from the app-wide <Toaster /> in App.tsx. */}
      <div
        className="w-full max-w-md"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 to-blue-700 shadow-2xl mb-6 mx-auto overflow-hidden">
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
            Welcome back • Sign in with your organization code
          </p>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {[
            { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Secure Login' },
            { icon: <Building2 className="h-3.5 w-3.5" />, label: 'Org Verified' },
            { icon: <Users className="h-3.5 w-3.5" />, label: 'Board Access' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 text-indigo-500/70 dark:text-indigo-400/60 text-xs"
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <Card className="border-gray-200/60 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          {/* Top accent line — matches indigo theme */}
          <div className="h-1 w-full bg-linear-to-r from-indigo-500 via-blue-500 to-indigo-500" />

          <CardHeader className="px-10 pt-8 pb-6 text-center">
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
                    placeholder="e.g. ACME-2024"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono tracking-wider uppercase"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                  Ask your organization administrator for this code
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
                    className="h-12 pl-11 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 p-0 h-auto font-medium"
                    type="button"
                    onClick={() => setLocation(ROUTES.forgotPassword)}
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

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full h-12 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Board
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 dark:text-gray-600 font-medium uppercase tracking-wider">
                Are you an admin?
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Admin Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-400 dark:hover:border-indigo-600 font-medium transition-all group"
              onClick={() => setLocation(ROUTES.adminLogin)}
            >
              <ShieldCheck className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Sign in as Administrator
            </Button>

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-600">
              Don't have access?{' '}
              <span className="text-indigo-600 dark:text-indigo-400">
                Contact your organization admin
              </span>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-10">
          © {new Date().getFullYear()} E-Board • All rights reserved
        </p>
      </div>
    </div>
  );
}