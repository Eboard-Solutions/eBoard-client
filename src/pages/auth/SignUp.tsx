// src/pages/auth/SignUp.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
  Loader2, User, Mail, Lock, Eye, EyeOff, Phone,
  Building2, CheckCircle2, XCircle, ArrowRight,
  ShieldCheck, Users, Globe, Zap, ChevronRight,
} from 'lucide-react';
import { authService } from '@/lib/auth';

/* ─── tiny helpers ─── */
const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const inputBase =
  'h-12 w-full pl-11 pr-4 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800/80 border transition-all duration-200 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500';
const inputNormal =
  'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';
const inputError =
  'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20';
const inputSuccess =
  'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

/* ─── field wrapper with leading icon ─── */
function Field({
  id, label, icon, hint, error, success, children,
}: {
  id: string; label: string; icon: React.ReactNode;
  hint?: string; error?: string; success?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          {icon}
        </span>
        {children}
        {success && !error && (
          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 pointer-events-none" />
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
          <XCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
}

/* ─── password strength ─── */
function PasswordMeter({ value }: { value: string }) {
  if (!value) return null;
  const score = value.length < 8 ? 1 : value.length < 12 ? 2 : 3;
  const labels = ['', 'Weak', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-amber-400', 'bg-emerald-500'];
  const textColors = ['', 'text-red-500', 'text-amber-500', 'text-emerald-600'];
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cx(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i <= score ? colors[score] : 'bg-gray-200 dark:bg-gray-700'
            )}
          />
        ))}
      </div>
      <span className={cx('text-xs font-medium', textColors[score])}>{labels[score]}</span>
    </div>
  );
}

/* ─── animated counter badge ─── */
function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-indigo-200 text-xs mt-0.5">{label}</div>
    </div>
  );
}

export function SignUp() {
  const [, setLocation] = useLocation();
  const [mounted, setMounted] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  const touch = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  /* ─── validation ─── */
  const v = {
    firstName: firstName.trim().length >= 3,
    lastName: lastName.trim().length >= 3,
    org: organizationName.trim().length >= 3,
    phone: /^\+?[\d\s\-()]{10,}$/.test(phoneNumber.trim()),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    password: password.length >= 8,
    confirm: confirmPassword.length > 0 && password === confirmPassword,
  };

  const isFormValid = Object.values(v).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // touch all fields to show errors
    setTouched({ firstName: true, lastName: true, org: true, phone: true, email: true, password: true, confirm: true });
    if (!isFormValid) {
      toast.error('Please fix the highlighted fields', {
        description: 'Some entries are missing or invalid.',
      });
      return;
    }
    setIsLoading(true);
    try {
      await authService.signUp({
        firstName, lastName,
        organisationName: organizationName,
        phoneNumber, email, password,
      });
      toast.success('Account created!', {
        description: 'Redirecting you to sign in…',
        duration: 2000,
      });
      setTimeout(() => setLocation('/auth/signin'), 1500);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const msg = (error as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
        ?? (error instanceof Error ? error.message : 'Signup failed unexpectedly');
      // 409 → email/org already exists, which is the most common signup failure.
      if (status === 409) {
        toast.warning('Account already exists', { description: msg || 'That email or organisation is already registered.' });
      } else {
        toast.error('Signup failed', { description: msg });
      }
      setIsLoading(false);
    }
  };

  /* ─── perks ─── */
  const perks = [
    { icon: <ShieldCheck className="h-4 w-4" />, text: 'Enterprise-grade security & encryption' },
    { icon: <Users className="h-4 w-4" />, text: 'Manage unlimited board members' },
    { icon: <Globe className="h-4 w-4" />, text: 'Access from any device, anywhere' },
    { icon: <Zap className="h-4 w-4" />, text: 'Real-time meetings, votes & tasks' },
  ];

  /* ─── stagger delays ─── */
  const delays = ['0ms', '60ms', '120ms', '180ms', '240ms', '300ms', '360ms', '420ms'];

  return (
    <div className="min-h-screen flex font-sans">
      {/* Feedback toasts come from the app-wide <Toaster /> in App.tsx. */}

      {/* ════════════════ LEFT PANEL ════════════════ */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between relative overflow-hidden bg-linear-to-br from-indigo-700 via-indigo-600 to-blue-600 p-14">
        {/* background texture */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.07) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(99,102,241,0.3) 0%, transparent 50%)`,
          }}
        />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* diagonal accent stripe */}
        <div className="absolute -right-20 top-0 h-full w-40 bg-white/5 transform -skew-x-6 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 overflow-hidden shadow-lg shrink-0">
            <img
              src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
              alt="E-Board"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">E-Board</span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-indigo-200 text-sm font-medium uppercase tracking-widest mb-4">
              Admin Registration
            </p>
            <h2 className="text-white text-4xl font-bold leading-snug">
              One platform.<br />Every board need.
            </h2>
            <p className="text-indigo-200 mt-4 text-base leading-relaxed">
              Set up your organization in minutes and invite your board members to collaborate.
            </p>
          </div>

          {/* Perks */}
          <div className="space-y-3">
            {perks.map((p, i) => (
              <div
                key={p.text}
                className="flex items-start gap-3 group"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-indigo-100 group-hover:bg-white/25 transition-colors duration-200">
                  {p.icon}
                </div>
                <p className="text-indigo-100 text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15">
            <StatBadge value="500+" label="Organizations" />
            <StatBadge value="12k+" label="Members" />
            <StatBadge value="99.9%" label="Uptime" />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-indigo-300/50 text-xs">
            © {new Date().getFullYear()} E-Board • All rights reserved
          </p>
        </div>
      </div>

      {/* ════════════════ RIGHT PANEL ════════════════ */}
      <div className="flex-1 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 overflow-y-auto">
        <div
          className="min-h-full flex items-center justify-center px-6 py-14 lg:px-14"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
          }}
        >
          <div className="w-full max-w-xl space-y-8">

            {/* Mobile logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-blue-700 overflow-hidden shadow-lg shrink-0">
                <img
                  src="https://avatars.githubusercontent.com/u/255135070?s=200&v=4"
                  alt="E-Board"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-lg">E-Board</span>
            </div>

            {/* Heading */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.5s ease-out 80ms, transform 0.5s ease-out 80ms',
              }}
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Create your account
              </h1>
              <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm">
                Set up your admin profile and organization
              </p>
            </div>

            {/* ── FORM CARD ── */}
            <div
              className="bg-white/95 dark:bg-gray-900/80 rounded-3xl shadow-2xl border border-gray-200/60 dark:border-gray-800/50 overflow-hidden backdrop-blur-md"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.5s ease-out 160ms, transform 0.5s ease-out 160ms',
              }}
            >
              {/* accent bar */}
              <div className="h-1 w-full bg-linear-to-r from-indigo-500 via-blue-500 to-indigo-400" />

              {/* section label */}
              <div className="px-8 pt-8 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                  Personal details
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="px-8 pb-8 space-y-5">

                  {/* Name row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                      transition: `opacity 0.4s ease-out ${delays[0]}, transform 0.4s ease-out ${delays[0]}`,
                    }}
                  >
                    <Field
                      id="firstName" label="First name"
                      icon={<User className="h-4 w-4" />}
                      error={touched.firstName && !v.firstName ? 'Min. 3 characters' : undefined}
                      success={touched.firstName && v.firstName}
                    >
                      <input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={() => touch('firstName')}
                        className={cx(inputBase, touched.firstName && !v.firstName ? inputError : touched.firstName && v.firstName ? inputSuccess : inputNormal)}
                        required
                      />
                    </Field>

                    <Field
                      id="lastName" label="Last name"
                      icon={<User className="h-4 w-4" />}
                      error={touched.lastName && !v.lastName ? 'Min. 3 characters' : undefined}
                      success={touched.lastName && v.lastName}
                    >
                      <input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onBlur={() => touch('lastName')}
                        className={cx(inputBase, touched.lastName && !v.lastName ? inputError : touched.lastName && v.lastName ? inputSuccess : inputNormal)}
                        required
                      />
                    </Field>
                  </div>

                  {/* Divider label */}
                  <div className="pt-2 pb-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                      Organization & contact
                    </p>
                  </div>

                  {/* Org */}
                  <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.4s ease-out ${delays[1]}, transform 0.4s ease-out ${delays[1]}` }}>
                    <Field
                      id="organizationName" label="Organization name"
                      icon={<Building2 className="h-4 w-4" />}
                      hint="This will be your organization's display name"
                      error={touched.org && !v.org ? 'Min. 3 characters' : undefined}
                      success={touched.org && v.org}
                    >
                      <input
                        id="organizationName"
                        placeholder="Acme Corporation"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        onBlur={() => touch('org')}
                        className={cx(inputBase, touched.org && !v.org ? inputError : touched.org && v.org ? inputSuccess : inputNormal)}
                        required
                      />
                    </Field>
                  </div>

                  {/* Phone + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.4s ease-out ${delays[2]}, transform 0.4s ease-out ${delays[2]}` }}
                  >
                    <Field
                      id="phoneNumber" label="Phone number"
                      icon={<Phone className="h-4 w-4" />}
                      error={touched.phone && !v.phone ? 'Enter a valid number' : undefined}
                      success={touched.phone && v.phone}
                    >
                      <input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+254 712 345 678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        onBlur={() => touch('phone')}
                        className={cx(inputBase, touched.phone && !v.phone ? inputError : touched.phone && v.phone ? inputSuccess : inputNormal)}
                        required
                      />
                    </Field>

                    <Field
                      id="email" label="Email address"
                      icon={<Mail className="h-4 w-4" />}
                      error={touched.email && !v.email ? 'Enter a valid email' : undefined}
                      success={touched.email && v.email}
                    >
                      <input
                        id="email"
                        type="email"
                        placeholder="admin@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        onBlur={() => touch('email')}
                        className={cx(inputBase, touched.email && !v.email ? inputError : touched.email && v.email ? inputSuccess : inputNormal)}
                        required
                      />
                    </Field>
                  </div>

                  {/* Divider label */}
                  <div className="pt-2 pb-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                      Security
                    </p>
                  </div>

                  {/* Password */}
                  <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.4s ease-out ${delays[3]}, transform 0.4s ease-out ${delays[3]}` }}>
                    <Field
                      id="password" label="Password"
                      icon={<Lock className="h-4 w-4" />}
                      error={touched.password && !v.password ? 'Min. 8 characters required' : undefined}
                    >
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => touch('password')}
                        className={cx(inputBase, 'pr-11', touched.password && !v.password ? inputError : inputNormal)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>
                    <PasswordMeter value={password} />
                  </div>

                  {/* Confirm Password */}
                  <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.4s ease-out ${delays[4]}, transform 0.4s ease-out ${delays[4]}` }}>
                    <Field
                      id="confirmPassword" label="Confirm password"
                      icon={<Lock className="h-4 w-4" />}
                      error={
                        touched.confirm && confirmPassword && !v.confirm
                          ? 'Passwords do not match'
                          : undefined
                      }
                      success={touched.confirm && v.confirm}
                    >
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => touch('confirm')}
                        className={cx(
                          inputBase, 'pr-11',
                          touched.confirm && confirmPassword && !v.confirm ? inputError :
                          touched.confirm && v.confirm ? inputSuccess : inputNormal
                        )}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>
                  </div>

                  {/* Submit */}
                  <div
                    className="pt-3"
                    style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.4s ease-out ${delays[5]}, transform 0.4s ease-out ${delays[5]}` }}
                  >
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={cx(
                        'w-full h-12 rounded-xl text-white text-sm font-semibold relative overflow-hidden',
                        'bg-linear-to-r from-indigo-600 to-indigo-700 shadow-lg',
                        'hover:from-indigo-700 hover:to-blue-700 hover:shadow-xl hover:shadow-indigo-500/25',
                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        'transition-all duration-200 group',
                      )}
                    >
                      {/* shimmer */}
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
                      />
                      <span className="relative flex items-center justify-center gap-2">
                        {isLoading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</>
                        ) : (
                          <>Create Admin Account <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
                        )}
                      </span>
                    </button>

                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
                      By creating an account you agree to our{' '}
                      <span className="text-indigo-500 cursor-pointer hover:underline">Terms of Service</span>
                      {' '}and{' '}
                      <span className="text-indigo-500 cursor-pointer hover:underline">Privacy Policy</span>
                    </p>
                  </div>
                </div>

                {/* Card footer */}
                <div
                  className="px-8 py-5 bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between"
                  style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ease-out ${delays[6]}` }}
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Already have an account?
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocation('/auth/signin')}
                    className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
                  >
                    Sign in
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-600">
              © {new Date().getFullYear()} E-Board • All rights reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}