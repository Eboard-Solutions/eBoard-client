// components/members/InviteDialog.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

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
import { Mail, User, Briefcase, Building2, Send, Shield } from 'lucide-react';

const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['BoardMember', 'Admin', 'User', 'SuperAdmin']),
  position: z.string().optional(),
  organizationId: z.string().optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface Props {
  organizations?: { id: string; name: string }[];
  canChangeOrg?: boolean;
  canAssignSuperAdmin?: boolean;
  onSubmit?: (data: InviteForm) => void;
}

const roleOptions = [
  {
    value: 'BoardMember',
    label: 'Board Member',
    description: 'Full board access and voting rights',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    value: 'Admin',
    label: 'Admin',
    description: 'Administrative access to manage members',
    className: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  {
    value: 'User',
    label: 'User',
    description: 'Standard read and comment access',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
];

export default function InviteDialog({
  organizations = [],
  canChangeOrg = false,
  canAssignSuperAdmin = false,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'BoardMember' },
  });

  const selectedRole = watch('role');
  const selectedRoleOption = roleOptions.find((r) => r.value === selectedRole);

  const handleFormSubmit = async (data: InviteForm) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      toast.success(`Invitation sent to ${data.email}`, {
        description: `They'll receive an email with instructions to join.`,
      });
    } catch {
      toast.error('Failed to send invitation', {
        description: 'Please try again or contact support.',
      });
    }
  };

  return (
    <>
      <DialogHeader className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold">Invite Board Member</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-0.5">
              Send an invitation to join {canChangeOrg ? 'an organization' : 'your organization'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="name"
              placeholder="Jane Smith"
              className={`pl-9 ${errors.name ? 'border-destructive' : ''}`}
              {...register('name')}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
          )}
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
              className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Role <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedRole} onValueChange={(v) => setValue('role', v as any)}>
            <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground/60" />
                <SelectValue placeholder="Select a role" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      — {opt.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
              {canAssignSuperAdmin && (
                <SelectItem value="SuperAdmin">
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="font-medium">Super Admin</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      — Full system access
                    </span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedRoleOption && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-xs border ${selectedRoleOption.className}`}>
                {selectedRoleOption.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{selectedRoleOption.description}</span>
            </div>
          )}
        </div>

        {/* Organization (conditional) */}
        {canChangeOrg && organizations.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Organization</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 z-10 pointer-events-none" />
              <Select onValueChange={(v) => setValue('organizationId', v)}>
                <SelectTrigger className="pl-9">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Position */}
        <div className="space-y-1.5">
          <Label htmlFor="position" className="text-sm font-medium">
            Position <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="position"
              placeholder="e.g. Chief Financial Officer"
              className="pl-9"
              {...register('position')}
            />
          </div>
        </div>

        {/* Info notice */}
        <div className="rounded-lg bg-muted/50 border border-border/60 p-3.5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2 leading-relaxed">
            <Mail className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/60" />
            An invitation email will be sent with a secure link to join your organization.
            The link expires in 7 days.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-border/60 mt-6">
          <Button type="button" variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Sending…' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </>
  );
}