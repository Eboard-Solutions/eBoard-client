'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Mail, Phone, Briefcase, LinkIcon, Eye, EyeOff } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddMemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  title?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

interface Props {
  onSubmit: (data: AddMemberFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  allowSuperAdminRole?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddMemberDialog({
  onSubmit,
  onCancel,
  isLoading = false,
  allowSuperAdminRole = false,
}: Props) {
  const [form, setForm] = useState<AddMemberFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'BoardMember',
    title: '',
    phoneNumber: '',
    profilePictureUrl: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddMemberFormData, string>>>({});

  function set(key: keyof AddMemberFormData, value: string) {
    setForm(p => ({ ...p, [key]: value }));
    // Clear error on change
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.email.trim())     e.email     = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)         e.password  = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.profilePictureUrl && !/^https?:\/\/.+/.test(form.profilePictureUrl)) {
      e.profilePictureUrl = 'Must be a valid URL starting with http(s)://';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    // Strip empty optional fields before submitting
    const payload: AddMemberFormData = {
      ...form,
      title: form.title?.trim() || undefined,
      phoneNumber: form.phoneNumber?.trim() || undefined,
      profilePictureUrl: form.profilePictureUrl?.trim() || undefined,
    };
    onSubmit(payload);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5 text-lg">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          Add New Member
        </DialogTitle>
        <DialogDescription>
          Create an account for a new member. They will be prompted to change their password on first login.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              First Name <span className="text-destructive normal-case">*</span>
            </Label>
            <Input
              value={form.firstName}
              onChange={e => set('firstName', e.target.value)}
              placeholder="Jane"
              className={`h-9 text-sm ${errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Name <span className="text-destructive normal-case">*</span>
            </Label>
            <Input
              value={form.lastName}
              onChange={e => set('lastName', e.target.value)}
              placeholder="Smith"
              className={`h-9 text-sm ${errors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email Address <span className="text-destructive normal-case">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane.smith@company.com"
              className={`h-9 text-sm pl-9 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Temporary Password <span className="text-destructive normal-case">*</span>
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Min. 8 characters"
              className={`h-9 text-sm pr-9 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {errors.password
            ? <p className="text-xs text-destructive">{errors.password}</p>
            : <p className="text-xs text-muted-foreground">Member will be asked to change this on first login.</p>
          }
        </div>

        {/* Role + Title */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
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
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title <span className="font-normal normal-case text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Director"
                className="h-9 text-sm pl-9"
              />
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Phone Number <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value)}
              placeholder="+254 700 000 000"
              className="h-9 text-sm pl-9"
            />
          </div>
        </div>

        {/* Profile picture URL */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Profile Picture URL <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={form.profilePictureUrl}
              onChange={e => set('profilePictureUrl', e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className={`h-9 text-sm pl-9 ${errors.profilePictureUrl ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.profilePictureUrl && <p className="text-xs text-destructive">{errors.profilePictureUrl}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
          {isLoading
            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : <UserPlus className="h-4 w-4" />
          }
          Add Member
        </Button>
      </DialogFooter>
    </>
  );
}