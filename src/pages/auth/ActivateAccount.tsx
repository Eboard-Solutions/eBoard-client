// src/pages/auth/ActivateAccount.tsx
"use client";

import React, { useState } from "react";
import { useLocation } from "wouter";
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
import { Loader2, Lock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/auth";

interface Notification {
  type: "success" | "error";
  message: string;
  description?: string;
}

export function ActivateAccount() {
  const [location, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const showNotification = (
    type: "success" | "error",
    message: string,
    description?: string,
  ) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showNotification(
        "error",
        "Invalid activation link",
        "Missing or invalid token in the link.",
      );
      return;
    }

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm) {
      showNotification("error", "Password is required");
      return;
    }

    if (trimmedPassword.length < 8) {
      showNotification(
        "error",
        "Password too short",
        "Password must be at least 8 characters long.",
      );
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      showNotification("error", "Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await authService.activateAccount({ token, password: trimmedPassword });
      showNotification(
        "success",
        "Account activated!",
        "You can now sign in with your new password.",
      );

      setTimeout(() => {
        setLocation("/auth/signin");
      }, 1500);
    } catch (err: any) {
      console.error("[ACTIVATE ACCOUNT ERROR]", err);
      const msg =
        err?.message ||
        "Failed to activate account. The link may be invalid or expired.";
      showNotification("error", "Activation Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-emerald-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-5 fade-in duration-300 ${
            notification.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
              : "bg-red-50/95 border-red-200 text-red-900"
          } border rounded-xl shadow-xl backdrop-blur-sm p-4`}
        >
          <div className="flex items-start gap-3">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium text-sm">{notification.message}</p>
              {notification.description && (
                <p className="mt-1 text-sm opacity-90">
                  {notification.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
                      minLength={8}
                      className="h-12 pl-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                      placeholder="Enter a strong password"
                      autoComplete="new-password"
                    />
                  </div>
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
                    minLength={8}
                    className="h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
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
