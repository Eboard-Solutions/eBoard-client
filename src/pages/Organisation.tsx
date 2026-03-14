'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Settings, Shield, Edit3, Save, X, Camera,
  AlertTriangle, CheckCircle2, XCircle, Globe, Phone, Mail,
  MapPin, Link2, Hash, Calendar, Key, Monitor, LogOut, Bell,
  RefreshCcw, ShieldCheck, Activity, Plus,
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { usePermissions } from '@/lib/permissions';
import {
  useMyOrganisation,
  useUpdateOrganisation,
  useRegisterOrganisation,
} from '@/hooks/api/useOrganisations';
import type { Organisation } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginSession {
  id: string; device: string; location: string;
  ip: string; lastActive: string; isCurrent: boolean;
}
interface LoginHistoryEntry {
  id: string; event: string; device: string; ip: string; time: string;
}

// ─── Mock session data (replace with real API when available) ─────────────────

const MOCK_SESSIONS: LoginSession[] = [
  { id: '1', device: 'Chrome on macOS',    location: 'Nairobi, KE', ip: '197.232.10.4', lastActive: '2 minutes ago', isCurrent: true  },
  { id: '2', device: 'Safari on iPhone',   location: 'Nairobi, KE', ip: '197.232.10.5', lastActive: '3 hours ago',   isCurrent: false },
  { id: '3', device: 'Firefox on Windows', location: 'Mombasa, KE', ip: '41.89.12.7',   lastActive: '2 days ago',    isCurrent: false },
];
const MOCK_LOGIN_HISTORY: LoginHistoryEntry[] = [
  { id: '1', event: 'Successful login',     device: 'Chrome on macOS', ip: '197.232.10.4', time: '2025-03-09 08:12' },
  { id: '2', event: 'Successful login',     device: 'Safari on iPhone',ip: '197.232.10.5', time: '2025-03-08 17:45' },
  { id: '3', event: 'Failed login attempt', device: 'Unknown',         ip: '45.33.32.156', time: '2025-03-07 03:22' },
  { id: '4', event: 'Password changed',     device: 'Chrome on macOS', ip: '197.232.10.4', time: '2025-03-06 14:01' },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldRow({ label, icon: Icon, children }: {
  label: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" />{label}
      </Label>
      {children}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
        : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function Spinner({ className }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? 'h-3.5 w-3.5'}`} />;
}

function ServerErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-center gap-3 dark:border-amber-800 dark:bg-amber-900/20">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm text-amber-900 dark:text-amber-300">{message}</p>
      <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 hover:bg-amber-100 shrink-0" onClick={onRetry}>
        <RefreshCcw className="h-3 w-3 mr-1.5" />Retry
      </Button>
    </div>
  );
}

// ─── Create Organisation Dialog ───────────────────────────────────────────────

function CreateOrgDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void;
}) {
  const register = useRegisterOrganisation();
  const [form, setForm] = useState({
    organisationName: '', OrgEmail: '', phoneNumber: '',
    address: '', websiteUrl: '', description: '',
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  });

  function handleSubmit() {
    if (!form.organisationName.trim()) { toast.error('Organisation name is required'); return; }
    register.mutate(form as any, {
      onSuccess: () => {
        toast.success('Organisation created — awaiting review before activation.');
        onCreated();
        onOpenChange(false);
        setForm({ organisationName: '', OrgEmail: '', phoneNumber: '', address: '', websiteUrl: '', description: '' });
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create organisation'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Create Your Organisation</DialogTitle>
          <DialogDescription>
            Set up your organisation profile. It'll be reviewed before becoming fully active.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <FieldRow label="Organisation Name *" icon={Building2}>
            <Input {...field('organisationName')} placeholder="Acme Corp" className="h-9 text-sm" />
          </FieldRow>
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Contact Email" icon={Mail}>
              <Input {...field('OrgEmail')} type="email" placeholder="hello@company.com" className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label="Phone Number" icon={Phone}>
              <Input {...field('phoneNumber')} placeholder="+254 700 000 000" className="h-9 text-sm" />
            </FieldRow>
          </div>
          <FieldRow label="Address" icon={MapPin}>
            <Input {...field('address')} placeholder="123 Main St, Nairobi" className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="Website" icon={Globe}>
            <Input {...field('websiteUrl')} placeholder="https://company.com" className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="Description" icon={Building2}>
            <Textarea {...field('description')} placeholder="Brief description of your organisation…" rows={3} className="resize-none text-sm" />
          </FieldRow>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={register.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={register.isPending} className="gap-2">
            {register.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
            Create Organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ org, onSave, isSaving, canManage }: {
  org: Organisation; onSave: (d: Partial<Organisation>) => void;
  isSaving: boolean; canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Organisation>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const current = { ...org, ...form };

  function fieldProps(key: keyof Organisation) {
    return {
      value: (form[key] as string) ?? (org[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [key]: e.target.value })),
      disabled: !editing,
    };
  }

  const createdAtLabel = org.createdAt
    ? new Date(org.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const systemFields = [
    { label: 'Organisation ID', value: org.organisationId ?? '—' },
    { label: 'Status',          value: org.status ?? 'PENDING' },
    { label: 'Approved By',     value: org.approvedBy ?? 'Not yet approved' },
    { label: 'Approved At',     value: org.approvedAt ? new Date(org.approvedAt).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hero banner */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <div className="h-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900" />
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.6) 0%, transparent 50%)' }}
          />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px)' }}
          />
        </div>

        <CardContent className="pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-12">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-2xl border-4 border-background bg-white overflow-hidden shadow-xl ring-1 ring-black/5">
                {current.logoUrl ? (
                  <img src={current.logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100">
                    <Building2 className="h-10 w-10 text-indigo-400" />
                  </div>
                )}
              </div>
              {editing && (
                <>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors border-2 border-background">
                    <Camera className="h-3 w-3" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-hidden="true" />
                </>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-2xl font-bold tracking-tight truncate">{current.organisationName ?? 'Organisation Name'}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {org.orgCode && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-muted px-2.5 py-1 rounded-md border border-border/60 text-muted-foreground">
                    <Hash className="h-3 w-3" />{org.orgCode}
                  </span>
                )}
                <StatusBadge isActive={org.isActive ?? false} />
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />Created {createdAtLabel}
                </span>
              </div>
            </div>

            {/* Actions */}
            {canManage && (
              <div className="shrink-0 flex gap-2 pb-1">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({}); }} className="h-8 gap-1.5">
                      <X className="h-3.5 w-3.5" />Cancel
                    </Button>
                    <Button size="sm" onClick={() => { onSave(form); setEditing(false); setForm({}); }} disabled={isSaving} className="h-8 gap-1.5">
                      {isSaving ? <Spinner /> : <Save className="h-3.5 w-3.5" />}Save
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-8 gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />Edit Profile
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail cards */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <FieldRow label="Organisation Name" icon={Building2}>
              <Input {...fieldProps('organisationName')} placeholder="Acme Corp" className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label="Organisation Code" icon={Hash}>
              <Input value={org.orgCode ?? ''} disabled readOnly
                className="h-9 text-sm bg-muted/50 font-mono text-muted-foreground" />
            </FieldRow>
            <FieldRow label="Description" icon={Building2}>
              <Textarea
                value={(form.description as string) ?? (org.description as string) ?? ''}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                disabled={!editing} placeholder="Brief description…"
                rows={4} className="resize-none text-sm leading-relaxed"
              />
            </FieldRow>
            <FieldRow label="Website" icon={Globe}>
              <Input {...fieldProps('websiteUrl')} placeholder="https://company.com" className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label="Logo URL" icon={Link2}>
              <Input {...fieldProps('logoUrl')} placeholder="https://company.com/logo.png" className="h-9 text-sm" />
            </FieldRow>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-semibold text-foreground">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <FieldRow label="Contact Email" icon={Mail}>
                <Input {...fieldProps('OrgEmail')} type="email" placeholder="hello@company.com" className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label="Phone Number" icon={Phone}>
                <Input {...fieldProps('phoneNumber')} placeholder="+254 700 000 000" className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label="Address" icon={MapPin}>
                <Input {...fieldProps('address')} placeholder="123 Main St, City" className="h-9 text-sm" />
              </FieldRow>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm bg-muted/20">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">System Info</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2.5">
              {systemFields.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs font-medium font-mono truncate max-w-[180px] text-right">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const NOTIFICATION_SETTINGS = [
  { label: 'Meeting reminders',  description: 'Send reminders before scheduled meetings',   defaultChecked: true  },
  { label: 'New member joined',  description: 'Notify admins when someone joins the org',   defaultChecked: true  },
  { label: 'Document uploads',   description: 'Alert members when new documents are added', defaultChecked: false },
  { label: 'Task assignments',   description: 'Notify users when tasks are assigned',       defaultChecked: true  },
  { label: 'Voting opens',       description: 'Notify members when a new vote is created',  defaultChecked: true  },
] as const;

function SettingsTab({ canManage }: { canManage: boolean }) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5 max-w-2xl">
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold">Meeting Defaults</CardTitle>
          <CardDescription className="text-xs">Default settings applied to all new meetings</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Duration</Label>
              <Select defaultValue="60" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Reminder</Label>
              <Select defaultValue="24h" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="3h">3 hours before</SelectItem>
                  <SelectItem value="24h">24 hours before</SelectItem>
                  <SelectItem value="48h">48 hours before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold">Localisation</CardTitle>
          <CardDescription className="text-xs">Timezone and language preferences</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3" />Timezone
              </Label>
              <Select defaultValue="Africa/Nairobi" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT +3)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</Label>
              <Select defaultValue="en" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
          <CardDescription className="text-xs">Control which events trigger notifications for your organisation</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-0.5">
          {NOTIFICATION_SETTINGS.map(({ label, description, defaultChecked }) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <Switch defaultChecked={defaultChecked} disabled={!canManage} />
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" className="h-9 gap-2 min-w-32"
            onClick={() => { toast.success('Settings saved'); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
            {saved
              ? <><CheckCircle2 className="h-4 w-4" />Saved</>
              : <><Save className="h-4 w-4" />Save Settings</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

const SECURITY_POLICIES = [
  { label: 'Enforce Two-Factor Authentication', description: 'Require all members to use 2FA when signing in',         defaultChecked: false, icon: Shield  },
  { label: 'Strong Password Policy',            description: 'Require passwords of at least 12 characters',           defaultChecked: true,  icon: Key     },
  { label: 'Security Alerts',                   description: 'Email admins when suspicious activity is detected',     defaultChecked: true,  icon: Bell    },
  { label: 'Single Session Enforcement',        description: 'Prevent members from logging in on multiple devices',   defaultChecked: false, icon: Monitor },
] as const;

function SecurityTab({ canManage }: { canManage: boolean }) {
  const [sessions, setSessions] = useState<LoginSession[]>(MOCK_SESSIONS);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  return (
    <div className="space-y-5 max-w-2xl">
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />Security Policies
          </CardTitle>
          <CardDescription className="text-xs">Organisation-wide security enforcement</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-0.5">
          {SECURITY_POLICIES.map(({ label, description, defaultChecked, icon: Icon }) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-border/30 last:border-0">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 mt-0.5">
                  <Icon className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <Switch defaultChecked={defaultChecked} disabled={!canManage} className="shrink-0 mt-1" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-emerald-500" />Active Sessions
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Devices currently logged in</CardDescription>
            </div>
            {canManage && (
              <Button variant="outline" size="sm"
                className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => { setSessions(p => p.filter(s => s.isCurrent)); toast.success('All other sessions revoked'); }}>
                <LogOut className="h-3 w-3" />Revoke All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-2">
          {sessions.map((sess) => (
            <div key={sess.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{sess.device}</p>
                    {sess.isCurrent && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-semibold px-2 py-0.5 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sess.location} · {sess.ip} · {sess.lastActive}
                  </p>
                </div>
              </div>
              {!sess.isCurrent && canManage && (
                <Button variant="ghost" size="sm"
                  className="h-7 px-2.5 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setRevokeId(sess.id)}>Revoke</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />Login History
          </CardTitle>
          <CardDescription className="text-xs">Recent authentication events</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-0.5">
            {MOCK_LOGIN_HISTORY.map((entry) => {
              const isSuccess = entry.event.startsWith('Successful');
              const isFail    = entry.event.startsWith('Failed');
              const iconBg    = isSuccess ? 'bg-emerald-100 dark:bg-emerald-900/30' : isFail ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30';
              const icon      = isSuccess
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                : isFail ? <XCircle className="h-3.5 w-3.5 text-red-600" />
                : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
              return (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/40 transition-colors">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{entry.event}</p>
                    <p className="text-xs text-muted-foreground">{entry.device} · {entry.ip}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">{entry.time}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>This device will be signed out immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => {
              if (revokeId) { setSessions(p => p.filter(s => s.id !== revokeId)); toast.success('Session revoked'); setRevokeId(null); }
            }}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tab config — Members & Documents removed (handled in main nav) ───────────

const TAB_CONFIG = [
  { value: 'profile',  label: 'Profile',  icon: Building2 },
  { value: 'settings', label: 'Settings', icon: Settings  },
  { value: 'security', label: 'Security', icon: Shield    },
] as const;

type TabValue = (typeof TAB_CONFIG)[number]['value'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganisationPage() {
  const {
    can,
    isSuperAdmin,
    isOrgAdmin,
    isLoading: authLoading,
    authError,
    authErrorKind,
    refresh: refreshAuth,
    user,
  } = usePermissions();

  const queryClient = useQueryClient();

  // canManage from role alone — never gated behind having an org already
  const canManage = isSuperAdmin || isOrgAdmin || can('org:manage');

  // Calls GET /organisations/my-organisation — no UUID needed
  const {
    data: org,
    isLoading: orgLoading,
    error: orgFetchError,
    refetch: refetchOrg,
  } = useMyOrganisation(!authLoading && canManage);

  const updateOrg = useUpdateOrganisation();
  const [activeTab, setActiveTab]         = useState<TabValue>('profile');
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const handleSaveProfile = useCallback((data: Partial<Organisation>) => {
    if (!org) return;
    updateOrg.mutate(
      { organisationId: org.organisationId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['organisations'] });
          toast.success('Organisation profile updated');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save changes'),
      },
    );
  }, [org, updateOrg, queryClient]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading || orgLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading organisation…</p>
        </div>
      </div>
    );
  }

  // ── Hard auth failure ─────────────────────────────────────────────────────
  if (authError && (authErrorKind === 'invalid_token' || authErrorKind === 'insufficient_role')) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Access Problem</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">{authError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={refreshAuth}><RefreshCcw className="h-4 w-4 mr-2" />Retry</Button>
          <Button size="sm" asChild><a href="/auth/signin">Sign In</a></Button>
        </div>
      </div>
    );
  }

  // ── Org fetch error ───────────────────────────────────────────────────────
  if (orgFetchError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Failed to Load Organisation</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">
            {orgFetchError instanceof Error ? orgFetchError.message : 'An unexpected error occurred.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchOrg()}>
          <RefreshCcw className="h-4 w-4 mr-2" />Retry
        </Button>
      </div>
    );
  }

  // ── No org yet (OrgAdmin/manager with create permission) ──────────────────
  if (canManage && !org) {
    return (
      <>
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-5xl space-y-6">
          {authError && authErrorKind === 'server_error' && (
            <ServerErrorBanner message={authError} onRetry={refreshAuth} />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organisation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome{user?.firstName ? `, ${user.firstName}` : ''}! Set up your organisation to unlock all features.
            </p>
          </div>

          <div className="flex min-h-[42vh] flex-col items-center justify-center gap-6 text-center py-12">
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 flex items-center justify-center ring-8 ring-indigo-50 dark:ring-indigo-900/10 shadow-lg">
                <Building2 className="h-12 w-12 text-indigo-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">No Organisation Yet</h2>
              <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-relaxed">
                Create your organisation profile to start managing meetings, members, documents, and more.
              </p>
            </div>
            <Button size="lg" className="gap-2.5 px-8 h-11 text-base shadow-md" onClick={() => setShowCreateOrg(true)}>
              <Plus className="h-5 w-5" />Create Organisation
            </Button>
            <p className="text-xs text-muted-foreground">Your organisation will be reviewed before becoming fully active.</p>
          </div>
        </div>

        <CreateOrgDialog
          open={showCreateOrg}
          onOpenChange={setShowCreateOrg}
          onCreated={() => refreshAuth().then(() => refetchOrg())}
        />
      </>
    );
  }

  // ── Non-admin with no org ─────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">No Organisation Found</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">
            You're not linked to an organisation yet. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto space-y-6 py-8 px-4 md:px-6 max-w-5xl">
      {authError && authErrorKind === 'server_error' && (
        <ServerErrorBanner message={authError} onRetry={refreshAuth} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canManage
              ? 'Manage your organisation profile, settings, and security.'
              : 'View your organisation details.'}
          </p>
        </div>
        <StatusBadge isActive={org.isActive ?? false} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="h-10 p-1 bg-muted/50 border border-border/60">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2 text-sm h-8 px-5">
              <Icon className="h-3.5 w-3.5" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab org={org} onSave={handleSaveProfile} isSaving={updateOrg.isPending} canManage={canManage} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecurityTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}