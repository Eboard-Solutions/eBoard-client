// src/pages/super-admin/CreateSuperAdminPage.tsx
import { useState } from 'react';
import { Shield, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCreateSuperAdmin } from '@/hooks/api/useUsers';

export function CreateSuperAdminPage() {
  const createSuperAdmin = useCreateSuperAdmin();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('Please fill in all fields');
      return;
    }
    createSuperAdmin.mutate(
      { ...form, role: 'SuperAdmin' as const },
      {
        onSuccess: () => {
          toast.success('Super Admin created successfully');
          setForm({ firstName: '', lastName: '', email: '' });
        },
        onError: () => toast.error('Failed to create Super Admin'),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Super Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a new super administrator to the platform</p>
      </div>

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
                  <Input id="firstName" placeholder="John" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="admin@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
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
