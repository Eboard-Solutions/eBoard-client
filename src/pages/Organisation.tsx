'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Settings, Shield, Edit3, Save, X, Camera,
  AlertTriangle, CheckCircle2, XCircle, Globe, Phone, Mail,
  MapPin, Link2, Hash, Calendar, Key, Monitor, LogOut, Bell,
  RefreshCcw, ShieldCheck, Activity, Plus, Users, FileText,
  Zap, Loader2, WifiOff,
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { usePermissions } from '@/lib/permissions';
import {
  useMyOrganisation,
  useUpdateOrganisation,
  useRegisterOrganisation,
} from '@/hooks/api/useOrganisations';
import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type { Organisation } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginHistoryEntry {
  id: string;
  event: string;
  device: string;
  ip: string;
  time: string;
}

interface OrgSettings {
  meetingDefaultDuration: string;
  meetingDefaultReminder: string;
  timezone: string;
  language: string;
  notifications: {
    meetingReminders: boolean;
    newMemberJoined: boolean;
    documentUploads: boolean;
    taskAssignments: boolean;
    votingOpens: boolean;
  };
}

// ─── Real-time API hooks ──────────────────────────────────────────────────────
// These call the backend; replace endpoint strings to match your actual routes.

function useActiveSessions() {
  return useQuery<LoginSession[]>({
    queryKey: ['sessions', 'active'],
    queryFn: async () => {
      const res = await apiClient.get(
        ENDPOINTS.AUTH?.SESSIONS ?? '/auth/sessions'
      );
      return res.data.data ?? res.data ?? [];
    },
    staleTime: 60_000,
  });
}

function useLoginHistory() {
  return useQuery<LoginHistoryEntry[]>({
    queryKey: ['sessions', 'history'],
    queryFn: async () => {
      const res = await apiClient.get(
        ENDPOINTS.AUTH?.LOGIN_HISTORY ?? '/auth/login-history'
      );
      return res.data.data ?? res.data ?? [];
    },
    staleTime: 120_000,
  });
}

function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(
        (ENDPOINTS.AUTH?.REVOKE_SESSION ?? '/auth/sessions/') + sessionId
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

function useRevokeAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(
        ENDPOINTS.AUTH?.REVOKE_ALL_SESSIONS ?? '/auth/sessions/revoke-others'
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

function useOrgSettings(orgId?: string) {
  return useQuery<OrgSettings>({
    queryKey: ['org-settings', orgId],
    queryFn: async () => {
      const res = await apiClient.get(
        `${ENDPOINTS.ORGANISATIONS?.SETTINGS ?? '/organisations/settings'}/${orgId}`
      );
      return res.data.data ?? res.data;
    },
    enabled: !!orgId,
    staleTime: 300_000,
  });
}

function useUpdateOrgSettings(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<OrgSettings>) => {
      const res = await apiClient.patch(
        `${ENDPOINTS.ORGANISATIONS?.SETTINGS ?? '/organisations/settings'}/${orgId}`,
        data
      );
      return res.data.data ?? res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-settings', orgId] }),
  });
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Spinner({ sm }: { sm?: boolean }) {
  return (
    <Loader2 className={`animate-spin ${sm ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function SectionCard({ title, description, icon: Icon, iconColor, children, action }: {
  title: string; description?: string; icon: React.ElementType;
  iconColor: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">{title}</CardTitle>
              {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
            </div>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground/70">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function ServerErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-center gap-3 dark:border-amber-800 dark:bg-amber-900/20">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm text-amber-900 dark:text-amber-300">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}
        className="h-7 text-xs gap-1.5 border-amber-300 hover:bg-amber-100 shrink-0 rounded-xl">
        <RefreshCcw className="h-3 w-3" />Retry
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

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value })),
  });

  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

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
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-11 w-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Create Organisation</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">Will be reviewed before becoming fully active.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className={lbl}>Organisation Name <span className="text-red-500 normal-case">*</span></label>
            <Input {...f('organisationName')} placeholder="Acme Corp" className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...f('OrgEmail')} type="email" placeholder="hello@company.com" className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className={lbl}>Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...f('phoneNumber')} placeholder="+254 700 000 000" className={`${inp} pl-10`} />
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>Address</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input {...f('address')} placeholder="123 Main St, Nairobi" className={`${inp} pl-10`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Website</label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input {...f('websiteUrl')} placeholder="https://company.com" className={`${inp} pl-10`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <Textarea {...f('description')} placeholder="Brief description of your organisation…"
              rows={3} className="resize-none rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm" />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={register.isPending}>Cancel</Button>
          <Button className="rounded-xl gap-2 min-w-[150px]" onClick={handleSubmit} disabled={register.isPending}>
            {register.isPending ? <Spinner sm /> : <Plus className="h-4 w-4" />}
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

  const inp = (extra = '') =>
    `h-11 rounded-xl border-border/60 bg-background text-sm transition-colors ${
      editing ? 'focus:border-primary/70' : 'opacity-80 cursor-default'
    } ${extra}`;
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

  function fp(key: keyof Organisation) {
    return {
      value: (form[key] as string) ?? (org[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [key]: e.target.value })),
      disabled: !editing,
    };
  }

  const createdLabel = org.createdAt
    ? new Date(org.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const systemFields = [
    { label: 'Organisation ID', value: org.organisationId ?? '—', mono: true  },
    { label: 'Status',          value: org.status ?? 'PENDING',   mono: false },
    { label: 'Org Code',        value: org.orgCode ?? '—',        mono: true  },
    { label: 'Approved By',     value: org.approvedBy ?? 'Pending approval', mono: false },
    { label: 'Approved At',     value: org.approvedAt ? new Date(org.approvedAt).toLocaleDateString('en-GB') : '—', mono: false },
    { label: 'Created',         value: createdLabel,              mono: false },
  ];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Hero banner ── */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <div className="h-36 sm:h-44 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900" />
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle at 15% 60%, rgba(59,130,246,0.5) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(139,92,246,0.4) 0%, transparent 50%)' }} />
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 24px, rgba(255,255,255,1) 24px, rgba(255,255,255,1) 25px)' }} />
          <div className="absolute top-4 right-4">
            <StatusBadge isActive={org.isActive ?? false} />
          </div>
        </div>

        <CardContent className="pt-0 pb-6 px-5 sm:px-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 sm:-mt-12">

            {/* Logo */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-background bg-white overflow-hidden shadow-xl ring-1 ring-black/5">
                {current.logoUrl
                  ? <img src={current.logoUrl} alt="logo" className="h-full w-full object-cover" />
                  : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40">
                      <Building2 className="h-9 w-9 text-blue-400" />
                    </div>
                  )
                }
              </div>
              {editing && (
                <>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors border-2 border-background">
                    <Camera className="h-3 w-3" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-hidden
                    onChange={(e) => {
                      const url = e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : undefined;
                      if (url) setForm(p => ({ ...p, logoUrl: url }));
                    }} />
                </>
              )}
            </div>

            {/* Name / meta */}
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {current.organisationName || 'Organisation Name'}
              </h2>
              <div className="flex flex-wrap items-center gap-2.5 mt-2">
                {org.orgCode && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-muted px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground">
                    <Hash className="h-3 w-3" />{org.orgCode}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />Created {createdLabel}
                </span>
              </div>
            </div>

            {/* Edit / Save actions */}
            {canManage && (
              <div className="shrink-0 flex gap-2 pb-1">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9"
                      onClick={() => { setEditing(false); setForm({}); }}>
                      <X className="h-3.5 w-3.5" />Cancel
                    </Button>
                    <Button size="sm" className="rounded-xl gap-1.5 h-9 min-w-[90px]"
                      onClick={() => { onSave(form); setEditing(false); setForm({}); }} disabled={isSaving}>
                      {isSaving ? <Spinner sm /> : <Save className="h-3.5 w-3.5" />}Save
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9"
                    onClick={() => setEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" />Edit Profile
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Detail grid ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Basic info */}
        <SectionCard title="Basic Information" description="Core organisation details" icon={Building2}
          iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <div className="space-y-4">
            <div>
              <label className={lbl}>Organisation Name</label>
              <Input {...fp('organisationName')} placeholder="Acme Corp" className={inp()} />
            </div>
            <div>
              <label className={lbl}>Org Code (read-only)</label>
              <Input value={org.orgCode ?? ''} disabled readOnly
                className="h-11 rounded-xl border-border/60 bg-muted/50 text-sm font-mono text-muted-foreground" />
            </div>
            <div>
              <label className={lbl}>Description</label>
              <Textarea
                value={(form.description as string) ?? (org.description as string) ?? ''}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                disabled={!editing} placeholder="Brief description of your organisation…"
                rows={4} className="resize-none rounded-xl border-border/60 bg-background text-sm leading-relaxed" />
            </div>
            <div>
              <label className={lbl}>Website</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...fp('websiteUrl')} placeholder="https://company.com" className={inp('pl-10')} />
              </div>
            </div>
            <div>
              <label className={lbl}>Logo URL</label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...fp('logoUrl')} placeholder="https://company.com/logo.png" className={inp('pl-10')} />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-5">
          {/* Contact details */}
          <SectionCard title="Contact Details" description="How to reach your organisation" icon={Phone}
            iconColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <div className="space-y-4">
              <div>
                <label className={lbl}>Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input {...fp('OrgEmail')} type="email" placeholder="hello@company.com" className={inp('pl-10')} />
                </div>
              </div>
              <div>
                <label className={lbl}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input {...fp('phoneNumber')} placeholder="+254 700 000 000" className={inp('pl-10')} />
                </div>
              </div>
              <div>
                <label className={lbl}>Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input {...fp('address')} placeholder="123 Main St, City" className={inp('pl-10')} />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* System info */}
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-4 pb-3 border-b border-border/30 bg-muted/30">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">System Information</p>
            </CardHeader>
            <CardContent className="px-5 py-2 divide-y divide-border/30">
              {systemFields.map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className={`text-xs font-semibold truncate text-right max-w-[200px] ${mono ? 'font-mono' : ''}`}>
                    {value}
                  </span>
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

const NOTIFICATION_KEYS = [
  { key: 'meetingReminders' as const, label: 'Meeting reminders',  description: 'Send reminders before scheduled meetings',   icon: Calendar   },
  { key: 'newMemberJoined'  as const, label: 'New member joined',  description: 'Notify admins when someone joins the org',   icon: Users      },
  { key: 'documentUploads'  as const, label: 'Document uploads',   description: 'Alert members when new documents are added', icon: FileText   },
  { key: 'taskAssignments'  as const, label: 'Task assignments',   description: 'Notify users when tasks are assigned',       icon: Zap        },
  { key: 'votingOpens'      as const, label: 'Voting opens',       description: 'Notify members when a new vote is created',  icon: CheckCircle2 },
];

function SettingsTab({ org, canManage }: { org: Organisation; canManage: boolean }) {
  const { data: settings, isLoading } = useOrgSettings(org.organisationId);
  const updateSettings = useUpdateOrgSettings(org.organisationId);

  const [local, setLocal] = useState<Partial<OrgSettings>>({});
  const merged: Partial<OrgSettings> = { ...settings, ...local };
  const [saved, setSaved] = useState(false);

  const sel = 'h-11 rounded-xl border-border/60 text-sm';
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

  async function handleSave() {
    try {
      await updateSettings.mutateAsync(local);
      toast.success('Settings saved');
      setSaved(true);
      setLocal({});
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Failed to save settings');
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <Spinner /><span className="text-sm text-muted-foreground">Loading settings…</span>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Meeting defaults */}
      <SectionCard title="Meeting Defaults" description="Applied to all newly created meetings" icon={Calendar}
        iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={lbl}>Default Duration</label>
            <Select
              value={merged.meetingDefaultDuration ?? '60'}
              onValueChange={(v) => setLocal(p => ({ ...p, meetingDefaultDuration: v }))}
              disabled={!canManage}>
              <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={lbl}>Default Reminder</label>
            <Select
              value={merged.meetingDefaultReminder ?? '24h'}
              onValueChange={(v) => setLocal(p => ({ ...p, meetingDefaultReminder: v }))}
              disabled={!canManage}>
              <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour before</SelectItem>
                <SelectItem value="3h">3 hours before</SelectItem>
                <SelectItem value="24h">24 hours before</SelectItem>
                <SelectItem value="48h">48 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Localisation */}
      <SectionCard title="Localisation" description="Timezone and language preferences" icon={Globe}
        iconColor="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={lbl}>Timezone</label>
            <Select
              value={merged.timezone ?? 'Africa/Nairobi'}
              onValueChange={(v) => setLocal(p => ({ ...p, timezone: v }))}
              disabled={!canManage}>
              <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT +3)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST +4)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={lbl}>Language</label>
            <Select
              value={merged.language ?? 'en'}
              onValueChange={(v) => setLocal(p => ({ ...p, language: v }))}
              disabled={!canManage}>
              <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="sw">Swahili</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notification Preferences" description="Control which events trigger notifications" icon={Bell}
        iconColor="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <div className="space-y-0.5">
          {NOTIFICATION_KEYS.map(({ key, label, description, icon: Icon }) => {
            const checked = merged.notifications?.[key] ?? false;
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-3.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={checked}
                  disabled={!canManage}
                  onCheckedChange={(v) =>
                    setLocal(p => ({
                      ...p,
                      notifications: { ...(merged.notifications ?? {}), [key]: v } as OrgSettings['notifications'],
                    }))
                  }
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      </SectionCard>

      {canManage && (
        <div className="flex items-center justify-between">
          {Object.keys(local).length > 0 && (
            <p className="text-xs text-muted-foreground">You have unsaved changes</p>
          )}
          <div className="ml-auto">
            <Button className="rounded-xl gap-2 min-w-[140px] h-10" onClick={handleSave}
              disabled={updateSettings.isPending || Object.keys(local).length === 0}>
              {updateSettings.isPending
                ? <><Spinner sm />Saving…</>
                : saved
                ? <><CheckCircle2 className="h-4 w-4" />Saved!</>
                : <><Save className="h-4 w-4" />Save Settings</>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

const SECURITY_POLICIES = [
  { label: 'Two-Factor Authentication', description: 'Require all members to use 2FA when signing in',    icon: Shield,  color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'    },
  { label: 'Strong Password Policy',    description: 'Require passwords of at least 12 characters',      icon: Key,     color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { label: 'Security Alerts',           description: 'Email admins when suspicious activity is detected', icon: Bell,    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'  },
  { label: 'Single Session Only',       description: 'Prevent simultaneous logins on multiple devices',   icon: Monitor, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'   },
] as const;

function SecurityTab({ canManage }: { canManage: boolean }) {
  const { data: sessions = [], isLoading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useActiveSessions();
  const { data: history = [],  isLoading: historyLoading,  error: historyError,  refetch: refetchHistory  } = useLoginHistory();
  const revokeOne  = useRevokeSession();
  const revokeAll  = useRevokeAllSessions();
  const [revokeId, setRevokeId] = useState<string | null>(null);

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Policies */}
      <SectionCard title="Security Policies" description="Organisation-wide security enforcement" icon={ShieldCheck}
        iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <div className="space-y-0.5">
          {SECURITY_POLICIES.map(({ label, description, icon: Icon, color }) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3.5 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <Switch disabled={!canManage} className="shrink-0" />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Active Sessions */}
      <SectionCard title="Active Sessions" description="Devices currently logged in to your account" icon={Monitor}
        iconColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        action={
          canManage && sessions.length > 1 ? (
            <Button variant="outline" size="sm"
              className="h-8 text-xs gap-1.5 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              disabled={revokeAll.isPending}
              onClick={() => revokeAll.mutate(undefined, {
                onSuccess: () => toast.success('All other sessions revoked'),
                onError: () => toast.error('Failed to revoke sessions'),
              })}>
              {revokeAll.isPending ? <Spinner sm /> : <LogOut className="h-3.5 w-3.5" />}
              Revoke All Others
            </Button>
          ) : undefined
        }>

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Spinner /><span className="text-sm text-muted-foreground">Loading sessions…</span>
          </div>
        ) : sessionsError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <WifiOff className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Could not load sessions</p>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => refetchSessions()}>
              <RefreshCcw className="h-3.5 w-3.5" />Retry
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState icon={Monitor} title="No active sessions" description="No other devices are currently logged in." />
        ) : (
          <div className="space-y-2.5">
            {sessions.map((sess) => (
              <div key={sess.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-3.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-background border border-border/60 flex items-center justify-center">
                    <Monitor className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{sess.device}</p>
                      {sess.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sess.location} · {sess.ip} · {sess.lastActive}
                    </p>
                  </div>
                </div>
                {!sess.isCurrent && canManage && (
                  <Button variant="ghost" size="sm"
                    className="h-8 px-3 text-xs shrink-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={revokeOne.isPending && revokeId === sess.id}
                    onClick={() => setRevokeId(sess.id)}>
                    {revokeOne.isPending && revokeId === sess.id ? <Spinner sm /> : 'Revoke'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Login History */}
      <SectionCard title="Login History" description="Recent authentication events for your account" icon={Activity}
        iconColor="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">

        {historyLoading ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <Spinner /><span className="text-sm text-muted-foreground">Loading history…</span>
          </div>
        ) : historyError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <WifiOff className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Could not load login history</p>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => refetchHistory()}>
              <RefreshCcw className="h-3.5 w-3.5" />Retry
            </Button>
          </div>
        ) : history.length === 0 ? (
          <EmptyState icon={Activity} title="No login history" description="Authentication events will appear here." />
        ) : (
          <div className="divide-y divide-border/20">
            {history.map((entry) => {
              const isSuccess = entry.event.toLowerCase().includes('success');
              const isFail    = entry.event.toLowerCase().includes('fail') || entry.event.toLowerCase().includes('invalid');
              const iconBg    = isSuccess
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : isFail ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30';
              const icon = isSuccess
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                : isFail ? <XCircle className="h-3.5 w-3.5 text-red-600" />
                : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
              return (
                <div key={entry.id} className="flex items-center gap-3 py-3 hover:bg-muted/30 rounded-lg px-2 transition-colors -mx-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{entry.event}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.device} · {entry.ip}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono hidden sm:block">{entry.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Revoke Session?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This device will be signed out immediately and will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!revokeId) return;
                revokeOne.mutate(revokeId, {
                  onSuccess: () => { toast.success('Session revoked'); setRevokeId(null); },
                  onError: () => toast.error('Failed to revoke session'),
                });
              }}>
              Revoke Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { value: 'profile',  label: 'Profile',  icon: Building2, activeColor: 'text-blue-500'    },
  { value: 'settings', label: 'Settings', icon: Settings,  activeColor: 'text-violet-500'  },
  { value: 'security', label: 'Security', icon: Shield,    activeColor: 'text-emerald-500' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganisationPage() {
  const {
    can, isSuperAdmin, isOrgAdmin,
    isLoading: authLoading, authError, authErrorKind,
    refresh: refreshAuth, user,
  } = usePermissions();

  const queryClient = useQueryClient();
  const canManage   = isSuperAdmin || isOrgAdmin || can('org:manage');

  const {
    data: org, isLoading: orgLoading,
    error: orgFetchError, refetch: refetchOrg,
  } = useMyOrganisation(!authLoading && canManage);

  const updateOrg                         = useUpdateOrganisation();
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading organisation…</p>
        </div>
      </div>
    );
  }

  // ── Hard auth error ───────────────────────────────────────────────────────
  if (authError && (authErrorKind === 'invalid_token' || authErrorKind === 'insufficient_role')) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Access Problem</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">{authError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={refreshAuth}>
            <RefreshCcw className="h-4 w-4" />Retry
          </Button>
          <Button size="sm" className="rounded-xl" asChild>
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  // ── Org fetch error ───────────────────────────────────────────────────────
  if (orgFetchError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Failed to Load Organisation</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">
            {orgFetchError instanceof Error ? orgFetchError.message : 'An unexpected error occurred.'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetchOrg()}>
          <RefreshCcw className="h-4 w-4" />Retry
        </Button>
      </div>
    );
  }

  // ── No org, can create ────────────────────────────────────────────────────
  if (canManage && !org) {
    return (
      <>
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-5xl space-y-6">
          {authError && authErrorKind === 'server_error' && (
            <ServerErrorBanner message={authError} onRetry={refreshAuth} />
          )}

          <div className="flex items-start gap-4">
            <div className="shrink-0 h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organisation</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Welcome{user?.firstName ? `, ${user.firstName}` : ''}! Set up your organisation to get started.
              </p>
            </div>
          </div>

          <div className="flex min-h-[44vh] flex-col items-center justify-center gap-6 text-center py-12">
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/20 flex items-center justify-center ring-8 ring-blue-50 dark:ring-blue-900/10 shadow-lg">
                <Building2 className="h-12 w-12 text-blue-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-background">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">No Organisation Yet</h2>
              <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-relaxed">
                Create your organisation profile to start managing meetings, members, documents, and more.
              </p>
            </div>
            <Button size="lg" className="gap-2.5 rounded-xl px-8 h-12 text-base shadow-md" onClick={() => setShowCreateOrg(true)}>
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

  // ── Non-admin, no org ─────────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div>
          <h2 className="text-xl font-bold">No Organisation Found</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">
            You're not linked to an organisation yet. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto space-y-6 py-8 px-4 md:px-6 max-w-5xl pb-12">

      {authError && authErrorKind === 'server_error' && (
        <ServerErrorBanner message={authError} onRetry={refreshAuth} />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organisation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {canManage
                ? 'Manage your organisation profile, settings, and security.'
                : 'View your organisation details.'}
            </p>
          </div>
        </div>
        <StatusBadge isActive={org.isActive ?? false} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="h-auto p-1 bg-muted/40 rounded-xl border border-border/30 gap-1 flex-wrap sm:flex-nowrap">
          {TABS.map(({ value, label, icon: Icon, activeColor }) => (
            <TabsTrigger key={value} value={value}
              className="flex-1 sm:flex-none rounded-lg text-sm h-9 px-4 sm:px-5 font-medium data-[state=active]:shadow-sm gap-2">
              <Icon className={`h-4 w-4 ${activeTab === value ? activeColor : ''}`} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile"  className="mt-6 focus-visible:outline-none">
          <ProfileTab org={org} onSave={handleSaveProfile} isSaving={updateOrg.isPending} canManage={canManage} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6 focus-visible:outline-none">
          <SettingsTab org={org} canManage={canManage} />
        </TabsContent>
        <TabsContent value="security" className="mt-6 focus-visible:outline-none">
          <SecurityTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}