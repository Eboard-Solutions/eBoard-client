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
import { Send, Mail, Info, Hash } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InviteFormData {
  emails:   string[];
  role:     string;
  orgCode?: string;   // organisation code members need to log in
  message?: string;
}

interface Props {
  onSubmit:             (data: InviteFormData) => void;
  onCancel:             () => void;
  isLoading?:           boolean;
  canAssignSuperAdmin?: boolean;
  /** The organisation's login code — shown in the invitation so members know what to enter */
  orgCode?:             string;
}

// ─── Role descriptions ────────────────────────────────────────────────────────

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OrgAdmin:    'Can manage all members, meetings and settings',
  Admin:       'Administrative access to manage members',
  BoardMember: 'Full board access with voting rights',
  User:        'Standard read and participation access',
  SuperAdmin:  'Full system-wide access',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InviteDialog({
  onSubmit,
  onCancel,
  isLoading = false,
  canAssignSuperAdmin = false,
  orgCode,
}: Props) {
  const [emailInput, setEmailInput] = useState('');
  const [role,       setRole]       = useState('BoardMember');
  const [message,    setMessage]    = useState('');
  const [emailError, setEmailError] = useState('');

  function parseEmails(raw: string): string[] {
    return raw
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);
  }

  function validate(): boolean {
    const list = parseEmails(emailInput);
    if (list.length === 0) {
      setEmailError('Enter at least one email address');
      return false;
    }
    const invalid = list.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalid.length > 0) {
      setEmailError(`Invalid address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`);
      return false;
    }
    setEmailError('');
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit({
      emails:  parseEmails(emailInput),
      role,
      orgCode: orgCode ?? undefined,
      message: message.trim() || undefined,
    });
  }

  const emailCount = parseEmails(emailInput).length;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5 text-lg">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          Invite Members
        </DialogTitle>
        <DialogDescription>
          Send email invitations with a secure activation link. Links expire in 48 hours.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">

        {/* Org code badge — members need this to log in */}
        {orgCode && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5">
            <Hash className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                Organisation code (included in invitation):
              </span>
              <span className="ml-2 text-xs font-bold font-mono text-emerald-800 dark:text-emerald-200">
                {orgCode}
              </span>
            </div>
          </div>
        )}

        {/* Email addresses */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Addresses <span className="text-destructive normal-case font-normal">*</span>
            </Label>
            {emailCount > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {emailCount} recipient{emailCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <textarea
            value={emailInput}
            onChange={e => { setEmailInput(e.target.value); if (emailError) setEmailError(''); }}
            placeholder={`Enter email address${canAssignSuperAdmin ? 'es' : ''} to invite, separated by commas, semicolons, or new lines`}
            rows={5}
            className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none leading-relaxed transition-colors ${
              emailError ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
            }`}
          />
          {emailError
            ? <p className="text-xs text-destructive">{emailError}</p>
            : <p className="text-xs text-muted-foreground">Separate multiple addresses with commas, semicolons, or new lines.</p>
          }
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OrgAdmin">Org Admin</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="BoardMember">Board Member</SelectItem>
              <SelectItem value="User">User</SelectItem>
              {canAssignSuperAdmin && <SelectItem value="SuperAdmin">Super Admin</SelectItem>}
            </SelectContent>
          </Select>
          {ROLE_DESCRIPTIONS[role] && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3 w-3 shrink-0" />
              {ROLE_DESCRIPTIONS[role]}
            </p>
          )}
        </div>

        {/* Optional personal message */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Personal Message <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a personal note to the invitation email…"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none leading-relaxed"
          />
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3.5 flex gap-2.5">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Each recipient will receive a secure activation link
            {orgCode ? ` along with the organisation code <strong>${orgCode}</strong> needed to log in` : ''}.
            They will set their own password when they accept.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
          {isLoading
            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            : <Send className="h-4 w-4" />
          }
          Send Invitation{emailCount > 1 ? 's' : ''}
        </Button>
      </DialogFooter>
    </>
  );
}