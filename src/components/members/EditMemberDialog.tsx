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

// User interface for member editing
interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  profilePictureUrl?: string;
  role: string;
  title?: string;
  position?: string;
  phoneNumber?: string;
  phone?: string;
  committees?: string[];
}

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['SuperAdmin', 'OrgAdmin', 'Admin', 'BoardMember', 'User']),
  title: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePictureUrl: z.string().url().optional(),
  committees: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  member: User;
  onSubmit: (data: FormData) => void;
  committees: string[];
  allowSuperAdminRole: boolean;
}

export default function EditMemberDialog({ member, onSubmit, committees, allowSuperAdminRole }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      role: member.role as any,
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
        <DialogTitle>Edit Member: {member.name}</DialogTitle>
        <DialogDescription>Update user details</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        {/* Same structure as AddMemberDialog, but pre-filled */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Role</Label>
          <Select onValueChange={(v) => setValue('role', v as any)} defaultValue={member.role}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowSuperAdminRole && <SelectItem value="SuperAdmin">Super Admin</SelectItem>}
              <SelectItem value="OrgAdmin">OrgAdmin</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="BoardMember">Board Member</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input id="phoneNumber" {...register('phoneNumber')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
          <Input id="profilePictureUrl" {...register('profilePictureUrl')} />
        </div>

        {committees.length > 0 && (
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
        )}

        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={() => reset()}>
            Cancel
          </Button>
          <Button type="submit">Update Member</Button>
        </div>
      </form>
    </>
  );
}