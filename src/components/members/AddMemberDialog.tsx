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
import { X } from 'lucide-react';

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
      role: 'board_member',
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
      trigger('committees'); // force validation
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
    console.log('Form submitted with data:', data); // ← Debug: check this in console!
    onSubmit(data);
  };

  return (
    <>
      <DialogHeader className="mb-6">
        <DialogTitle className="text-2xl font-semibold">Add New Member</DialogTitle>
        <DialogDescription>
          Fill in the details below to add a new member to your organization.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-red-500 text-sm">*</span>
            </Label>
            <Input
              id="firstName"
              placeholder="e.g. Bleah"
              {...register('firstName')}
              className={`border ${errors.firstName ? 'border-red-500' : 'border-input'}`}
            />
            {errors.firstName && (
              <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-red-500 text-sm">*</span>
            </Label>
            <Input
              id="lastName"
              placeholder="e.g. Malika"
              {...register('lastName')}
              className={`border ${errors.lastName ? 'border-red-500' : 'border-input'}`}
            />
            {errors.lastName && (
              <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-red-500 text-sm">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="bleamalika@gmail.com"
            {...register('email')}
            className={`border ${errors.email ? 'border-red-500' : 'border-input'}`}
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label>
            Role <span className="text-red-500 text-sm">*</span>
          </Label>
          <Select
            defaultValue="BoardMember"
            onValueChange={(value) => {
              setValue('role', value as any, { shouldValidate: true });
              trigger('role');
            }}
          >
            <SelectTrigger className={`border ${errors.role ? 'border-red-500' : 'border-input'}`}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {allowSuperAdminRole && <SelectItem value="SuperAdmin">Super Admin</SelectItem>}
              <SelectItem value="OrgAdmin">OrgAdmin</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="BoardMember">Board Member</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
          )}
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" placeholder="e.g. Software Engineer" {...register('title')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="e.g. +254-712-345-678"
              {...register('phoneNumber')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profilePictureUrl">Profile Picture URL (optional)</Label>
          <Input
            id="profilePictureUrl"
            placeholder="https://example.com/avatar.jpg"
            {...register('profilePictureUrl')}
          />
          {errors.profilePictureUrl && (
            <p className="text-sm text-red-600 mt-1">{errors.profilePictureUrl.message}</p>
          )}
        </div>

        {/* Committees */}
        {committees.length > 0 && (
          <div className="space-y-3">
            <Label>Committees (optional)</Label>
            <Select onValueChange={handleAddCommittee}>
              <SelectTrigger>
                <SelectValue placeholder="Add committee" />
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
              <div className="flex flex-wrap gap-2">
                {selectedCommittees.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-3 py-1"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => handleRemoveCommittee(c)}
                      className="rounded-full hover:bg-red-100 p-0.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-red-600" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-6 border-t mt-6">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || Object.keys(errors).length > 0}>
            {isSubmitting ? 'Adding member...' : 'Add Member'}
          </Button>
        </div>
      </form>
    </>
  );
}