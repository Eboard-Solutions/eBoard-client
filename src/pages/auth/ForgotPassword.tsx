'use client';
import React from 'react';
import { useState } from 'react';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { authService } from '@/lib/auth'; // Adjust to your NestJS auth service

interface Notification {
  type: 'success' | 'error' | 'warning';
  message: string;
  description?: string;
}

export function ForgotPassword() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (
    type: 'success' | 'error' | 'warning',
    message: string,
    description?: string,
  ) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      showNotification('error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Call your NestJS forgot-password endpoint
      // Example expected payload: { email: string }
      const response = await authService.forgotPassword({ email: trimmedEmail });

      if (!response.success) {
        showNotification('error', response.message || 'Unable to process request');
        return;
      }

      showNotification(
        'success',
        'Reset link sent',
        'Check your email for instructions to reset your password. The link is valid for a limited time.'
      );

      // Optional: auto-redirect to sign-in after a few seconds
      setTimeout(() => {
        setLocation('/auth/signin');
      }, 4000);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const errorMsg =
        err.response?.data?.message ||
        'Something went wrong. Please try again later.';
      showNotification('error', 'Request failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 px-5 py-12 sm:px-6 lg:px-8">
      {/* Custom Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 w-full max-w-sm sm:max-w-md animate-in slide-in-from-top-6 ${
            notification.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-red-50/95 border-red-200'
              : 'bg-amber-50/95 border-amber-200'
          } border rounded-xl shadow-2xl backdrop-blur-sm p-4`}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : notification.type === 'error' ? (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold text-sm ${
                  notification.type === 'success'
                    ? 'text-emerald-900'
                    : notification.type === 'error'
                    ? 'text-red-900'
                    : 'text-amber-900'
                }`}
              >
                {notification.message}
              </p>
              {notification.description && (
                <p
                  className={`mt-1 text-sm ${
                    notification.type === 'success'
                      ? 'text-emerald-700'
                      : notification.type === 'error'
                      ? 'text-red-700'
                      : 'text-amber-700'
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
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 shadow-xl mb-5 mx-auto">
            <span className="text-white font-bold text-3xl">
              <img src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4" alt="" />
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Reset Password
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Info Box about 2FA */}
        <div className="mb-6 p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Important note about 2FA</p>
            <p className="mt-1">
              The reset link will allow you to change your password without needing your authenticator code for this one-time action. After resetting, you may need to re-configure 2FA if you lost access to your authenticator app.
            </p>
          </div>
        </div>

        {/* Card */}
        <Card className="border-slate-200/70 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-slate-200/40 dark:shadow-black/50 rounded-2xl overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">
              Recover your account
            </CardTitle>
            <CardDescription className="text-center mt-1.5">
              We'll send a secure reset link to your email
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 pr-11 bg-white/70 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full h-12 mt-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              Remember your password?{' '}
              <button
                type="button"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium hover:underline"
                onClick={() => setLocation('/auth/signin')}
              >
                Sign in
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 dark:text-slate-600 mt-10">
          © {new Date().getFullYear()} E-Board • Secure access
        </p>
      </div>
    </div>
  );
}