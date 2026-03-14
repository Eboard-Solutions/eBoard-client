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
import { UserPlus, Mail, Phone, Briefcase, Building2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
// Matches backend CreateUserDto exactly:
// firstName, lastName, email, role (eROLE enum), title?, phoneNumber?, profilePictureUrl?
// NOTE: No password field — the backend handles credential creation separately.

export interface AddMemberFormData {
  firstName:         string;
  lastName:          string;
  email:             string;
  role:              string;
  title?:            string;
  phoneNumber?:      string;
  profilePictureUrl?: string;
}

interface Props {
  onSubmit:           (data: AddMemberFormData) => void;
  onCancel:           () => void;
  isLoading?:         boolean;
  allowSuperAdminRole?: boolean;
  orgName?:           string;
}

type FieldErrors = Partial<Record<keyof AddMemberFormData, string>>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddMemberDialog({
  onSubmit,
  onCancel,
  isLoading = false,
  allowSuperAdminRole = false,
  orgName,
}: Props) {
  const [form, setForm] = useState({
    firstName:   '',
    lastName:    '',
    email:       '',
    role:        'BoardMember',
    title:       '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }));
      setErrors(p => ({ ...p, [key]: undefined }));
    };
  }

  function validate(): boolean {
    const e: FieldErrors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.email.trim())     e.email     = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                e.email     = 'Enter a valid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit({
      firstName:   form.firstName.trim(),
      lastName:    form.lastName.trim(),
      email:       form.email.trim().toLowerCase(),
      role:        form.role,
      title:       form.title.trim() || undefined,
      phoneNumber: form.phoneNumber.trim() || undefined,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5 text-lg">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          Add New Member
        </DialogTitle>
        <DialogDescription>
          Create an account for a new member. They will receive a system-generated
          password and can be invited to log in separately.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">

        {/* Org badge */}
        {orgName && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Adding to:</span>
            <span className="text-xs font-semibold text-foreground truncate">{orgName}</span>
          </div>
        )}

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              First Name <span className="text-destructive normal-case font-normal">*</span>
            </Label>
            <Input
              value={form.firstName}
              onChange={set('firstName')}
              placeholder="Jane"
              autoComplete="given-name"
              className={`h-9 text-sm ${errors.firstName ? 'border-destructive' : ''}`}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Name <span className="text-destructive normal-case font-normal">*</span>
            </Label>
            <Input
              value={form.lastName}
              onChange={set('lastName')}
              placeholder="Smith"
              autoComplete="family-name"
              className={`h-9 text-sm ${errors.lastName ? 'border-destructive' : ''}`}
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email Address <span className="text-destructive normal-case font-normal">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="jane.smith@company.com"
              autoComplete="email"
              className={`h-9 text-sm pl-9 ${errors.email ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        {/* Role + Title */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Role <span className="text-destructive normal-case font-normal">*</span>
            </Label>
            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Director"
                className="h-9 text-sm pl-9"
              />
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={form.phoneNumber}
              onChange={set('phoneNumber')}
              placeholder="+254 700 000 000"
              className="h-9 text-sm pl-9"
            />
          </div>
        </div>

        {/* Info note */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3.5 py-3">
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <strong>Next step:</strong> After adding, use <strong>Invite</strong> to send
            the member their login link with the organisation code.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
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