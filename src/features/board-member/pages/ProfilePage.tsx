'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCurrentUser, useUpdateProfile } from '@/hooks/api';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { unwrap } from '../components/page-helpers';

export function ProfilePage() {
  const { data } = useCurrentUser();
  const update = useUpdateProfile();

  const profile = useMemo(() => unwrap<any>(data) ?? {
    userId: 'unknown',
    firstName: '',
    lastName: '',
    email: '',
    role: 'BoardMember',
    organisation: '',
    twoFactorEnabled: false,
    notificationPreferences: { meetings: true, tasks: true, documents: true, resolutions: true, announcements: true, messages: true },
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    joinedAt: new Date().toISOString(),
  }, [data]);

  const [form, setForm] = useState(() => ({ ...profile }));
  // Keep local form in sync when the backend returns the profile.
  useEffect(() => {
    setForm({ ...profile });
  }, [profile.userId, profile.firstName, profile.lastName, profile.email, profile.joinedAt]);
  const [tab, setTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  async function save() {
    try {
      await update.mutateAsync(form as any);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Profile update failed');
    }
  }

  // Safely compute the joined date label to avoid date-fns throwing
  // when `joinedAt` is missing or invalid in the backend response.
  const joinedLabel = (() => {
    try {
      const v = (form as any)?.joinedAt;
      if (!v) return '—';
      const d = new Date(v);
      if (isNaN(d.getTime())) return '—';
      return format(d, 'MMM yyyy');
    } catch {
      return '—';
    }
  })();

  // Organisation may be a string or an object (org admin). Render a safe label.
  const orgLabel = (() => {
    const o = (form as any)?.organisation;
    if (!o) return '';
    if (typeof o === 'string') return o;
    if (typeof o === 'object') return (o.organisationName || o.name || o.organisation || o.orgName || '').toString();
    return '';
  })();

  return (
    <MemberPortalLayout icon={Users} title="Profile & Settings" color="bg-indigo-600" subtitle="Personal information and preferences">
      <div className="flex items-center gap-1 border-b border-border/60 mb-6">
        {(['profile', 'notifications', 'security'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-border/60 bg-card">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-500/30">
              {(form.firstName?.[0] ?? '')}{(form.lastName?.[0] ?? '')}
            </div>
            <div>
              <p className="text-lg font-bold">{form.firstName} {form.lastName}</p>
              <p className="text-sm text-muted-foreground">{form.title}{orgLabel ? ` · ${orgLabel}` : ''}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member since {joinedLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['First Name', 'firstName'],
              ['Last Name', 'lastName'],
              ['Email', 'email'],
              ['Phone', 'phone'],
              ['Title', 'title'],
            ].map(([label, key]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
                <Input value={(form as any)[key] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="h-9 text-sm" disabled={key === 'email'} />
              </div>
            ))}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio</Label>
                <Textarea value={form.bio ?? ''} onChange={(e) => setForm((p: any) => ({ ...p, bio: e.target.value }))} rows={3} className="text-sm resize-none" />
              </div>
          </div>

          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save} disabled={update.isLoading}>
            {update.isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose which notifications you want to receive.</p>
          {Object.entries((form.notificationPreferences ?? {}) as Record<string, boolean>).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card">
              <div>
                <p className="text-sm font-medium capitalize">{key}</p>
                <p className="text-xs text-muted-foreground">Receive notifications for {key}</p>
              </div>
              <Switch
                checked={Boolean(val)}
                onCheckedChange={(v: boolean) => setForm((p: any) => ({
                  ...p,
                  notificationPreferences: {
                    ...(p.notificationPreferences ?? {}),
                    [key]: v,
                  },
                }))}
              />
            </div>
          ))}
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save}>
            Save Preferences
          </Button>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card">
            <div>
              <p className="text-sm font-semibold">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">{form.twoFactorEnabled ? 'Enabled — your account is more secure.' : 'Disabled — enable for extra security.'}</p>
            </div>
            <Switch checked={Boolean(form.twoFactorEnabled)} onCheckedChange={(v: boolean) => { setForm((p: any) => ({ ...p, twoFactorEnabled: v })); toast.success(v ? '2FA enabled' : '2FA disabled'); }} />
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
            <p className="text-sm font-semibold">Change Password</p>
            <Input type="password" placeholder="Current password" className="h-9 text-sm" />
            <Input type="password" placeholder="New password" className="h-9 text-sm" />
            <Input type="password" placeholder="Confirm new password" className="h-9 text-sm" />
            <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9" onClick={() => toast.success('Password would be updated (backend needed)')}>
              Update Password
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />Session Information</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Current session active. Password and 2FA changes require backend integration to persist securely.</p>
          </div>
        </div>
      )}
    </MemberPortalLayout>
  );
}