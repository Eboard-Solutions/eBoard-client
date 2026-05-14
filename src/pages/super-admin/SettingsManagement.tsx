// src/pages/super-admin/SettingsManagement.tsx
import { useState } from 'react';
import { Settings, Save, Building2, Users, Bell, Shield, Plug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAllSettings, useUpdateSettings } from '@/hooks/api/useSettings';
import type { PlatformSettings, UpdateSettingsData } from '@/types/api.types';

export function SettingsManagement() {
  const { data, isLoading, isError } = useAllSettings();
  const updateSettings = useUpdateSettings();

  // Normalize: API may return array or single object
  const settings: PlatformSettings | undefined = Array.isArray(data) ? data[0] : data;

  const [form, setForm] = useState<UpdateSettingsData>({});

  // Helper to merge form changes
  function patch<K extends keyof UpdateSettingsData>(key: K, value: UpdateSettingsData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    updateSettings.mutate(form, {
      onSuccess: () => toast.success('Settings updated successfully'),
      onError: () => toast.error('Failed to update settings'),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure platform-wide settings</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || (!settings && !isLoading)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure platform-wide settings</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Unable to load settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgS = form.organizationSettings ?? settings?.organizationSettings ?? {} as any;
  const memS = form.memberSettings ?? settings?.memberSettings ?? {} as any;
  const notS = form.notificationSettings ?? settings?.notificationSettings ?? {} as any;
  const secS = form.securitySettings ?? settings?.securitySettings ?? {} as any;
  const intS = form.integrationSettings ?? settings?.integrationSettings ?? {} as any;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Configure platform-wide settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2 self-start sm:self-auto">
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* App Name */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-indigo-500" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={form.appName ?? settings?.appName ?? ''}
              onChange={e => patch('appName', e.target.value)}
              placeholder="eBoard"
            />
          </div>
        </CardContent>
      </Card>

      {/* Organisation Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-500" />
            Organisation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Organisation Name</Label>
              <Input
                value={orgS.name ?? ''}
                onChange={e => patch('organizationSettings', { ...orgS, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact Email</Label>
              <Input
                value={orgS.contactEmail ?? ''}
                onChange={e => patch('organizationSettings', { ...orgS, contactEmail: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tax ID</Label>
              <Input
                value={orgS.taxId ?? ''}
                onChange={e => patch('organizationSettings', { ...orgS, taxId: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                value={orgS.address ?? ''}
                onChange={e => patch('organizationSettings', { ...orgS, address: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            Member Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Max Members</Label>
            <Input
              type="number"
              value={memS.maxMembers ?? 50}
              onChange={e => patch('memberSettings', { ...memS, maxMembers: parseInt(e.target.value, 10) || 50 })}
            />
          </div>
          <Separator />
          <div className="space-y-3">
            {([
              { key: 'allowProfilePhotos', label: 'Allow Profile Photos' },
              { key: 'requireVerification', label: 'Require Email Verification' },
              { key: 'allowSelfRegistration', label: 'Allow Self-Registration' },
            ] as const).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between">
                <Label htmlFor={toggle.key}>{toggle.label}</Label>
                <Switch
                  id={toggle.key}
                  checked={memS[toggle.key] ?? false}
                  onCheckedChange={val => patch('memberSettings', { ...memS, [toggle.key]: val })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {([
              { key: 'emailNotifications', label: 'Email Notifications' },
              { key: 'meetingReminders', label: 'Meeting Reminders' },
              { key: 'taskAssignments', label: 'Task Assignments' },
              { key: 'weeklyDigest', label: 'Weekly Digest' },
            ] as const).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between">
                <Label htmlFor={toggle.key}>{toggle.label}</Label>
                <Switch
                  id={toggle.key}
                  checked={notS[toggle.key] ?? false}
                  onCheckedChange={val => patch('notificationSettings', { ...notS, [toggle.key]: val })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Session Timeout (minutes)</Label>
            <Input
              type="number"
              value={secS.sessionTimeout ?? 30}
              onChange={e => patch('securitySettings', { ...secS, sessionTimeout: parseInt(e.target.value, 10) || 30 })}
            />
          </div>
          <Separator />
          <div className="space-y-3">
            {([
              { key: 'autoLogout', label: 'Auto Logout on Inactivity' },
              { key: 'pinRequired', label: 'Require PIN' },
              { key: 'dataEncryption', label: 'Data Encryption' },
              { key: 'auditLogEnabled', label: 'Audit Log Enabled' },
            ] as const).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between">
                <Label htmlFor={toggle.key}>{toggle.label}</Label>
                <Switch
                  id={toggle.key}
                  checked={secS[toggle.key] ?? false}
                  onCheckedChange={val => patch('securitySettings', { ...secS, [toggle.key]: val })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plug className="h-4 w-4 text-blue-500" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {([
              { key: 'slackEnabled', label: 'Slack Integration' },
              { key: 'outlookEnabled', label: 'Outlook Integration' },
              { key: 'googleCalendarEnabled', label: 'Google Calendar Integration' },
            ] as const).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between">
                <Label htmlFor={toggle.key}>{toggle.label}</Label>
                <Switch
                  id={toggle.key}
                  checked={intS[toggle.key] ?? false}
                  onCheckedChange={val => patch('integrationSettings', { ...intS, [toggle.key]: val })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
