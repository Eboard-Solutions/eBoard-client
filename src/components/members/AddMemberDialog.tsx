// src/components/members/AddMemberDialog.tsx
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
import { X, UserPlus, Mail, Phone, Link, Shield, Briefcase } from 'lucide-react';

const addMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['SuperAdmin', 'OrgAdmin', 'Admin', 'BoardMember', 'User'], {
    required_error: 'Please select a role',
  }),
  title: z.string().optional(),
  phoneNumber: z.string().optional(),
  profilePictureUrl: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
  committees: z.array(z.string()).optional().default([]),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

interface Props {
  onSubmit: (data: AddMemberForm) => void;
  committees: string[];
  allowSuperAdminRole: boolean;
}

export default function AddMemberDialog({ onSubmit, committees, allowSuperAdminRole }: Props) {
  const form = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'BoardMember',
      title: '',
      phoneNumber: '',
      profilePictureUrl: '',
      committees: [],
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger,
  } = form;

  const selectedCommittees = watch('committees') || [];

  const handleAddCommittee = (committee: string) => {
    if (!selectedCommittees.includes(committee)) {
      setValue('committees', [...selectedCommittees, committee], { shouldValidate: true });
      trigger('committees');
    }
  };

  const handleRemoveCommittee = (committee: string) => {
    setValue(
      'committees',
      selectedCommittees.filter((c) => c !== committee),
      { shouldValidate: true }
    );
    trigger('committees');
  };

  const onFormSubmit = (data: AddMemberForm) => {
    onSubmit(data);
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <DialogHeader className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold">Add New Member</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              Fill in the details below to add a new member to your organization.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
        {/* Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              placeholder="e.g. Jane"
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
              placeholder="e.g. Smith"
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
            Email Address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="email"
              type="email"
              placeholder="jane.smith@company.com"
              {...register('email')}
              className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Role <span className="text-destructive">*</span>
          </Label>
          <Select
            defaultValue="BoardMember"
            onValueChange={(value) => {
              setValue('role', value as any, { shouldValidate: true });
              trigger('role');
            }}
          >
            <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground/60" />
                <SelectValue placeholder="Select role" />
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
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message}</p>
          )}
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium">
              Job Title <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                id="title"
                placeholder="e.g. Software Engineer"
                className="pl-9"
                {...register('title')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-sm font-medium">
              Phone <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                id="phoneNumber"
                placeholder="+1 (555) 123-4567"
                className="pl-9"
                {...register('phoneNumber')}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profilePictureUrl" className="text-sm font-medium">
            Profile Picture URL <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="profilePictureUrl"
              placeholder="https://example.com/avatar.jpg"
              className={`pl-9 ${errors.profilePictureUrl ? 'border-destructive' : ''}`}
              {...register('profilePictureUrl')}
            />
          </div>
          {errors.profilePictureUrl && (
            <p className="text-xs text-destructive">{errors.profilePictureUrl.message}</p>
          )}
        </div>

        {/* Committees */}
        {committees.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Committees <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Select onValueChange={handleAddCommittee}>
              <SelectTrigger>
                <SelectValue placeholder="Add to committee…" />
              </SelectTrigger>
              <SelectContent>
                {committees.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCommittees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedCommittees.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => handleRemoveCommittee(c)}
                      className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors ml-0.5"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/60 mt-2">
          <Button type="button" variant="outline" className="min-w-24">
            Cancel
          </Button>
          <Button
            type="submit"
            className="min-w-32 gap-2"
            disabled={isSubmitting || hasErrors}
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? 'Adding…' : 'Add Member'}
          </Button>
        </div>
      </form>
    </>
  );
}