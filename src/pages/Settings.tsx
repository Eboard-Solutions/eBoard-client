'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useDefaultSettings, useUpdateSettings } from '@/hooks/api/useSettings';
import { useMyOrganisation, useUpdateOrganisation } from '@/hooks/api/useOrganisations';
import { usePermissions } from '@/lib/permissions';

import {
  Building, Users, Bell, Shield, Zap, Globe, Mail, Key,
  Database, Palette, Save, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, Smartphone, Copy, Eye, EyeOff, ShieldCheck,
  Lock, Unlock, Activity, Server, X, Check, Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgForm {
  organisationName: string;
  OrgEmail: string;
  phoneNumber: string;
  address: string;
  websiteUrl: string;
  description: string;
}

interface NotifSettings {
  emailNotifications: boolean;
  meetingReminders:   boolean;
  taskAssignments:    boolean;
  weeklyDigest:       boolean;
}

interface SecuritySettings {
  autoLogout:       boolean;
  pinRequired:      boolean;
  dataEncryption:   boolean;
  auditLogEnabled:  boolean;
  sessionTimeout:   number;
}

interface IntegrationSettings {
  googleCalendarEnabled: boolean;
  outlookEnabled:        boolean;
  slackEnabled:          boolean;
}

interface MemberSettings {
  allowSelfRegistration: boolean;
  requireVerification:   boolean;
  allowProfilePhotos:    boolean;
  maxMembers:            number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SettingRow({
  label, description, checked, onChange, disabled,
}: {
  label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors group">
      <div className="space-y-0.5 min-w-0 pr-4">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="shrink-0" />
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, description, iconColor,
}: {
  icon: React.ElementType; title: string; description: string; iconColor: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SaveButton({ isPending, isDirty, onClick }: {
  isPending: boolean; isDirty: boolean; onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/40">
      {isDirty && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Unsaved changes
        </p>
      )}
      <div className="ml-auto">
        <Button onClick={onClick} disabled={isPending || !isDirty} className="gap-2 rounded-xl min-w-[120px]">
          {isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            : <><Save className="h-4 w-4" />Save Changes</>
          }
        </Button>
      </div>
    </div>
  );
}

// ─── 2FA QR Dialog ────────────────────────────────────────────────────────────

function TwoFactorDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep]           = useState<'qr' | 'verify' | 'done'>('qr');
  const [code, setCode]           = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Simulated TOTP secret — in production this comes from your backend
  // e.g. POST /auth/2fa/generate → { qrUrl, secret }
  const secret  = 'JBSWY3DPEHPK3PXP';
  const appName = 'eBoard';
  const email   = 'admin@eboard.org';

  // otpauth URL that QR code encodes
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

  // QR code via a public API (no backend dependency)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

  const handleVerify = async () => {
    if (code.length !== 6) { toast.error('Enter the 6-digit code from your authenticator app'); return; }
    setVerifying(true);
    // TODO: wire to POST /auth/2fa/verify { code } → { success }
    await new Promise((r) => setTimeout(r, 1200));
    setVerifying(false);
    setStep('done');
    toast.success('Two-factor authentication enabled!');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setStep('qr'); setCode(''); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Two-Factor Authentication</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {step === 'qr'     && 'Scan the QR code with your authenticator app'}
                {step === 'verify' && 'Enter the 6-digit code from your app'}
                {step === 'done'   && '2FA has been enabled on your account'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          {(['qr', 'verify', 'done'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : (step === 'verify' && s === 'qr') || step === 'done'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {((step === 'verify' && s === 'qr') || step === 'done') && s !== 'done'
                  ? <Check className="h-3 w-3" />
                  : step === 'done' && s === 'done'
                  ? <Check className="h-3 w-3" />
                  : i + 1
                }
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${
                (step === 'verify' && i === 0) || step === 'done'
                  ? 'bg-emerald-400' : 'bg-border'
              }`} />}
            </div>
          ))}
        </div>

        {/* QR step */}
        {step === 'qr' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
              <img
                src={qrUrl}
                alt="2FA QR Code"
                className="h-48 w-48 rounded-lg border border-border/60 bg-white"
              />
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Open <span className="font-semibold text-foreground">Google Authenticator</span>,{' '}
                <span className="font-semibold text-foreground">Authy</span>, or any TOTP app and scan this code.
              </p>
            </div>

            {/* Manual entry */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Can't scan? Enter manually
              </p>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/60 border border-border/50">
                <code className="flex-1 text-xs font-mono tracking-widest text-foreground break-all">
                  {showSecret ? secret : '•'.repeat(secret.length)}
                </code>
                <button
                  onClick={() => setShowSecret((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(secret); toast.success('Secret copied'); }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Save this secret key in a safe place. You'll need it to recover access if you lose your device.
              </p>
            </div>
          </div>
        )}

        {/* Verify step */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-muted/40 border border-border/60 text-center">
              <div className="h-12 w-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Enter verification code</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open your authenticator app and enter the current 6-digit code
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                6-Digit Code
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-[0.5em] h-14 rounded-xl border-border/60"
                maxLength={6}
                onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) handleVerify(); }}
              />
            </div>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">2FA Enabled!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                Your account is now protected with two-factor authentication.
                You'll be asked for a code at each login.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="rounded-xl flex-1">
            {step === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'qr' && (
            <Button onClick={() => setStep('verify')} className="rounded-xl flex-1 gap-2">
              Next <Check className="h-4 w-4" />
            </Button>
          )}
          {step === 'verify' && (
            <Button onClick={handleVerify} disabled={verifying || code.length !== 6}
              className="rounded-xl flex-1 gap-2">
              {verifying
                ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</>
                : <><ShieldCheck className="h-4 w-4" />Verify</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Org Dialog ────────────────────────────────────────────────────────

function DeleteOrgDialog({ open, onOpenChange, orgName }: {
  open: boolean; onOpenChange: (v: boolean) => void; orgName: string;
}) {
  const [confirmText, setConfirmText] = useState('');
  const expected = orgName?.toUpperCase() ?? 'DELETE';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            Delete Organisation
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-1">
            <p>This will <strong>permanently delete</strong> your organisation and all associated data including members, meetings, documents, and tasks. This cannot be undone.</p>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive mb-2">
                Type <code className="font-mono font-bold">{expected}</code> to confirm
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder={expected}
                className="font-mono text-sm border-destructive/40 focus:border-destructive"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== expected}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { toast.error('Organisation deletion requires super admin approval'); onOpenChange(false); }}
          >
            Delete Organisation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({ icon: Icon, name, description, connected, onToggle }: {
  icon: React.ElementType; name: string; description: string;
  connected: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{name}</p>
            {connected && (
              <Badge className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={connected} onCheckedChange={onToggle} className="shrink-0 ml-4" />
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </div>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────

export function Settings() {
  const { user, isOrgAdmin, isSuperAdmin } = usePermissions();
  const canManage = isOrgAdmin || isSuperAdmin;

  // ── Data fetching ─────────────────────────────────────────────────────────
  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useDefaultSettings();

  const {
    data: orgData,
    isLoading: orgLoading,
    refetch: refetchOrg,
  } = useMyOrganisation(!!(user));

  const updateSettings = useUpdateSettings();
  const updateOrg      = useUpdateOrganisation();

  // Unwrap ResponseObject correctly
  const settings = (() => {
    if (!settingsData) return undefined;
    // If it has a .data property, extract it; otherwise use as-is
    return 'data' in settingsData ? settingsData.data : settingsData;
  })() as any;

  const org = (() => {
    if (!orgData) return undefined;
    return 'data' in orgData ? orgData.data : orgData;
  })() as any;

  const isLoading = settingsLoading || orgLoading;

  // ── Local form state ──────────────────────────────────────────────────────

  const [orgForm, setOrgForm] = useState<OrgForm>({
    organisationName: '', OrgEmail: '', phoneNumber: '',
    address: '', websiteUrl: '', description: '',
  });

  const [notifSettings, setNotifSettings] = useState<NotifSettings>({
    emailNotifications: true, meetingReminders: true,
    taskAssignments: true, weeklyDigest: false,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    autoLogout: false, pinRequired: false, dataEncryption: true,
    auditLogEnabled: true, sessionTimeout: 30,
  });

  const [memberSettings, setMemberSettings] = useState<MemberSettings>({
    allowSelfRegistration: false, requireVerification: true,
    allowProfilePhotos: true, maxMembers: 50,
  });

  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    googleCalendarEnabled: false, outlookEnabled: false, slackEnabled: false,
  });

  // Dirty flags — track which sections have unsaved changes
  const [orgDirty,      setOrgDirty]      = useState(false);
  const [notifDirty,    setNotifDirty]    = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [memberDirty,   setMemberDirty]   = useState(false);
  const [integDirty,    setIntegDirty]    = useState(false);

  // Dialog state
  const [show2FA,       setShow2FA]       = useState(false);
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);

  // ── Populate forms from real data ─────────────────────────────────────────
  useEffect(() => {
    if (!org) return;
    setOrgForm({
      organisationName: org.organisationName ?? '',
      OrgEmail:         org.OrgEmail         ?? '',
      phoneNumber:      org.phoneNumber       ?? '',
      address:          org.address           ?? '',
      websiteUrl:       org.websiteUrl        ?? '',
      description:      org.description       ?? '',
    });
    setOrgDirty(false);
  }, [org]);

  useEffect(() => {
    if (!settings) return;

    if (settings.notificationSettings) {
      setNotifSettings({
        emailNotifications: settings.notificationSettings.emailNotifications ?? true,
        meetingReminders:   settings.notificationSettings.meetingReminders   ?? true,
        taskAssignments:    settings.notificationSettings.taskAssignments    ?? true,
        weeklyDigest:       settings.notificationSettings.weeklyDigest       ?? false,
      });
    }
    if (settings.securitySettings) {
      setSecuritySettings({
        autoLogout:      settings.securitySettings.autoLogout      ?? false,
        pinRequired:     settings.securitySettings.pinRequired      ?? false,
        dataEncryption:  settings.securitySettings.dataEncryption   ?? true,
        auditLogEnabled: settings.securitySettings.auditLogEnabled  ?? true,
        sessionTimeout:  settings.securitySettings.sessionTimeout   ?? 30,
      });
    }
    if (settings.memberSettings) {
      setMemberSettings({
        allowSelfRegistration: settings.memberSettings.allowSelfRegistration ?? false,
        requireVerification:   settings.memberSettings.requireVerification   ?? true,
        allowProfilePhotos:    settings.memberSettings.allowProfilePhotos    ?? true,
        maxMembers:            settings.memberSettings.maxMembers             ?? 50,
      });
    }
    if (settings.integrationSettings) {
      setIntegrationSettings({
        googleCalendarEnabled: settings.integrationSettings.googleCalendarEnabled ?? false,
        outlookEnabled:        settings.integrationSettings.outlookEnabled        ?? false,
        slackEnabled:          settings.integrationSettings.slackEnabled          ?? false,
      });
    }

    setNotifDirty(false);
    setSecurityDirty(false);
    setMemberDirty(false);
    setIntegDirty(false);
  }, [settings]);

  // ── Save handlers ─────────────────────────────────────────────────────────

  const handleSaveOrg = useCallback(async () => {
    if (!org?.organisationId) return;
    try {
      await updateOrg.mutateAsync({ organisationId: org.organisationId, data: orgForm });
      toast.success('Organisation profile updated');
      setOrgDirty(false);
      refetchOrg();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save organisation');
    }
  }, [org, orgForm, updateOrg, refetchOrg]);

  const handleSaveSettings = useCallback(async (
    patch: Partial<{
      notificationSettings: Partial<NotifSettings>;
      securitySettings: Partial<SecuritySettings>;
      memberSettings: Partial<MemberSettings>;
      integrationSettings: Partial<IntegrationSettings>;
    }>,
    clearDirty: () => void,
  ) => {
    try {
      await updateSettings.mutateAsync(patch);
      toast.success('Settings saved');
      clearDirty();
      refetchSettings();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save settings');
    }
  }, [updateSettings, settings, refetchSettings]);

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setOrg(patch: Partial<OrgForm>) {
    setOrgForm((p) => ({ ...p, ...patch }));
    setOrgDirty(true);
  }

  function setNotif(patch: Partial<NotifSettings>) {
    setNotifSettings((p) => ({ ...p, ...patch }));
    setNotifDirty(true);
  }

  function setSecurity(patch: Partial<SecuritySettings>) {
    setSecuritySettings((p) => ({ ...p, ...patch }));
    setSecurityDirty(true);
  }

  function setMember(patch: Partial<MemberSettings>) {
    setMemberSettings((p) => ({ ...p, ...patch }));
    setMemberDirty(true);
  }

  function setInteg(patch: Partial<IntegrationSettings>) {
    setIntegrationSettings((p) => ({ ...p, ...patch }));
    setIntegDirty(true);
  }

  const inp = 'h-11 rounded-xl border-border/60 focus:border-primary/70 bg-background text-sm';
  const lbl = 'block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="shrink-0 h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <Server className="h-6 w-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {org?.organisationName
              ? `Managing preferences for ${org.organisationName}`
              : 'Manage your board and system preferences'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="h-auto p-1 bg-muted/40 rounded-xl border border-border/30 gap-1 flex-wrap sm:flex-nowrap">
          {[
            { value: 'organization',   label: 'Organisation', icon: Building },
            { value: 'members',        label: 'Members',      icon: Users    },
            { value: 'notifications',  label: 'Alerts',       icon: Bell     },
            { value: 'security',       label: 'Security',     icon: Shield   },
            { value: 'integrations',   label: 'Integrations', icon: Zap      },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}
              className="flex-1 rounded-lg text-sm h-9 px-3 sm:px-5 font-medium data-[state=active]:shadow-sm gap-1.5">
              <Icon className="h-3.5 w-3.5" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Organisation Tab ── */}
        <TabsContent value="organization" className="space-y-5 focus-visible:outline-none">
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
              <SectionHeader
                icon={Building} title="Organisation Profile"
                description="Core details displayed across your board workspace"
                iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              />
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-5">
              {isLoading ? <SettingsSkeleton /> : (
                <>
                  <div>
                    <label className={lbl}>Organisation Name</label>
                    <Input value={orgForm.organisationName} className={inp}
                      placeholder="Acme Corp"
                      onChange={(e) => setOrg({ organisationName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Contact Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input value={orgForm.OrgEmail} type="email" className={`${inp} pl-10`}
                          placeholder="hello@company.com"
                          onChange={(e) => setOrg({ OrgEmail: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Phone Number</label>
                      <Input value={orgForm.phoneNumber} className={inp}
                        placeholder="+254 700 000 000"
                        onChange={(e) => setOrg({ phoneNumber: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Address</label>
                    <Input value={orgForm.address} className={inp}
                      placeholder="123 Main St, Nairobi"
                      onChange={(e) => setOrg({ address: e.target.value })} />
                  </div>
                  <div>
                    <label className={lbl}>Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input value={orgForm.websiteUrl} className={`${inp} pl-10`}
                        placeholder="https://company.com"
                        onChange={(e) => setOrg({ websiteUrl: e.target.value })} />
                    </div>
                  </div>

                  <SaveButton
                    isPending={updateOrg.isPending} isDirty={orgDirty}
                    onClick={handleSaveOrg} />
                </>
              )}
            </CardContent>
          </Card>

          {/* System read-only info */}
          {!isLoading && org && (
            <Card className="border border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="px-5 pt-4 pb-3 border-b border-border/30 bg-muted/20">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">System Information</p>
              </CardHeader>
              <CardContent className="px-5 py-2 divide-y divide-border/30">
                {[
                  { label: 'Organisation ID', value: org.organisationId ?? '—', mono: true },
                  { label: 'Org Code',        value: org.orgCode         ?? '—', mono: true },
                  { label: 'Status',          value: org.status          ?? '—', mono: false },
                  { label: 'Approved By',     value: org.approvedBy      ?? 'Pending', mono: false },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`text-xs font-semibold truncate max-w-[200px] text-right ${mono ? 'font-mono' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members" className="space-y-5 focus-visible:outline-none">
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
              <SectionHeader
                icon={Users} title="Member Management"
                description="Control registration, verification, and member limits"
                iconColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              />
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3">
              {isLoading ? <SettingsSkeleton /> : (
                <>
                  <SettingRow
                    label="Allow Self Registration"
                    description="Members can register without an admin invitation"
                    checked={memberSettings.allowSelfRegistration}
                    onChange={(v) => setMember({ allowSelfRegistration: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Require Email Verification"
                    description="New members must verify their email address before accessing the board"
                    checked={memberSettings.requireVerification}
                    onChange={(v) => setMember({ requireVerification: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Allow Profile Photos"
                    description="Members can upload and display profile pictures"
                    checked={memberSettings.allowProfilePhotos}
                    onChange={(v) => setMember({ allowProfilePhotos: v })}
                    disabled={!canManage}
                  />

                  <Separator className="my-2" />

                  <div>
                    <label className={lbl}>Maximum Members</label>
                    <Input
                      type="number" min={1} max={1000}
                      value={memberSettings.maxMembers}
                      className={`${inp} max-w-[160px]`}
                      onChange={(e) => setMember({ maxMembers: +e.target.value })}
                      disabled={!canManage}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Current plan allows up to {memberSettings.maxMembers} members
                    </p>
                  </div>

                  <SaveButton
                    isPending={updateSettings.isPending} isDirty={memberDirty}
                    onClick={() => handleSaveSettings(
                      { memberSettings },
                      () => setMemberDirty(false),
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="space-y-5 focus-visible:outline-none">
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
              <SectionHeader
                icon={Bell} title="Notification Preferences"
                description="Control which events send alerts to your members"
                iconColor="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              />
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3">
              {isLoading ? <SettingsSkeleton /> : (
                <>
                  <SettingRow
                    label="Email Notifications"
                    description="Send email alerts for important events and updates"
                    checked={notifSettings.emailNotifications}
                    onChange={(v) => setNotif({ emailNotifications: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Meeting Reminders"
                    description="Send reminders before scheduled meetings start"
                    checked={notifSettings.meetingReminders}
                    onChange={(v) => setNotif({ meetingReminders: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Task Assignments"
                    description="Notify members when they are assigned a new task"
                    checked={notifSettings.taskAssignments}
                    onChange={(v) => setNotif({ taskAssignments: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Weekly Digest"
                    description="Send a weekly activity summary email to all members"
                    checked={notifSettings.weeklyDigest}
                    onChange={(v) => setNotif({ weeklyDigest: v })}
                    disabled={!canManage}
                  />

                  <SaveButton
                    isPending={updateSettings.isPending} isDirty={notifDirty}
                    onClick={() => handleSaveSettings(
                      { notificationSettings: notifSettings },
                      () => setNotifDirty(false),
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="security" className="space-y-5 focus-visible:outline-none">
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
              <SectionHeader
                icon={Shield} title="Security Policies"
                description="Access control and session management for your organisation"
                iconColor="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
              />
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3">
              {isLoading ? <SettingsSkeleton /> : (
                <>
                  <SettingRow
                    label="Auto Logout"
                    description="Automatically sign out inactive sessions after the timeout period"
                    checked={securitySettings.autoLogout}
                    onChange={(v) => setSecurity({ autoLogout: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="PIN Required"
                    description="Require a PIN code for sensitive administrative operations"
                    checked={securitySettings.pinRequired}
                    onChange={(v) => setSecurity({ pinRequired: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Data Encryption"
                    description="Encrypt sensitive data stored in the system at rest"
                    checked={securitySettings.dataEncryption}
                    onChange={(v) => setSecurity({ dataEncryption: v })}
                    disabled={!canManage}
                  />
                  <SettingRow
                    label="Audit Log"
                    description="Track all administrative actions in a tamper-proof audit trail"
                    checked={securitySettings.auditLogEnabled}
                    onChange={(v) => setSecurity({ auditLogEnabled: v })}
                    disabled={!canManage}
                  />

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Session Timeout</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Auto logout after inactivity (minutes)</p>
                    </div>
                    <Input
                      type="number" min={5} max={480}
                      value={securitySettings.sessionTimeout}
                      className="h-9 w-24 rounded-xl border-border/60 text-sm bg-background text-right"
                      onChange={(e) => setSecurity({ sessionTimeout: +e.target.value })}
                      disabled={!canManage}
                    />
                  </div>

                  <SaveButton
                    isPending={updateSettings.isPending} isDirty={securityDirty}
                    onClick={() => handleSaveSettings(
                      { securitySettings },
                      () => setSecurityDirty(false),
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* 2FA Card */}
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
              <SectionHeader
                icon={Smartphone} title="Two-Factor Authentication"
                description="Add an extra verification step at login using an authenticator app"
                iconColor="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
              />
            </CardHeader>
            <CardContent className="px-5 py-5">
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Authenticator App</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use Google Authenticator, Authy, or any TOTP app
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="rounded-xl gap-1.5 shrink-0"
                  onClick={() => setShow2FA(true)}
                >
                  <Smartphone className="h-3.5 w-3.5" />Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border border-destructive/30 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-destructive/20 bg-destructive/5">
              <SectionHeader
                icon={Database} title="Data Management"
                description="Export or permanently remove your organisation's data"
                iconColor="bg-destructive/10 text-destructive"
              />
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3">
              <Button variant="outline" className="w-full rounded-xl gap-2 h-11">
                <Database className="h-4 w-4" />Export All Data
              </Button>
              <Button
                variant="destructive"
                className="w-full rounded-xl gap-2 h-11"
                onClick={() => setShowDeleteOrg(true)}
              >
                <AlertTriangle className="h-4 w-4" />Delete Organisation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Integrations Tab ── */}
        <TabsContent value="integrations" className="space-y-5 focus-visible:outline-none">
          <Card className="border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-4 border-b border-border/30 bg-muted/20">
              <SectionHeader
                icon={Zap} title="External Integrations"
                description="Connect with third-party services to extend your workflow"
                iconColor="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              />
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-3">
              {isLoading ? <SettingsSkeleton /> : (
                <>
                  <IntegrationCard
                    icon={Globe} name="Google Calendar"
                    description="Sync board meetings with Google Calendar automatically"
                    connected={integrationSettings.googleCalendarEnabled}
                    onToggle={(v) => setInteg({ googleCalendarEnabled: v })}
                  />
                  <IntegrationCard
                    icon={Mail} name="Microsoft Outlook"
                    description="Sync meetings and tasks with your Outlook calendar"
                    connected={integrationSettings.outlookEnabled}
                    onToggle={(v) => setInteg({ outlookEnabled: v })}
                  />
                  <IntegrationCard
                    icon={Zap} name="Slack"
                    description="Post meeting reminders and task notifications to Slack channels"
                    connected={integrationSettings.slackEnabled}
                    onToggle={(v) => setInteg({ slackEnabled: v })}
                  />

                  <Separator className="my-2" />

                  {/* API Keys row */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Key className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">API Access</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Generate API keys for custom integrations
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 shrink-0">
                      <Key className="h-3.5 w-3.5" />Manage Keys
                    </Button>
                  </div>

                  <SaveButton
                    isPending={updateSettings.isPending} isDirty={integDirty}
                    onClick={() => handleSaveSettings(
                      { integrationSettings },
                      () => setIntegDirty(false),
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <TwoFactorDialog open={show2FA} onOpenChange={setShow2FA} />
      <DeleteOrgDialog
        open={showDeleteOrg}
        onOpenChange={setShowDeleteOrg}
        orgName={org?.organisationName ?? ''}
      />
    </div>
  );
}