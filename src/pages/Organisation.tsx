'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Settings, Shield, Edit3, Save, X, Camera,
  AlertTriangle, CheckCircle2, Globe, Phone, Mail,
  MapPin, Link2, Hash, Calendar, Key, Monitor, Bell,
  RefreshCcw, ShieldCheck, Activity, Plus, FileText,
  Zap, Loader2, WifiOff, Lock, Info,
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import { usePermissions } from '@/lib/permissions';
import {
  useMyOrganisation,
  useUpdateOrganisation,
  useRegisterOrganisation,
} from '@/hooks/api/useOrganisations';
import apiClient from '@/api/client';
import { ENDPOINTS } from '@/config/api.config';
import type { Organisation, PlatformSettings, UpdateSettingsData } from '@/types/api.types';

// ─── Settings API hooks ────────────────────────────────────────────────────────

// FIX: `enabled` was a required positional arg, but every caller in this file
// passed only `orgId` — that made `enabled` undefined → `undefined && ...` →
// query disabled → Settings & Security tabs never loaded. Default to true.
function useOrgSettings(orgId: string | undefined, enabled = true) {
  return useQuery<PlatformSettings>({
    queryKey: ['settings', 'org', orgId],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.SETTINGS.BY_ORG(orgId!), {
        // Fail fast if the backend is slow — better to surface an error
        // than leave the user staring at a spinner.
        timeout: 12_000,
      });
      const outer = res.data?.data;
      return (outer?.data ?? outer ?? res.data) as PlatformSettings;
    },
    enabled: enabled && !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) return false;
      if ((err as { code?: string })?.code === 'ECONNABORTED') return false;
      return count < 1;
    },
    retryDelay: 500,
  });
}

function useUpdateOrgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<UpdateSettingsData, 'version'>) => {
      const res = await apiClient.patch(ENDPOINTS.SETTINGS.UPDATE, data);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Spinner({ sm }: { sm?: boolean }) {
  return <Loader2 className={`animate-spin ${sm ? 'h-3.5 w-3.5' : 'h-5 w-5'}`} />;
}

function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Skeleton primitives (faster perceived loading than a spinner) ────────────

function SkelLine({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-muted/60 dark:bg-muted/40 ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
    </div>
  );
}

function SettingsSectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-3">
          <SkelLine className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <SkelLine className="h-3.5 w-40" />
            <SkelLine className="h-3 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2.5 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <SkelLine className="h-8 w-8 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <SkelLine className="h-3.5 w-32" />
                <SkelLine className="h-3 w-56" />
              </div>
            </div>
            <SkelLine className="h-5 w-9 rounded-full shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SettingsTabSkeleton() {
  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsSectionSkeleton rows={2} />
      <SettingsSectionSkeleton rows={4} />
      <SettingsSectionSkeleton rows={4} />
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

const LBL = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

function SectionCard({ title, description, icon: Icon, iconColor, children, action }: {
  title: string;
  description?: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="org-section-card org-fade-up org-card-anim border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-4 border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/40 dark:ring-white/5 shadow-sm ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold tracking-tight">{title}</CardTitle>
              {description && <CardDescription className="text-xs mt-0.5 leading-relaxed">{description}</CardDescription>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">{children}</CardContent>
    </Card>
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

function ComingSoonBanner({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl border border-blue-200/60 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-950/20 px-4 py-3 flex items-start gap-3">
      <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
      <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
        <span className="font-semibold">{feature}</span> will appear here once your backend exposes the endpoint.{' '}
        Add the route to{' '}
        <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded font-mono">ENDPOINTS</code>{' '}
        in{' '}
        <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded font-mono">api.config.ts</code>{' '}
        to enable it.
      </p>
    </div>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  icon: Icon, iconColor, label, description, checked, disabled, onCheckedChange,
}: {
  icon?: React.ElementType;
  iconColor?: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 py-3 px-2 -mx-2 rounded-xl border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && iconColor && (
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-white/40 dark:ring-white/5 transition-transform group-hover:scale-105 ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

// ─── Create Organisation Dialog ────────────────────────────────────────────────

function CreateOrgDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const register = useRegisterOrganisation();
  const [form, setForm] = useState({
    organisationName: '', OrgEmail: '', phoneNumber: '',
    address: '', websiteUrl: '', description: '',
  });

  function field(k: keyof typeof form) {
    return {
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [k]: e.target.value })),
    };
  }

  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';

  function handleSubmit() {
    if (!form.organisationName.trim()) { toast.error('Organisation name is required'); return; }
    register.mutate(form as Parameters<typeof register.mutate>[0], {
      onSuccess: () => {
        toast.success('Organisation created — awaiting review before activation.');
        onCreated();
        onOpenChange(false);
        setForm({ organisationName: '', OrgEmail: '', phoneNumber: '', address: '', websiteUrl: '', description: '' });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ?? (err as { message?: string })?.message
          ?? 'Failed to create organisation';
        toast.error(msg);
      },
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
            <label className={LBL}>Organisation Name <span className="text-red-500 normal-case font-normal">*</span></label>
            <Input {...field('organisationName')} placeholder="Acme Corp" className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...field('OrgEmail')} type="email" placeholder="hello@company.com" className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className={LBL}>Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...field('phoneNumber')} placeholder="+254 700 000 000" className={`${inp} pl-10`} />
              </div>
            </div>
          </div>
          <div>
            <label className={LBL}>Address</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input {...field('address')} placeholder="123 Main St, Nairobi" className={`${inp} pl-10`} />
            </div>
          </div>
          <div>
            <label className={LBL}>Website</label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input {...field('websiteUrl')} placeholder="https://company.com" className={`${inp} pl-10`} />
            </div>
          </div>
          <div>
            <label className={LBL}>Description</label>
            <Textarea {...field('description')} placeholder="Brief description of your organisation…"
              rows={3} className="resize-none rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm" />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={register.isPending}>
            Cancel
          </Button>
          <Button className="rounded-xl gap-2 min-w-[160px]" onClick={handleSubmit} disabled={register.isPending}>
            {register.isPending ? <Spinner sm /> : <Plus className="h-4 w-4" />}
            Create Organisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ org, onSave, isSaving, canManage }: {
  org: Organisation;
  onSave: (d: Partial<Organisation>) => void;
  isSaving: boolean;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<Partial<Organisation>>({});
  const fileRef               = useRef<HTMLInputElement>(null);
  const current               = { ...org, ...form };

  const inp = (extra = '') =>
    `h-11 rounded-xl border-border/60 bg-background text-sm transition-colors ${
      editing ? 'focus:border-primary/70' : 'opacity-80 cursor-default'
    } ${extra}`;

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
    <div className="space-y-6">

      {/* Hero banner — theme-aware gradient with floating orbs, matches the dashboard system */}
      <Card className="org-fade-up org-ring-grad border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="h-36 sm:h-44 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 dark:from-indigo-900 dark:via-blue-950 dark:to-slate-900">
          {/* Floating orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl"
              style={{ background: 'rgba(139,92,246,0.40)', animation: 'org-float-a 12s ease-in-out infinite' }} />
            <div className="absolute -bottom-12 -left-10 h-48 w-48 rounded-full blur-3xl"
              style={{ background: 'rgba(56,189,248,0.30)', animation: 'org-float-b 16s ease-in-out infinite' }} />
            <div className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }} />
          </div>
          <div className="absolute top-4 right-4 z-10">
            <StatusBadge isActive={org.isActive ?? false} />
          </div>
        </div>

        <CardContent className="pt-0 pb-6 px-5 sm:px-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 sm:-mt-12">

            {/* Logo */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-background bg-white overflow-hidden shadow-xl ring-1 ring-black/5">
                {current.logoUrl ? (
                  <img src={current.logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40">
                    <Building2 className="h-9 w-9 text-blue-400" />
                  </div>
                )}
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

            {/* Name + meta */}
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

            {/* Edit / Save */}
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

      {/* Detail grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Basic Information" description="Core organisation details" icon={Building2}
          iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <div className="space-y-4">
            <div>
              <label className={LBL}>Organisation Name</label>
              <Input {...fp('organisationName')} placeholder="Acme Corp" className={inp()} />
            </div>
            <div>
              <label className={LBL}>Org Code <span className="normal-case font-normal text-muted-foreground tracking-normal">(read-only)</span></label>
              <Input value={org.orgCode ?? ''} disabled readOnly
                className="h-11 rounded-xl border-border/60 bg-muted/50 text-sm font-mono text-muted-foreground" />
            </div>
            <div>
              <label className={LBL}>Description</label>
              <Textarea
                value={(form.description as string) ?? (org.description as string) ?? ''}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                disabled={!editing} placeholder="Brief description of your organisation…"
                rows={4} className="resize-none rounded-xl border-border/60 bg-background text-sm leading-relaxed" />
            </div>
            <div>
              <label className={LBL}>Website</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...fp('websiteUrl')} placeholder="https://company.com" className={inp('pl-10')} />
              </div>
            </div>
            <div>
              <label className={LBL}>Logo URL</label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input {...fp('logoUrl')} placeholder="https://company.com/logo.png" className={inp('pl-10')} />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Contact Details" description="How to reach your organisation" icon={Phone}
            iconColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <div className="space-y-4">
              <div>
                <label className={LBL}>Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input {...fp('OrgEmail')} type="email" placeholder="hello@company.com" className={inp('pl-10')} />
                </div>
              </div>
              <div>
                <label className={LBL}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input {...fp('phoneNumber')} placeholder="+254 700 000 000" className={inp('pl-10')} />
                </div>
              </div>
              <div>
                <label className={LBL}>Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input {...fp('address')} placeholder="123 Main St, City" className={inp('pl-10')} />
                </div>
              </div>
            </div>
          </SectionCard>

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

// ─── Settings Tab ──────────────────────────────────────────────────────────────

const NOTIFICATION_KEYS: Array<{
  key: keyof NonNullable<PlatformSettings['notificationSettings']>;
  label: string; description: string; icon: React.ElementType;
}> = [
  { key: 'meetingReminders',   label: 'Meeting reminders',   description: 'Send reminders before scheduled meetings',   icon: Calendar },
  { key: 'taskAssignments',    label: 'Task assignments',    description: 'Notify users when tasks are assigned',       icon: Zap      },
  { key: 'emailNotifications', label: 'Email notifications', description: 'Send email alerts for key events',           icon: Mail     },
  { key: 'weeklyDigest',       label: 'Weekly digest',       description: 'Send a weekly summary email to all members', icon: FileText },
];

function SettingsTab({ org, canManage }: { org: Organisation; canManage: boolean }) {
  const { data: settings, isLoading, error, refetch } = useOrgSettings(org.organisationId);
  const updateSettings = useUpdateOrgSettings();
  const [localPatch, setLocalPatch] = useState<Omit<UpdateSettingsData, 'version'>>({});
  const [saved, setSaved] = useState(false);
  const isDirty = Object.keys(localPatch).length > 0;

  const notif    = { ...settings?.notificationSettings,  ...(localPatch.notificationSettings  ?? {}) };
  const security = { ...settings?.securitySettings,      ...(localPatch.securitySettings      ?? {}) };

  function patchNotif(key: string, val: boolean) {
    setLocalPatch(p => ({
      ...p,
      notificationSettings: { ...notif, [key]: val } as NonNullable<PlatformSettings['notificationSettings']>,
    }));
  }

  async function handleSave() {
    try {
      await updateSettings.mutateAsync(localPatch);
      toast.success('Settings saved');
      setSaved(true);
      setLocalPatch({});
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to save settings';
      toast.error(msg);
    }
  }

  // Skeleton on first load — feels much faster than a centered spinner.
  if (isLoading && !settings) return <SettingsTabSkeleton />;

  if (error) return (
    <div className="max-w-3xl">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <WifiOff className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground/70">Could not load settings</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? (error as Error)?.message
              ?? 'An error occurred loading your organisation settings.'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4" />Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionCard title="Organisation Settings" description="Applied across meetings and members" icon={Settings}
        iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LBL}>App Name</label>
            <Input defaultValue={settings?.appName ?? ''} disabled={!canManage}
              onChange={(e) => setLocalPatch(p => ({ ...p, appName: e.target.value }))}
              className="h-11 rounded-xl border-border/60 text-sm bg-background" />
          </div>
          <div>
            <label className={LBL}>Max Members</label>
            <Input type="number" defaultValue={settings?.memberSettings?.maxMembers ?? ''} disabled={!canManage}
              onChange={(e) => setLocalPatch(p => ({ ...p, memberSettings: { ...p.memberSettings, maxMembers: +e.target.value } }))}
              className="h-11 rounded-xl border-border/60 text-sm bg-background" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Notification Preferences" description="Control which events trigger notifications" icon={Bell}
        iconColor="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <div className="space-y-0.5">
          {NOTIFICATION_KEYS.map(({ key, label, description, icon: Icon }) => (
            <ToggleRow key={key} icon={Icon} iconColor="bg-muted/60 text-muted-foreground"
              label={label} description={description}
              checked={!!(notif as Record<string, unknown>)?.[key]}
              disabled={!canManage} onCheckedChange={(v) => patchNotif(key, v)} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Security Settings" description="Access control and session management" icon={Shield}
        iconColor="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        <div className="space-y-0.5">
          {([
            { key: 'autoLogout',      label: 'Auto Logout',     description: 'Automatically log out inactive sessions'   },
            { key: 'pinRequired',     label: 'PIN Required',    description: 'Require a PIN for sensitive operations'    },
            { key: 'dataEncryption',  label: 'Data Encryption', description: 'Encrypt sensitive data at rest'            },
            { key: 'auditLogEnabled', label: 'Audit Log',       description: 'Track all admin actions in an audit trail' },
          ] as const).map(({ key, label, description }) => (
            <ToggleRow key={key} label={label} description={description}
              checked={!!(security as Record<string, unknown>)?.[key]}
              disabled={!canManage}
              onCheckedChange={(v) => setLocalPatch(p => ({
                ...p,
                securitySettings: { ...security, [key]: v } as NonNullable<PlatformSettings['securitySettings']>,
              }))} />
          ))}
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-semibold">Session Timeout</p>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-logout after inactivity (minutes)</p>
            </div>
            <Input type="number" defaultValue={settings?.securitySettings?.sessionTimeout ?? 30}
              disabled={!canManage}
              onChange={(e) => setLocalPatch(p => ({
                ...p,
                securitySettings: { ...security, sessionTimeout: +e.target.value } as NonNullable<PlatformSettings['securitySettings']>,
              }))}
              className="h-9 w-24 rounded-xl border-border/60 text-sm bg-background text-right" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Integrations" description="Third-party service connections" icon={Globe}
        iconColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
        <div className="space-y-0.5">
          {([
            { key: 'slackEnabled',         label: 'Slack',           description: 'Post notifications to Slack channels'  },
            { key: 'outlookEnabled',        label: 'Outlook',         description: 'Sync meetings with Outlook Calendar'   },
            { key: 'googleCalendarEnabled', label: 'Google Calendar', description: 'Sync meetings with Google Calendar'    },
          ] as const).map(({ key, label, description }) => {
            const integrations = { ...settings?.integrationSettings, ...(localPatch.integrationSettings ?? {}) };
            return (
              <ToggleRow key={key} label={label} description={description}
                checked={!!(integrations as Record<string, unknown>)?.[key]}
                disabled={!canManage}
                onCheckedChange={(v) => setLocalPatch(p => ({
                  ...p,
                  integrationSettings: { ...integrations, [key]: v } as NonNullable<UpdateSettingsData['integrationSettings']>,
                }))} />
            );
          })}
        </div>
      </SectionCard>

      {/* Sticky save bar — slides in only when there are unsaved changes.
          Stays visible even when scrolling the long settings list. */}
      {canManage && isDirty && (
        <div className="sticky bottom-4 z-20 mt-2">
          <div className="rounded-2xl border border-amber-300/70 dark:border-amber-700/60 bg-gradient-to-r from-amber-50/95 to-white/95 dark:from-amber-950/40 dark:to-gray-900/80 backdrop-blur-md shadow-xl shadow-amber-900/5 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-amber-500" />
              </span>
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-1.5"
                onClick={() => setLocalPatch({})} disabled={updateSettings.isPending}>
                <X className="h-3.5 w-3.5" />Discard
              </Button>
              <Button size="sm" className="rounded-xl gap-1.5 min-w-[120px] h-9 text-xs bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20"
                onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <><Spinner sm />Saving…</>
                  : saved ? <><CheckCircle2 className="h-3.5 w-3.5" />Saved!</>
                  : <><Save className="h-3.5 w-3.5" />Save changes</>}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Inline "Saved!" toast pill — appears briefly after a successful save when no longer dirty */}
      {canManage && !isDirty && saved && (
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />Settings saved
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Security Tab ──────────────────────────────────────────────────────────────

const SECURITY_POLICIES_CONFIG = [
  { key: 'auditLogEnabled', label: 'Audit Log Enabled', description: 'Track all admin actions in an audit trail',   icon: Shield,  color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'       },
  { key: 'pinRequired',     label: 'PIN Required',      description: 'Require a PIN code for sensitive operations', icon: Key,     color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { key: 'dataEncryption',  label: 'Data Encryption',   description: 'Encrypt sensitive data stored at rest',       icon: Lock,    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'    },
  { key: 'autoLogout',      label: 'Auto Logout',       description: 'Automatically sign out inactive sessions',    icon: Monitor, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'      },
] as const;

function SecurityTab({ org, canManage }: { org: Organisation; canManage: boolean }) {
  const { data: settings, isLoading } = useOrgSettings(org.organisationId);
  const updateSettings = useUpdateOrgSettings();
  const [localSec, setLocalSec] = useState<Record<string, boolean>>({});
  const isDirty = Object.keys(localSec).length > 0;
  const security = { ...settings?.securitySettings, ...localSec };

  async function handleSaveSecurityPolicies() {
    try {
      await updateSettings.mutateAsync({
        securitySettings: security as NonNullable<PlatformSettings['securitySettings']>,
      });
      toast.success('Security policies updated');
      setLocalSec({});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to save security settings';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionCard title="Security Policies" description="Organisation-wide access and data enforcement" icon={ShieldCheck}
        iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        {isLoading && !settings ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <SkelLine className="h-8 w-8 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <SkelLine className="h-3.5 w-32" />
                    <SkelLine className="h-3 w-56" />
                  </div>
                </div>
                <SkelLine className="h-5 w-9 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-0.5">
              {SECURITY_POLICIES_CONFIG.map(({ key, label, description, icon: Icon, color }) => (
                <ToggleRow key={key} icon={Icon} iconColor={color} label={label} description={description}
                  checked={!!(security as Record<string, unknown>)?.[key]}
                  disabled={!canManage}
                  onCheckedChange={(v) => setLocalSec(p => ({ ...p, [key]: v }))} />
              ))}
            </div>
            {canManage && isDirty && (
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border/30">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                  onClick={() => setLocalSec({})} disabled={updateSettings.isPending}>
                  <X className="h-3.5 w-3.5" />Discard
                </Button>
                <Button size="sm" className="rounded-xl gap-1.5 min-w-[130px] bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20"
                  onClick={handleSaveSecurityPolicies} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? <Spinner sm /> : <Save className="h-3.5 w-3.5" />}
                  Save Policies
                </Button>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Active Sessions" description="Devices currently logged in to your account" icon={Monitor}
        iconColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
        <div className="space-y-4">
          <ComingSoonBanner feature="Active session management" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add these routes and register them in{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">ENDPOINTS.AUTH</code>:
          </p>
          <div className="rounded-xl bg-muted/50 border border-border/40 p-3.5 space-y-1.5 font-mono text-xs text-muted-foreground">
            <div><span className="text-emerald-600 font-semibold">GET</span>    /auth/sessions</div>
            <div><span className="text-red-500 font-semibold">DELETE</span> /auth/sessions/:id</div>
            <div><span className="text-blue-500 font-semibold">POST</span>   /auth/sessions/revoke-others</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Login History" description="Recent authentication events" icon={Activity}
        iconColor="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
        <div className="space-y-4">
          <ComingSoonBanner feature="Login history" />
          <div className="rounded-xl bg-muted/50 border border-border/40 p-3.5 font-mono text-xs text-muted-foreground">
            <span className="text-emerald-600 font-semibold">GET</span>    /auth/login-history
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'profile',  label: 'Profile',  icon: Building2, activeColor: 'text-blue-500'    },
  { value: 'settings', label: 'Settings', icon: Settings,  activeColor: 'text-violet-500'  },
  { value: 'security', label: 'Security', icon: Shield,    activeColor: 'text-emerald-500' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrganisationPage() {
  const {
    can, isSuperAdmin, isOrgAdmin,
    isLoading: authLoading, authError, authErrorKind,
    refresh: refreshAuth, user,
  } = usePermissions();

  const queryClient = useQueryClient();
  const canManage   = isSuperAdmin || isOrgAdmin || can('org:manage');

  // PERF: enable the org fetch as soon as we have ANY user (cached or fresh).
  // Previously this was gated on `!authLoading`, which made it wait for
  // /auth/me to finish before /organisations/my-organisation could start —
  // forcing two sequential round-trips. Now they run in parallel: the cached
  // user from localStorage / JWT lets the org query fire on first render.
  const {
    data: org,
    isLoading: orgLoading,
    error: orgFetchError,
    refetch: refetchOrg,
  } = useMyOrganisation(!!user);

  const updateOrg                         = useUpdateOrganisation();
  const [activeTab, setActiveTab]         = useState<TabValue>('profile');
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // Inject the shared dashboard motion + surface system so this page
  // matches the rest of the app (animations, glass, gradient ring, light-mode
  // ambient backdrop). Idempotent — runs once per app session.
  useEffect(() => {
    const id = 'org-page-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes shimmer       { 100% { transform: translateX(100%); } }
      @keyframes org-fade-up   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes org-grad-pan  { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
      @keyframes org-float-a   { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(14px,-12px) scale(1.06); } }
      @keyframes org-float-b   { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-12px,8px) scale(1.04); } }
      .org-fade-up   { animation: org-fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both; }
      .org-card-anim { transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease, background .2s ease; }
      .org-card-anim:hover { transform: translateY(-1px); }

      /* Gradient ring on hero card */
      .org-ring-grad { position: relative; }
      .org-ring-grad::before {
        content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit;
        background: linear-gradient(135deg, hsl(239 84% 67% / 0.45), hsl(217 91% 60% / 0.30), transparent 60%);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
      }

      /* Light-mode ambient backdrop wash — matches dashboard */
      :root:not(.dark) .org-root::before {
        content: ''; position: fixed; inset: 0; pointer-events: none; z-index: -1;
        background:
          radial-gradient(900px 500px at 12% -10%, hsl(239 90% 70% / 0.08), transparent 60%),
          radial-gradient(700px 420px at 95% 0%,  hsl(217 90% 65% / 0.07), transparent 60%),
          radial-gradient(800px 500px at 50% 100%, hsl(196 85% 65% / 0.06), transparent 60%);
      }
      :root:not(.dark) .org-section-card { background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%); border-color: hsl(220 22% 90%); }
      :root:not(.dark) .org-section-card:hover { border-color: hsl(220 22% 84%); box-shadow: 0 12px 28px -14px hsl(232 60% 30% / 0.10); }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .org-fade-up, .org-card-anim { animation: none !important; transition: none !important; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  // PERF: prefetch the org settings the moment the org loads. This way when
  // the user clicks Settings or Security, the data is already in the cache
  // and the tab renders instantly instead of triggering a fresh round-trip.
  useEffect(() => {
    if (!org?.organisationId) return;
    queryClient.prefetchQuery({
      queryKey: ['settings', 'org', org.organisationId],
      queryFn: async () => {
        const res = await apiClient.get(ENDPOINTS.SETTINGS.BY_ORG(org.organisationId), {
          timeout: 12_000,
        });
        const outer = res.data?.data;
        return outer?.data ?? outer ?? res.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [org?.organisationId, queryClient]);

  const handleSaveProfile = useCallback((data: Partial<Organisation>) => {
    if (!org) return;
    updateOrg.mutate(
      { organisationId: org.organisationId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['organisations'] });
          toast.success('Organisation profile updated');
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } }; message?: string })
            ?.response?.data?.message ?? (err as { message?: string })?.message
            ?? 'Failed to save changes';
          toast.error(msg);
        },
      },
    );
  }, [org, updateOrg, queryClient]);

  // PERF: only block on auth when there is no user at all (no cached token).
  // If a cached user exists, render immediately — the org query is already
  // in-flight in parallel and will hydrate on resolve.
  if (authLoading && !user) {
    return <PageLoader label="Loading organisation…" />;
  }
  // Block on org fetch only on the very first load (no data yet, no error).
  if (!org && orgLoading && !orgFetchError) {
    return <PageLoader label="Loading organisation…" />;
  }

  // ── Hard auth error ────────────────────────────────────────────────────────
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

  // ── Org fetch error ────────────────────────────────────────────────────────
  if (orgFetchError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Failed to Load Organisation</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">
            {(orgFetchError as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? (orgFetchError as Error)?.message
              ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetchOrg()}>
          <RefreshCcw className="h-4 w-4" />Retry
        </Button>
      </div>
    );
  }

  // ── No org — admin can create ──────────────────────────────────────────────
  if (canManage && !org) {
    return (
      <>
        {/* Full-bleed: no container/max-w cap — let AppLayout's p-6 do the
            outer padding so the page fills the space next to the sidebar. */}
        <div className="space-y-6 pb-10">
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
            <Button size="lg" className="gap-2.5 rounded-xl px-8 h-12 text-base shadow-md"
              onClick={() => setShowCreateOrg(true)}>
              <Plus className="h-5 w-5" />Create Organisation
            </Button>
            <p className="text-xs text-muted-foreground">Your organisation will be reviewed before becoming fully active.</p>
          </div>
        </div>
        <CreateOrgDialog open={showCreateOrg} onOpenChange={setShowCreateOrg}
          onCreated={() => refreshAuth().then(() => refetchOrg())} />
      </>
    );
  }

  // ── Non-admin, no org ──────────────────────────────────────────────────────
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

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    // Full-bleed: AppLayout's p-6 handles outer padding; no container/max-w cap
    // so the page expands to fill the area between the sidebar and right edge,
    // matching the Dashboard / Members layout convention.
    <div className="org-root space-y-6 pb-12 antialiased">
      {authError && authErrorKind === 'server_error' && (
        <ServerErrorBanner message={authError} onRetry={refreshAuth} />
      )}

      {/* Page header — gradient-shimmer title, role-aware subtitle, status pill */}
      <div className="org-fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
            <Building2 className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2.25} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight leading-tight"
              style={{
                background: 'linear-gradient(128deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)/0.55) 40%, hsl(var(--primary)) 60%, hsl(var(--foreground)) 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'org-grad-pan 8s linear infinite',
              }}
            >
              Organisation
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {canManage
                ? 'Manage your organisation profile, settings, and security.'
                : 'View your organisation details.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {org.orgCode && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/60 text-muted-foreground">
              <Hash className="h-3 w-3" />{org.orgCode}
            </span>
          )}
          <StatusBadge isActive={org.isActive ?? false} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="h-auto p-1 bg-muted/40 rounded-xl border border-border/40 gap-1 flex-wrap sm:flex-nowrap shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {TABS.map(({ value, label, icon: Icon, activeColor }) => (
            <TabsTrigger key={value} value={value}
              className="flex-1 sm:flex-none rounded-lg text-[13px] h-9 px-4 sm:px-5 font-semibold tracking-tight gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/60 transition-all">
              <Icon className={`h-4 w-4 transition-colors ${activeTab === value ? activeColor : 'text-muted-foreground'}`} strokeWidth={activeTab === value ? 2.25 : 2} />
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
          <SecurityTab org={org} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}