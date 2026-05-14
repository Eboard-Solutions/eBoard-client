// src/pages/auth/ForgotPassword.tsx
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
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

import authService from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ForgotPassword() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailInvalid = touched && !!email && !EMAIL_RE.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Email is required');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      toast.error('Invalid email', { description: 'Please enter a valid email address.' });
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword({ email: trimmedEmail });
      setIsLoading(false);
      setIsEmailSent(true);
      toast.success('Reset link sent!', {
        description: 'Check your email for password reset instructions.',
      });
    } catch (err: unknown) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Failed to send reset link. Please try again.');
      toast.error('Request failed', { description: msg });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Feedback toasts come from the app-wide <Toaster /> in App.tsx. */}
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation('/auth/signin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign In
        </Button>

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
            Reset Password
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Enter your email to receive reset instructions
          </p>
        </div>

        {/* Card */}
        <Card className="border-gray-200/60 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/80 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="px-10 pt-10 pb-6 text-center">
            <CardTitle className="text-2xl font-semibold">Forgot Password</CardTitle>
            <CardDescription className="mt-2 text-base">
              {isEmailSent
                ? 'Check your email for the reset link'
                : 'We will send you instructions to reset your password'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-10">
            {!isEmailSent ? (
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
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(true)}
                      aria-invalid={emailInvalid || undefined}
                      className={`h-12 pl-11 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 transition-all ${
                        emailInvalid
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                      }`}
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                  {emailInvalid && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> Enter a valid email address.
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-gray-900 dark:text-white font-medium mb-2">
                  Email sent successfully!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  We've sent password reset instructions to <strong>{email}</strong>
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEmailSent(false);
                    setEmail('');
                  }}
                  className="w-full"
                >
                  Send to a different email
                </Button>
              </div>
            )}

            {/* Footer link */}
            <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <button
                type="button"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium underline-offset-4 hover:underline"
                onClick={() => setLocation('/auth/signin')}
              >
                Sign in
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