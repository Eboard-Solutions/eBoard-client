// components/members/InviteDialog.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['board_member', 'admin', 'guest', 'super_admin']),
  position: z.string().optional(),
  organizationId: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface Props {
  organizations: { id: string; name: string }[];
  canChangeOrg: boolean;
  canAssignSuperAdmin: boolean;
}

export default function InviteDialog({ organizations, canChangeOrg, canAssignSuperAdmin }: Props) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'board_member' },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: InviteForm) => {
    try {
      // await api.inviteMember(data);
      toast.success('Invitation sent');
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite New Member</DialogTitle>
        <DialogDescription>Send an invitation to join {canChangeOrg ? 'an organization' : 'your organization'}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={selectedRole}
            onValueChange={(v) => setValue('role', v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="board_member">Board Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
              {canAssignSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {canChangeOrg && organizations.length > 0 && (
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select onValueChange={(v) => setValue('organizationId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="position">Position (optional)</Label>
          <Input id="position" {...register('position')} />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit">Send Invitation</Button>
        </div>
      </form>
    </>
  );
}