'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Mail, Phone, Link, Shield, Briefcase, Save } from 'lucide-react';

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
  profilePictureUrl: z.string().url().optional().or(z.literal('')),
  committees: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  member: User;
  onSubmit: (data: FormData) => void;
  committees: string[];
  allowSuperAdminRole: boolean;
}

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function getInitials(user: User) {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
  if (user.name) return user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  return user.email[0].toUpperCase();
}

export default function EditMemberDialog({ member, onSubmit, committees, allowSuperAdminRole }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email,
      role: member.role as any,
      title: member.title ?? '',
      phoneNumber: member.phoneNumber ?? member.phone ?? '',
      profilePictureUrl: member.profilePictureUrl ?? member.avatar ?? '',
      committees: member.committees ?? [],
    },
  });

  const selectedCommittees = watch('committees') ?? [];
  const gradient = avatarGradients[member.id?.charCodeAt(0) % avatarGradients.length] ?? avatarGradients[0];

  const addCommittee = (committee: string) => {
    if (!selectedCommittees.includes(committee)) {
      setValue('committees', [...selectedCommittees, committee], { shouldDirty: true });
    }
  };

  const removeCommittee = (committee: string) => {
    setValue('committees', selectedCommittees.filter(c => c !== committee), { shouldDirty: true });
  };

  return (
    <>
      <DialogHeader className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <Avatar className="h-11 w-11 ring-2 ring-border/50 shadow">
            <AvatarImage src={member.profilePictureUrl ?? member.avatar} alt={member.name} />
            <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-semibold`}>
              {getInitials(member)}
            </AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-xl font-semibold">Edit Member</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              {member.name ?? member.email}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Names */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              {...register('firstName')}
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              {...register('lastName')}
              className={errors.lastName ? 'border-destructive' : ''}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Role</Label>
          <Select
            onValueChange={(v) => setValue('role', v as any, { shouldDirty: true })}
            defaultValue={member.role}
          >
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground/60" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {allowSuperAdminRole && <SelectItem value="SuperAdmin">Super Admin</SelectItem>}
              <SelectItem value="OrgAdmin">Org Admin</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="BoardMember">Board Member</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input id="title" className="pl-9" {...register('title')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input id="phoneNumber" className="pl-9" {...register('phoneNumber')} />
            </div>
          </div>
        </div>

        {/* Profile URL */}
        <div className="space-y-1.5">
          <Label htmlFor="profilePictureUrl" className="text-sm font-medium">Profile Picture URL</Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input id="profilePictureUrl" className="pl-9" {...register('profilePictureUrl')} />
          </div>
        </div>

        {/* Committees */}
        {committees.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Committees</Label>
            <Select onValueChange={addCommittee}>
              <SelectTrigger>
                <SelectValue placeholder="Add to committee…" />
              </SelectTrigger>
              <SelectContent>
                {committees.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCommittees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedCommittees.map((c) => (
                  <Badge key={c} variant="secondary" className="flex items-center gap-1 text-xs px-2.5 py-1">
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCommittee(c)}
                      className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border/60 mt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => reset()}
          >
            Reset
          </Button>
          <Button
            type="submit"
            className="flex-1 gap-2"
            disabled={!isDirty}
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </>
  );
}