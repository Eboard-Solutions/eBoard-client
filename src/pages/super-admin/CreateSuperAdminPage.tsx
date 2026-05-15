// src/pages/super-admin/CreateSuperAdminPage.tsx
import { useState } from 'react';
import { Shield, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCreateSuperAdmin } from '@/hooks/api/useUsers';
import { SuperAdminPageHeader } from './_SuperAdminPageHeader';

export function CreateSuperAdminPage() {
  const createSuperAdmin = useCreateSuperAdmin();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.firstName.trim()) {
      toast.error('First Name is required');
      return;
    }
    if (!form.lastName || !form.lastName.trim()) {
      toast.error('Last Name is required');
      return;
    }
    if (!form.email || !form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!form.password || !form.password.trim()) {
      toast.error('Password is required');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    createSuperAdmin.mutate(
      { ...form, role: 'SuperAdmin' as const },
      {
        onSuccess: () => {
          toast.success('Super Admin created successfully');
          setForm({ firstName: '', lastName: '', email: '', password: '' });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to create Super Admin';
          toast.error(msg);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        icon={UserPlus}
        eyebrow="Administration"
        title="Create Super Admin"
        subtitle="Provision a new super administrator with full platform access."
        gradient="from-violet-600 via-purple-600 to-fuchsia-700"
      />

      <div className="max-w-lg">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">New Super Admin</CardTitle>
                <CardDescription>This account will have full platform access</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Bernard" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Shihkule" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="admin@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a strong password"
                  value={form.password}
                  minLength={8}
                  autoComplete="new-password"
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createSuperAdmin.isPending}>
                <UserPlus className="h-4 w-4 mr-2" />
                {createSuperAdmin.isPending ? 'Creating...' : 'Create Super Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
