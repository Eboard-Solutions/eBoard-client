'use client';

// Board-member Profile page. Mirrors the orgAdmin /profile page in behaviour
// and language. The previous version had three problems:
//   1. It PATCHed fields the backend doesn't persist (bio, phone, theme,
//      language, timezone, notificationPreferences, twoFactorEnabled) — same
//      "lying to users about saved data" pattern we fixed on TasksPage.
//   2. The Change Password button was a stub: `toast.success('Password
//      would be updated (backend needed)')` — but the backend *does* expose
//      `/auth/change-password` and `authService.changePassword` already
//      wraps it.
//   3. The 2FA toggle did nothing persistent.
// This rewrite uses only the fields that exist in UpdateProfileData
// ({ firstName, lastName, email, title, profilePictureUrl, phoneNumber })
// and wires the real password endpoint.

import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Users, User as UserIcon, Mail, Phone, Briefcase, Lock,
  Eye, EyeOff, Save, X, Loader2, AlertCircle, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useCurrentUser, useUpdateProfile } from '@/hooks/api';
import { authService } from '@/api/services/auth.service';
import type { AuthUser, UpdateProfileData } from '@/types/api.types';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
}

function apiMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? fallback;
}

function joinedLabel(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'MMM yyyy');
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

export function ProfilePage() {
  const profileQ = useCurrentUser();
  const updateM = useUpdateProfile();

  const profile = useMemo(() => {
    const raw = profileQ.data as (AuthUser & {
      title?: string; phoneNumber?: string; profilePictureUrl?: string;
      joinedAt?: string; createdAt?: string;
    }) | undefined;
    return raw;
  }, [profileQ.data]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfileData>(EMPTY_FORM);
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  // Seed the form from the server copy.
  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      title: profile.title ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      profilePictureUrl: profile.profilePictureUrl ?? '',
    });
  }, [profile]);

  // Password state
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
    if (!profile) return;
    // Send only changed fields so we don't accidentally clobber a server
    // default with an empty string. Same minimal-PATCH pattern used on the
    // orgAdmin Profile page.
    const patch: UpdateProfileData = {};
    (Object.keys(form) as (keyof UpdateProfileData)[]).forEach((k) => {
      const next = (form[k] ?? '').toString().trim();
      const prev = ((profile as Record<string, unknown>)[k as string] ?? '').toString();
      if (next !== prev) (patch as Record<string, string>)[k] = next;
    });
    if (Object.keys(patch).length === 0) {
      toast.info('No changes to save');
      setEditing(false);
      return;
    }
    updateM.mutate(patch as unknown as Parameters<typeof updateM.mutate>[0], {
      onSuccess: () => { toast.success('Profile updated'); setEditing(false); },
      onError: (err) => toast.error(apiMessage(err, 'Failed to update profile')),
    });
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: profile.email ?? '',
        title: profile.title ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        profilePictureUrl: profile.profilePictureUrl ?? '',
      });
    }
    setEditing(false);
  };

  const handleChangePassword = () => {
    if (pw.next !== pw.confirm) return toast.error('New passwords do not match');
    if (pw.next.length < 8)     return toast.error('Password must be at least 8 characters');
    if (pw.next === pw.current) return toast.error('New password must differ from current');
    passwordM.mutate({ currentPassword: pw.current, newPassword: pw.next });
  };

  // ── Loading / error ──────────────────────────────────────────────────────
  if (profileQ.isLoading) {
    return (
      <MemberPortalLayout icon={Users} title="Profile" color="bg-indigo-600" subtitle="Personal information and security">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mx-auto" />
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          </div>
        </div>
      </MemberPortalLayout>
    );
  }
  if (profileQ.isError || !profile) {
    return (
      <MemberPortalLayout icon={Users} title="Profile" color="bg-indigo-600" subtitle="Personal information and security">
        <div className="flex min-h-[40vh] items-center justify-center p-4">
          <div className="max-w-sm w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="font-semibold text-foreground">Couldn't load profile</p>
            <p className="text-sm text-muted-foreground">{apiMessage(profileQ.error, 'Please try again.')}</p>
            <Button variant="outline" size="sm" onClick={() => profileQ.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </MemberPortalLayout>
    );
  }

  return (
    <MemberPortalLayout icon={Users} title="Profile" color="bg-indigo-600" subtitle="Personal information and security">
      <div className="space-y-6">
        {/* ── Header card ───────────────────────────────────────────── */}
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
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Board member</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                    <UserIcon className="h-3 w-3" />
                    {profile.role}
                  </Badge>
                  {profile.orgCode && (
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {profile.orgCode}
                    </Badge>
                  )}
                  {profile.title && (
                    <span className="text-xs text-muted-foreground">· {profile.title}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </span>
                  {profile.phoneNumber && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {profile.phoneNumber}
                    </span>
                  )}
                  <span className="text-muted-foreground/70">
                    Member since {joinedLabel(profile.joinedAt ?? profile.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!editing ? (
                <Button onClick={() => setEditing(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <UserIcon className="h-4 w-4" />
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
        <div className="rounded-[28px] border border-border/60 bg-card/90 p-5 sm:p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Personal information</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Used for sign-in, notifications, and meeting attendance.</p>
          </div>
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
            <Field label="Title" className="md:col-span-2">
              <Input
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!editing || updateM.isPending}
                placeholder="e.g. Treasurer, Board Member"
                className="rounded-xl"
              />
            </Field>
          </div>
        </div>

        {/* ── Security ──────────────────────────────────────────────────── */}
        <div className="rounded-[28px] border border-border/60 bg-card/90 p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Security</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Update your password. We never display it; you'll have to enter the current one to change it.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div>
              <p className="font-semibold text-sm">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">At least 8 characters. Mix letters, numbers, and symbols.</p>
            </div>
            <Button variant="outline" onClick={() => setShowPwDialog(true)} className="rounded-xl">
              Change password
            </Button>
          </div>
        </div>
      </div>

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
              Paste a public image URL. File upload will appear here once the backend exposes a route.
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
                updateM.mutate(
                  { profilePictureUrl: avatarUrl.trim() || undefined } as unknown as Parameters<typeof updateM.mutate>[0],
                  {
                    onSuccess: () => { toast.success('Avatar updated'); setShowAvatarDialog(false); },
                    onError: (err) => toast.error(apiMessage(err, 'Failed to update avatar')),
                  },
                );
              }}
              disabled={updateM.isPending}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
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
