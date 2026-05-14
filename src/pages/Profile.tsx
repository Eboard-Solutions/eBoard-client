// pages/Profile.tsx — Profile page for orgAdmin / non-board users.
//
// What changed in this rewrite (vs. the original):
//   • Uses the project's `authService` (which talks through `apiClient`) so
//     Bearer-token injection, 401-refresh, and the `looksWrapped` response
//     interceptor all kick in. The previous version used raw `fetch()` and
//     hand-pulled the token, which bypassed all of that and is why the page
//     would 401 randomly mid-session.
//   • Drops the bio / address / city / country / timezone / committees /
//     avatar-upload sections — `UpdateProfileData` only accepts
//     { firstName, lastName, email, title, profilePictureUrl, phoneNumber }
//     so the old UI happily PATCHed fields the backend silently discarded.
//     Same class of bug we just fixed on TasksPage.
//   • Styling brought into line with the rest of the orgAdmin shell:
//     rounded [28px] cards, gradient header, indigo/violet accents.

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  User, Mail, Phone, Briefcase, Lock, Eye, EyeOff,
  Save, X, Loader2, Shield, Image as ImageIcon, AlertCircle,
} from 'lucide-react';

import { authService } from '@/api/services/auth.service';
import type { AuthUser, UpdateProfileData } from '@/types/api.types';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
}

function roleStyle(role?: string) {
  const r = (role ?? '').toLowerCase();
  if (r.includes('super'))  return { chip: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900', icon: Shield };
  if (r.includes('orgadmin') || r.includes('admin')) return { chip: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900', icon: Briefcase };
  if (r.includes('board'))  return { chip: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900', icon: User };
  return { chip: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: User };
}

function apiMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM: UpdateProfileData = {
  firstName: '',
  lastName: '',
  email: '',
  title: '',
  phoneNumber: '',
  profilePictureUrl: '',
};

export default function Profile() {
  const profileQ = useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getMe(),
    staleTime: 5 * 60 * 1000,
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfileData>(EMPTY_FORM);
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const formRef = useRef(form);
  formRef.current = form;

  // Seed the form once the profile lands, and re-seed whenever the server
  // copy changes underneath us (e.g. after a successful patch).
  useEffect(() => {
    if (!profileQ.data) return;
    const p = profileQ.data as AuthUser & {
      title?: string; phoneNumber?: string; profilePictureUrl?: string;
    };
    setForm({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      email: p.email ?? '',
      title: p.title ?? '',
      phoneNumber: p.phoneNumber ?? '',
      profilePictureUrl: p.profilePictureUrl ?? '',
    });
  }, [profileQ.data]);

  const updateM = useMutation({
    mutationFn: (data: UpdateProfileData) => authService.updateMe(data),
    onSuccess: () => {
      toast.success('Profile updated');
      setEditing(false);
      profileQ.refetch();
    },
    onError: (err) => toast.error(apiMessage(err, 'Failed to update profile')),
  });

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const passwordM = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed');
      setShowPwDialog(false);
      setPw({ current: '', next: '', confirm: '' });
    },
    onError: (err) => toast.error(apiMessage(err, 'Failed to change password')),
  });

  const handleSave = () => {
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      toast.error('First and last name are required');
      return;
    }
    // Send only changed fields so the PATCH is minimal and we don't accidentally
    // clobber a server-side default with an empty string.
    const original = profileQ.data as AuthUser & Record<string, unknown> | undefined;
    const patch: UpdateProfileData = {};
    (Object.keys(form) as (keyof UpdateProfileData)[]).forEach((k) => {
      const next = (form[k] ?? '').toString().trim();
      const prev = (original?.[k as string] ?? '').toString();
      if (next !== prev) (patch as Record<string, string>)[k] = next;
    });
    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save');
      setEditing(false);
      return;
    }
    updateM.mutate(patch);
  };

  const handleCancel = () => {
    if (!profileQ.data) { setEditing(false); return; }
    const p = profileQ.data as AuthUser & { title?: string; phoneNumber?: string; profilePictureUrl?: string };
    setForm({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      email: p.email ?? '',
      title: p.title ?? '',
      phoneNumber: p.phoneNumber ?? '',
      profilePictureUrl: p.profilePictureUrl ?? '',
    });
    setEditing(false);
  };

  const handleChangePassword = () => {
    if (pw.next !== pw.confirm)   return toast.error('New passwords do not match');
    if (pw.next.length < 8)       return toast.error('Password must be at least 8 characters');
    if (pw.next === pw.current)   return toast.error('New password must differ from current');
    passwordM.mutate({ currentPassword: pw.current, newPassword: pw.next });
  };

  // ── Loading / error ──────────────────────────────────────────────────────
  if (profileQ.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    );
  }
  if (profileQ.isError || !profileQ.data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="max-w-sm w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-semibold text-foreground">Couldn't load profile</p>
          <p className="text-sm text-muted-foreground">{apiMessage(profileQ.error, 'Please try again.')}</p>
          <Button variant="outline" size="sm" onClick={() => profileQ.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const profile = profileQ.data as AuthUser & {
    title?: string; phoneNumber?: string; profilePictureUrl?: string;
  };
  const role = roleStyle(profile.role);
  const RoleIcon = role.icon;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header card ───────────────────────────────────────────────── */}
      <div className="rounded-[28px] border border-border/60 bg-card/90 p-5 sm:p-6 shadow-sm backdrop-blur overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background shadow-lg">
                <AvatarImage src={profile.profilePictureUrl} alt={profile.firstName} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-2xl font-semibold">
                  {getInitials(profile.firstName, profile.lastName)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => { setAvatarUrl(profile.profilePictureUrl ?? ''); setShowAvatarDialog(true); }}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border border-border shadow flex items-center justify-center hover:bg-muted transition-colors"
                title="Update avatar"
              >
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Account</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                {profile.firstName} {profile.lastName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1.5', role.chip)}>
                  <RoleIcon className="h-3 w-3" />
                  {profile.role}
                </Badge>
                {profile.orgCode && (
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {profile.orgCode}
                  </Badge>
                )}
                {(profile as { title?: string }).title && (
                  <span className="text-xs text-muted-foreground">· {(profile as { title?: string }).title}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  {profile.email}
                </span>
                {(profile as { phoneNumber?: string }).phoneNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {(profile as { phoneNumber?: string }).phoneNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!editing ? (
              <Button onClick={() => setEditing(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <User className="h-4 w-4" />
                Edit profile
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={updateM.isPending} className="rounded-xl gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateM.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 min-w-[130px]">
                  {updateM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {updateM.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal info ───────────────────────────────────────────── */}
      <Card className="rounded-[28px] border-border/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Personal information</CardTitle>
          <CardDescription>The basics — used for sign-in, notifications, and meeting attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name" required>
              <Input
                value={form.firstName ?? ''}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                disabled={!editing || updateM.isPending}
                className="rounded-xl"
              />
            </Field>
            <Field label="Last name" required>
              <Input
                value={form.lastName ?? ''}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                disabled={!editing || updateM.isPending}
                className="rounded-xl"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!editing || updateM.isPending}
                className="rounded-xl"
              />
            </Field>
            <Field label="Phone number">
              <Input
                value={form.phoneNumber ?? ''}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                disabled={!editing || updateM.isPending}
                placeholder="+254 712 345 678"
                className="rounded-xl"
              />
            </Field>
            <Field label="Job title" className="md:col-span-2">
              <Input
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!editing || updateM.isPending}
                placeholder="e.g. Secretary, Board Chair"
                className="rounded-xl"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Security ──────────────────────────────────────────────────── */}
      <Card className="rounded-[28px] border-border/60 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Security
          </CardTitle>
          <CardDescription>Update your password. We never display it; you'll have to enter the current one to change it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div>
              <p className="font-semibold text-sm">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Use at least 8 characters. Mix letters, numbers, and symbols.</p>
            </div>
            <Button variant="outline" onClick={() => setShowPwDialog(true)} className="rounded-xl">
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Password dialog ───────────────────────────────────────────── */}
      <Dialog open={showPwDialog} onOpenChange={(o) => { if (!passwordM.isPending) setShowPwDialog(o); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Change password
            </DialogTitle>
            <DialogDescription>
              Enter your current password, then a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PwInput
              label="Current password"
              value={pw.current}
              onChange={(v) => setPw({ ...pw, current: v })}
              show={show.current}
              onToggle={() => setShow({ ...show, current: !show.current })}
            />
            <div className="space-y-1">
              <PwInput
                label="New password"
                value={pw.next}
                onChange={(v) => setPw({ ...pw, next: v })}
                show={show.next}
                onToggle={() => setShow({ ...show, next: !show.next })}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-1">
              <PwInput
                label="Confirm new password"
                value={pw.confirm}
                onChange={(v) => setPw({ ...pw, confirm: v })}
                show={show.confirm}
                onToggle={() => setShow({ ...show, confirm: !show.confirm })}
              />
              {pw.confirm && pw.next !== pw.confirm && (
                <p className="text-xs text-red-600">Passwords don't match.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={passwordM.isPending} onClick={() => setShowPwDialog(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                passwordM.isPending ||
                !pw.current || !pw.next || pw.next !== pw.confirm
              }
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {passwordM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Avatar URL dialog ─────────────────────────────────────────── */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Update avatar</DialogTitle>
            <DialogDescription>
              Paste a public image URL. (File upload coming once the backend exposes a route.)
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…/avatar.jpg"
              className="rounded-xl"
            />
            {avatarUrl && (
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{getInitials(profile.firstName, profile.lastName)}</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Preview</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvatarDialog(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={() => {
                updateM.mutate({ profilePictureUrl: avatarUrl.trim() || undefined });
                setShowAvatarDialog(false);
              }}
              disabled={updateM.isPending}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tiny presentational helpers ──────────────────────────────────────────────

function Field({ label, required, className, children }: {
  label: string; required?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function PwInput({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
