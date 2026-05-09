'use client';
import { useCallback, useEffect, useState } from 'react';
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
import { Save, Mail, Phone, Briefcase, LinkIcon, AlertCircle } from 'lucide-react';
import { getGradient, getInitials, getRoleOptions } from './shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditMemberFormData {
  firstName:          string;
  lastName:           string;
  email:              string;
  role:               string;
  title?:             string;
  phoneNumber?:       string;
  profilePictureUrl?: string;
}

export interface EditableMember {
  id:        string;
  name:      string;
  firstName: string;
  lastName:  string;
  email:     string;
  avatar?:   string;
  role:      string;
  position?: string;
  phone?:    string;
}

interface Props {
  member:               EditableMember;
  onSubmit:             (userId: string, data: EditMemberFormData) => void;
  onCancel:             () => void;
  isLoading?:           boolean;
  allowSuperAdminRole?: boolean;
}

type FieldErrors = Partial<Record<keyof EditMemberFormData, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX   = /^https?:\/\/.+/i;

function buildInitial(member: EditableMember): EditMemberFormData {
  return {
    firstName:          member.firstName,
    lastName:           member.lastName,
    email:              member.email,
    role:               member.role,
    title:              member.position ?? '',
    phoneNumber:        member.phone    ?? '',
    profilePictureUrl:  member.avatar   ?? '',
  };
}

function validateForm(form: EditMemberFormData): FieldErrors {
  const e: FieldErrors = {};
  if (!form.firstName.trim()) e.firstName = 'First name is required';
  if (!form.lastName.trim())  e.lastName  = 'Last name is required';
  if (!form.email.trim())     e.email     = 'Email is required';
  else if (!EMAIL_REGEX.test(form.email.trim())) e.email = 'Enter a valid email';
  if (form.profilePictureUrl?.trim() && !URL_REGEX.test(form.profilePictureUrl.trim())) {
    e.profilePictureUrl = 'Must be a valid URL starting with http(s)://';
  }
  return e;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditMemberDialog({
  member,
  onSubmit,
  onCancel,
  isLoading = false,
  allowSuperAdminRole = false,
}: Props) {
  const [form, setForm]     = useState<EditMemberFormData>(() => buildInitial(member));
  const [errors, setErrors] = useState<FieldErrors>({});

  // Re-populate when the member prop changes (dialog reused across rows).
  // Watching `member.id` is enough — switching members always changes the id.
  useEffect(() => {
    const nextForm = buildInitial(member);
    queueMicrotask(() => {
      setForm(nextForm);
      setErrors({});
    });
  }, [member.id, member.firstName, member.lastName, member.email, member.role, member.position, member.phone, member.avatar]);

  const setField = useCallback(<K extends keyof EditMemberFormData>(key: K, value: EditMemberFormData[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => (p[key] ? { ...p, [key]: undefined } : p));
  }, []);

  const handleEmailBlur = useCallback(() => {
    const v = form.email.trim();
    if (v && !EMAIL_REGEX.test(v)) setErrors(p => ({ ...p, email: 'Enter a valid email' }));
  }, [form.email]);

  const handleUrlBlur = useCallback(() => {
    const v = form.profilePictureUrl?.trim();
    if (v && !URL_REGEX.test(v)) {
      setErrors(p => ({ ...p, profilePictureUrl: 'Must be a valid URL starting with http(s)://' }));
    }
  }, [form.profilePictureUrl]);

  const handleSubmit = useCallback(() => {
    const next = validateForm(form);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit(member.id, {
      firstName:         form.firstName.trim(),
      lastName:          form.lastName.trim(),
      email:             form.email.trim().toLowerCase(),
      role:              form.role,
      title:             form.title?.trim()             || undefined,
      phoneNumber:       form.phoneNumber?.trim()       || undefined,
      profilePictureUrl: form.profilePictureUrl?.trim() || undefined,
    });
  }, [form, member.id, onSubmit]);

  // Submit on Enter from any input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit' && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isLoading]);

  const roleOptions = getRoleOptions(allowSuperAdminRole);
  const previewAvatar = form.profilePictureUrl?.trim() && URL_REGEX.test(form.profilePictureUrl.trim())
    ? form.profilePictureUrl.trim()
    : member.avatar;
  const gradient = getGradient(member.id);
  const initials = getInitials({ ...member, firstName: form.firstName, lastName: form.lastName });

  return (
    <div onKeyDown={handleKeyDown}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-lg tracking-tight">
          <Avatar className="h-10 w-10 ring-2 ring-border/50 shadow-sm shrink-0">
            <AvatarImage src={previewAvatar} alt={member.name} />
            <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-sm font-bold tracking-wide`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span>Edit Member</span>
        </DialogTitle>
        <DialogDescription>
          Updating profile for <strong className="text-foreground/80">{member.name}</strong>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" required error={errors.firstName}>
            <Input
              value={form.firstName}
              onChange={e => setField('firstName', e.target.value)}
              autoComplete="given-name"
              className={`h-9 text-sm ${errors.firstName ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
          </Field>
          <Field label="Last Name" required error={errors.lastName}>
            <Input
              value={form.lastName}
              onChange={e => setField('lastName', e.target.value)}
              autoComplete="family-name"
              className={`h-9 text-sm ${errors.lastName ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
          </Field>
        </div>

        {/* Email */}
        <Field label="Email Address" required error={errors.email}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              onBlur={handleEmailBlur}
              autoComplete="email"
              inputMode="email"
              className={`h-9 text-sm pl-9 ${errors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
          </div>
        </Field>

        {/* Role + Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Role">
            <Select value={form.role} onValueChange={v => setField('role', v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title">
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={form.title ?? ''}
                onChange={e => setField('title', e.target.value)}
                placeholder="e.g. Director"
                className="h-9 text-sm pl-9"
              />
            </div>
          </Field>
        </div>

        {/* Phone */}
        <Field label="Phone Number">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={form.phoneNumber ?? ''}
              onChange={e => setField('phoneNumber', e.target.value)}
              placeholder="+254 700 000 000"
              autoComplete="tel"
              inputMode="tel"
              className="h-9 text-sm pl-9"
            />
          </div>
        </Field>

        {/* Profile picture URL */}
        <Field label="Profile Picture URL" error={errors.profilePictureUrl}>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={form.profilePictureUrl ?? ''}
              onChange={e => setField('profilePictureUrl', e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://example.com/avatar.jpg"
              className={`h-9 text-sm pl-9 ${errors.profilePictureUrl ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
          </div>
        </Field>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="gap-2 min-w-[140px]">
          {isLoading
            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Field shell ──────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label:    string;
  required?: boolean;
  error?:   string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive normal-case font-normal ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}
