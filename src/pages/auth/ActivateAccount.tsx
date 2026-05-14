// src/pages/auth/ActivateAccount.tsx
"use client";

import React, { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService } from "@/lib/auth";

export function ActivateAccount() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });

  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const passwordTooShort = touched.password && password.length > 0 && password.length < 8;
  const passwordMismatch = touched.confirm && confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });

    if (!token) {
      toast.error("Invalid activation link", { description: "Missing or invalid token in the link." });
      return;
    }

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm) {
      toast.error("Password is required");
      return;
    }
    if (trimmedPassword.length < 8) {
      toast.error("Password too short", { description: "Use at least 8 characters." });
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await authService.activateAccount({ token, password: trimmedPassword });
      toast.success("Account activated!", {
        description: "Redirecting to sign in…",
        duration: 1800,
      });
      setTimeout(() => { setLocation("/auth/signin"); }, 1200);
    } catch (err: unknown) {
      console.error("[ACTIVATE ACCOUNT ERROR]", err);
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (err instanceof Error ? err.message : "Failed to activate account. The link may be invalid or expired.");
      toast.error("Activation failed", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-emerald-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
      {/* Feedback toasts come from the app-wide <Toaster /> in App.tsx. */}
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/auth/signin")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign In
        </Button>

        <Card className="border-sky-100/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/85 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4 text-center">
            <CardTitle className="text-2xl font-semibold">
              Activate your account
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              Set a secure password to finish activating your eBoard account.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {!token ? (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                This activation link is missing a token. Please use the link
                sent to your email.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="font-medium text-slate-700 dark:text-slate-200"
                  >
                    New password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))}
                      aria-invalid={passwordTooShort || undefined}
                      minLength={8}
                      className={`h-12 pl-11 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 transition-all ${
                        passwordTooShort
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
                      }`}
                      placeholder="Enter a strong password"
                      autoComplete="new-password"
                    />
                  </div>
                  {passwordTooShort ? (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> At least 8 characters.
                    </p>
                  ) : password.length >= 8 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" /> Length looks good.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="font-medium text-slate-700 dark:text-slate-200"
                  >
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                    aria-invalid={passwordMismatch || undefined}
                    minLength={8}
                    className={`h-12 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 transition-all ${
                      passwordMismatch
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
                    }`}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                  {passwordMismatch && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> Passwords don't match.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    isLoading || !password.trim() || !confirmPassword.trim()
                  }
                  className="w-full h-12 mt-2 bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500 hover:from-sky-700 hover:via-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate Account"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ActivateAccount;
