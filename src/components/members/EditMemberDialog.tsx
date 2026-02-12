// src/components/members/EditMemberDialog.tsx (Similar to Add, prefilled)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

import type { User } from '@/pages/Members'; // Adjust path

const editSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'board_member', 'guest']),
  title: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePictureUrl: z.string().url().optional(),
  committees: z.array(z.string()).optional(),
});

type EditForm = z.infer<typeof editSchema>;

interface Props {
  member: User;
  onSubmit: (data: EditForm) => void;
  committees: string[];
  showSuperAdminRole: boolean;
}

export default function EditMemberDialog({ member, onSubmit, committees, showSuperAdminRole }: Props) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role,
      title: member.title,
      phoneNumber: member.phoneNumber,
      profilePictureUrl: member.profilePictureUrl,
      committees: member.committees || [],
    },
  });

  const selectedCommittees = watch('committees') || [];

  const addCommittee = (committee: string) => {
    if (!selectedCommittees.includes(committee)) {
      setValue('committees', [...selectedCommittees, committee]);
    }
  };

  const removeCommittee = (committee: string) => {
    setValue('committees', selectedCommittees.filter(c => c !== committee));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Member</DialogTitle>
        <DialogDescription>Update member details</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        {/* Similar fields as AddMemberDialog */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" {...register('firstName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...register('lastName')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <Select defaultValue={member.role} onValueChange={(v) => setValue('role', v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {showSuperAdminRole && <SelectItem value="super_admin">Super Admin</SelectItem>}
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="board_member">Board Member</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register('title')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input id="phoneNumber" {...register('phoneNumber')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
          <Input id="profilePictureUrl" {...register('profilePictureUrl')} />
        </div>

        <div className="space-y-2">
          <Label>Committees</Label>
          <Select onValueChange={addCommittee}>
            <SelectTrigger>
              <SelectValue placeholder="Add committee" />
            </SelectTrigger>
            <SelectContent>
              {committees.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedCommittees.map((c) => (
              <Badge key={c} variant="secondary" className="flex items-center gap-1">
                {c}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeCommittee(c)} />
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={() => reset()}>Cancel</Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </>
  );
}