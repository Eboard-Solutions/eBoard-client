// src/components/members/shared.tsx
//
// Shared primitives for the Members module: role badge config, avatar gradients,
// reusable RoleBadge and MemberAvatar components, and the role select options.
// Centralising these eliminates the four-file copy-paste of ROLE_CONFIG and
// AVATAR_GRADIENTS that previously diverged between Grid / List / dialogs.

import { memo } from 'react';
import { Crown, Shield, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLES, type DisplayUser } from './types';

// ─── Role config ──────────────────────────────────────────────────────────────

interface RoleStyle {
  label:  string;
  color:  string;
  bg:     string;
  border: string;
  icon:   LucideIcon;
}

/**
 * Map every backend role value (and a few common aliases that appear in older
 * payloads) to a consistent badge style. Unknown roles fall through to a
 * neutral slate badge in `getRoleConfig`.
 */
const ROLE_CONFIG: Record<string, RoleStyle> = {
  // Backend canonical (from eROLE enum)
  [ROLES.SUPER_ADMIN]:  { label: 'Super Admin',  color: 'text-violet-700 dark:text-violet-300',   bg: 'bg-violet-100 dark:bg-violet-900/30',   border: 'border-violet-200 dark:border-violet-700',   icon: Crown     },
  [ROLES.ORG_ADMIN]:    { label: 'Org Admin',    color: 'text-blue-700 dark:text-blue-300',       bg: 'bg-blue-100 dark:bg-blue-900/30',       border: 'border-blue-200 dark:border-blue-700',       icon: Shield    },
  [ROLES.BOARD_MEMBER]: { label: 'Board Member', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', icon: UserCheck },
  [ROLES.SECRETARY]:    { label: 'Secretary',    color: 'text-sky-700 dark:text-sky-300',         bg: 'bg-sky-100 dark:bg-sky-900/30',         border: 'border-sky-200 dark:border-sky-700',         icon: Shield    },
  // Legacy / alias values that may still flow from older payloads
  SuperAdmin:  { label: 'Super Admin',  color: 'text-violet-700 dark:text-violet-300',   bg: 'bg-violet-100 dark:bg-violet-900/30',   border: 'border-violet-200 dark:border-violet-700',   icon: Crown     },
  ORG_ADMIN:   { label: 'Org Admin',    color: 'text-blue-700 dark:text-blue-300',       bg: 'bg-blue-100 dark:bg-blue-900/30',       border: 'border-blue-200 dark:border-blue-700',       icon: Shield    },
  BOARD_MEMBER:{ label: 'Board Member', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', icon: UserCheck },
  SECRETARY:   { label: 'Secretary',    color: 'text-sky-700 dark:text-sky-300',         bg: 'bg-sky-100 dark:bg-sky-900/30',         border: 'border-sky-200 dark:border-sky-700',         icon: Shield    },
};

const FALLBACK_ROLE: RoleStyle = {
  label: 'Member',
  color: 'text-slate-600 dark:text-slate-400',
  bg: 'bg-slate-100 dark:bg-slate-800',
  border: 'border-slate-200 dark:border-slate-700',
  icon: Users,
};

export function getRoleConfig(role: string): RoleStyle {
  return ROLE_CONFIG[role] ?? FALLBACK_ROLE;
}

// ─── Avatar gradients ─────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
] as const;

export function getGradient(seed: string): string {
  if (!seed) return AVATAR_GRADIENTS[0];
  // Sum a couple of char codes so two users named "Alex" don't collide.
  const a = seed.charCodeAt(0);
  const b = seed.length > 1 ? seed.charCodeAt(seed.length - 1) : 0;
  return AVATAR_GRADIENTS[(a + b) % AVATAR_GRADIENTS.length];
}

export function getInitials(user: Pick<DisplayUser, 'firstName' | 'lastName' | 'name' | 'email'>): string {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.name) return user.name.split(/\s+/).map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return user.email[0]?.toUpperCase() ?? '?';
}

// ─── Reusable badges + avatar ─────────────────────────────────────────────────

export const RoleBadge = memo(function RoleBadge({ role, size = 'sm' }: {
  role: string;
  size?: 'sm' | 'md';
}) {
  const cfg = getRoleConfig(role);
  const Icon = cfg.icon;
  const sizing = size === 'md'
    ? 'px-3 py-1 text-[11px]'
    : 'px-2.5 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border tracking-tight whitespace-nowrap ${cfg.color} ${cfg.bg} ${cfg.border} ${sizing}`}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
});

export const StatusDot = memo(function StatusDot({ active, size = 'sm' }: {
  active: boolean;
  size?: 'xs' | 'sm';
}) {
  const dim = size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  return (
    <span className={`relative inline-flex ${dim} shrink-0`}>
      {active && (
        <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
      )}
      <span className={`relative rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'} ${dim}`} />
    </span>
  );
});

export const MemberAvatar = memo(function MemberAvatar({
  user, size = 'md',
}: {
  user: DisplayUser;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = { sm: 'h-9 w-9 text-[11px]', md: 'h-11 w-11 text-xs', lg: 'h-14 w-14 text-base' }[size];
  const ringDim = { sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-3.5 w-3.5' }[size];
  const gradient = getGradient(user.id);
  const initials = getInitials(user);
  return (
    <div className="relative shrink-0">
      <Avatar className={`${dims} ring-1 ring-border/60 shadow-sm`}>
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-bold tracking-wide`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <span
        title={user.isActive ? 'Active' : 'Inactive'}
        aria-label={user.isActive ? 'Active' : 'Inactive'}
        className={`absolute -bottom-0.5 -right-0.5 ${ringDim} rounded-full border-2 border-background ${
          user.isActive ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      />
    </div>
  );
});

// ─── Role select options (kept in sync with backend eROLE) ────────────────────

export interface RoleOption {
  value:           string;
  label:           string;
  superAdminOnly?: boolean;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: ROLES.SUPER_ADMIN,  label: 'Super Admin',  superAdminOnly: true },
  { value: ROLES.ORG_ADMIN,    label: 'Org Admin'    },
  { value: ROLES.BOARD_MEMBER, label: 'Board Member' },
  { value: ROLES.SECRETARY,    label: 'Secretary'    },
];

export function getRoleOptions(canAssignSuperAdmin: boolean): RoleOption[] {
  return ROLE_OPTIONS.filter(o => !o.superAdminOnly || canAssignSuperAdmin);
}
