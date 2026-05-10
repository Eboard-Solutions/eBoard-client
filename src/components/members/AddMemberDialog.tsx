'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Mail, Phone, Briefcase, Building2, AlertCircle } from 'lucide-react';
import { ROLES } from './types';
import { getRoleOptions } from './shared';

export interface AddMemberFormData {
  firstName:          string;
  lastName:           string;
  email:              string;
  role:               string;
  title?:             string;
  phoneNumber?:       string;
  profilePictureUrl?: string;
}

interface Props {
  onSubmit:            (data: AddMemberFormData) => void;
  onCancel:            () => void;
  isLoading?:          boolean;
  allowSuperAdminRole?: boolean;
  orgName?:            string;
}

type FieldErrors = Partial<Record<keyof AddMemberFormData, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form: { firstName: string; lastName: string; email: string }): FieldErrors {
  const e: FieldErrors = {};
  if (!form.firstName.trim()) e.firstName = 'First name is required';
  if (!form.lastName.trim())  e.lastName  = 'Last name is required';
  if (!form.email.trim())     e.email     = 'Email is required';
  else if (!EMAIL_REGEX.test(form.email.trim())) e.email = 'Enter a valid email address';
  return e;
}

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
    role:        ROLES.BOARD_MEMBER as string,
    title:       '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const roleOptions = getRoleOptions(allowSuperAdminRole);

  const setField = useCallback((key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm(p => ({ ...p, [key]: value }));
      // Clear the field's error eagerly while typing
      setErrors(p => (p[key] ? { ...p, [key]: undefined } : p));
    }, []);

  const validateEmailOnBlur = useCallback(() => {
    const v = form.email.trim();
    if (!v) return;                                      // don't nag empty fields
    if (!EMAIL_REGEX.test(v)) {
      setErrors(p => ({ ...p, email: 'Enter a valid email address' }));
    }
  }, [form.email]);

  const handleSubmit = useCallback(() => {
    const next = validateForm(form);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      firstName:   form.firstName.trim(),
      lastName:    form.lastName.trim(),
      email:       form.email.trim().toLowerCase(),
      role:        form.role,
      title:       form.title.trim()       || undefined,
      phoneNumber: form.phoneNumber.trim() || undefined,
    });
  }, [form, onSubmit]);

  // Submit on Enter from any text input (but not from textareas etc.)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit' && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isLoading]);

  return (
    <div onKeyDown={handleKeyDown}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5 text-lg tracking-tight">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/25 ring-1 ring-white/10 shrink-0">
            <UserPlus className="h-4 w-4 text-white" strokeWidth={2.25} />
          </div>
          Add New Member
        </DialogTitle>
        <DialogDescription className="leading-relaxed">
          Create an account for a new member. They'll receive a system-generated
          password — use <strong>Invite</strong> to send them their login link.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Org chip */}
        {orgName && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Adding to</span>
            <span className="text-xs font-semibold text-foreground truncate">{orgName}</span>
          </div>
        )}

        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First Name" required error={errors.firstName}>
            <Input
              value={form.firstName}
              onChange={setField('firstName')}
              placeholder="Enter first name"
              autoComplete="given-name"
              autoFocus
              className={`h-9 text-sm ${errors.firstName ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
          </Field>
          <Field label="Last Name" required error={errors.lastName}>
            <Input
              value={form.lastName}
              onChange={setField('lastName')}
              placeholder="Enter last name"
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
              onChange={setField('email')}
              onBlur={validateEmailOnBlur}
              placeholder="Enter email address"
              autoComplete="email"
              inputMode="email"
              className={`h-9 text-sm pl-9 ${errors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
          </div>
        </Field>

        {/* Role + Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Role" required>
            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
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
                value={form.title}
                onChange={setField('title')}
                placeholder="Specify a title (e.g. 'Project Manager')"
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
              value={form.phoneNumber}
              onChange={setField('phoneNumber')}
              placeholder="Enter phone number"
              autoComplete="tel"
              inputMode="tel"
              className="h-9 text-sm pl-9"
            />
          </div>
        </Field>

        {/* Info note */}
        <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 px-3.5 py-3 flex gap-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-indigo-500 mt-0.5" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <strong>Next step:</strong> after adding, use <strong>Invite</strong> to send the
            member their login link with the organisation code.
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="gap-2 min-w-[140px]">
          {isLoading
            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : <UserPlus className="h-4 w-4" />}
          Add Member
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Field shell — DRYs label/error rendering ────────────────────────────────

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
