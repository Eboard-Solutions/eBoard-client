import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit3, Trash2, Mail, Phone, Shield, Crown, Users,
  UserCheck, UserX, MoreHorizontal,
} from 'lucide-react';
import type { DisplayUser } from './types';

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ElementType;
}> = {
  SuperAdmin:  { label: 'Super Admin',  color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-700', icon: Crown     },
  OrgAdmin:    { label: 'Org Admin',    color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-100 dark:bg-blue-900/30',     border: 'border-blue-200 dark:border-blue-700',   icon: Shield    },
  Admin:       { label: 'Admin',        color: 'text-sky-700 dark:text-sky-300',       bg: 'bg-sky-100 dark:bg-sky-900/30',       border: 'border-sky-200 dark:border-sky-700',     icon: Shield    },
  BoardMember: { label: 'Board Member', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', icon: UserCheck },
  User:        { label: 'User',         color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800',      border: 'border-slate-200 dark:border-slate-700', icon: Users     },
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role] ?? {
    label: role, color: 'text-slate-600', bg: 'bg-slate-100',
    border: 'border-slate-200', icon: Users,
  };
}

function getInitials(user: DisplayUser): string {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.name) return user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return user.email[0].toUpperCase();
}

function getGradient(id: string): string {
  if (!id) return AVATAR_GRADIENTS[0];
  return AVATAR_GRADIENTS[id.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  members: DisplayUser[];
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (member: DisplayUser) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (member: DisplayUser) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembersGrid({
  members,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  const showActions = canEdit || canDelete;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {members.map(user => {
        const cfg = getRoleConfig(user.role);
        const Icon = cfg.icon;
        const gradient = getGradient(user.id);
        const initials = getInitials(user);

        return (
          <div
            key={user.id}
            className="group relative rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden"
          >
            {/* Gradient accent top bar */}
            <div className={`h-1 w-full bg-gradient-to-r ${gradient} opacity-80`} />

            <div className="p-5">
              {/* Avatar + action menu row */}
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-base font-bold`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online / active indicator */}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                    user.isActive ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                </div>

                {showActions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {canEdit && onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Edit3 className="h-3.5 w-3.5 mr-2" />Edit Details
                        </DropdownMenuItem>
                      )}
                      {canEdit && onToggleActive && (
                        <DropdownMenuItem onClick={() => onToggleActive(user)}>
                          {user.isActive
                            ? <><UserX className="h-3.5 w-3.5 mr-2" />Deactivate</>
                            : <><UserCheck className="h-3.5 w-3.5 mr-2" />Activate</>
                          }
                        </DropdownMenuItem>
                      )}
                      {canDelete && onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(user.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Name, position, role */}
              <div className="space-y-2 mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-foreground leading-tight truncate">
                    {user.name}
                  </h3>
                  {user.position && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.position}</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {cfg.label}
                </span>
              </div>

              {/* Contact info */}
              <div className="pt-4 border-t border-border/50 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}