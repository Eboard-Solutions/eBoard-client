'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, Mail, Phone, Briefcase, LinkIcon, Edit3 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditMemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  title?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

export interface EditableMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  position?: string;
  phone?: string;
}

interface Props {
  member: EditableMember;
  onSubmit: (userId: string, data: EditMemberFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  allowSuperAdminRole?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

function getGradient(id: string) {
  if (!id) return AVATAR_GRADIENTS[0];
  return AVATAR_GRADIENTS[id.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function getInitials(member: EditableMember) {
  if (member.firstName && member.lastName) {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  }
  return member.name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditMemberDialog({
  member,
  onSubmit,
  onCancel,
  isLoading = false,
  allowSuperAdminRole = false,
}: Props) {
  const [form, setForm] = useState<EditMemberFormData>({
    firstName: member.firstName,
    lastName:  member.lastName,
    email:     member.email,
    role:      member.role,
    title:     member.position ?? '',
    phoneNumber: member.phone ?? '',
    profilePictureUrl: member.avatar ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EditMemberFormData, string>>>({});

  // Re-populate when member changes (dialog reuse)
  useEffect(() => {
    setForm({
      firstName: member.firstName,
      lastName:  member.lastName,
      email:     member.email,
      role:      member.role,
      title:     member.position ?? '',
      phoneNumber: member.phone ?? '',
      profilePictureUrl: member.avatar ?? '',
    });
    setErrors({});
  }, [member.id]);

  function set(key: keyof EditMemberFormData, value: string) {
    setForm(p => ({ ...p, [key]: value }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.email.trim())     e.email     = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.profilePictureUrl?.trim() && !/^https?:\/\/.+/.test(form.profilePictureUrl)) {
      e.profilePictureUrl = 'Must be a valid URL starting with http(s)://';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(member.id, {
      ...form,
      title: form.title?.trim() || undefined,
      phoneNumber: form.phoneNumber?.trim() || undefined,
      profilePictureUrl: form.profilePictureUrl?.trim() || undefined,
    });
  }

  const gradient = getGradient(member.id);
  const initials = getInitials(member);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-lg">
          <Avatar className="h-9 w-9 ring-2 ring-border/50 shadow-sm">
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-sm font-bold`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          Edit Member
        </DialogTitle>
        <DialogDescription>
          Updating profile for <strong>{member.name}</strong>
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
              className={`h-9 text-sm ${errors.firstName ? 'border-destructive' : ''}`}
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
              className={`h-9 text-sm ${errors.lastName ? 'border-destructive' : ''}`}
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
              className={`h-9 text-sm pl-9 ${errors.email ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
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
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
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
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Picture URL</Label>
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
            : <Save className="h-4 w-4" />
          }
          Save Changes
        </Button>
      </DialogFooter>
    </>
  );
}