// src/components/members/MembersGrid.tsx
//
// Card grid view of members. Shares avatar/role primitives with MembersList
// via ./shared and memoizes each card so changing search input doesn't
// re-render every card.

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit3, Trash2, Mail, Phone, UserCheck, UserX, MoreHorizontal, Users,
} from 'lucide-react';
import type { DisplayUser } from './types';
import { MemberAvatar, RoleBadge, getGradient } from './shared';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  members:        DisplayUser[];
  canEdit?:       boolean;
  canDelete?:     boolean;
  onEdit?:        (member: DisplayUser) => void;
  onDelete?:      (id: string) => void;
  onToggleActive?: (member: DisplayUser) => void;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  user:           DisplayUser;
  showActions:    boolean;
  canEdit:        boolean;
  canDelete:      boolean;
  onEdit?:        (member: DisplayUser) => void;
  onDelete?:      (id: string) => void;
  onToggleActive?: (member: DisplayUser) => void;
}

const MemberCard = memo(function MemberCard({
  user, showActions, canEdit, canDelete, onEdit, onDelete, onToggleActive,
}: CardProps) {
  const gradient = getGradient(user.id);
  const handleEdit         = useCallback(() => onEdit?.(user),         [onEdit, user]);
  const handleToggleActive = useCallback(() => onToggleActive?.(user), [onToggleActive, user]);
  const handleDelete       = useCallback(() => onDelete?.(user.id),    [onDelete, user.id]);

  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] hover:border-border focus-within:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.10)] transition-all duration-200 overflow-hidden">
      {/* Gradient accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} aria-hidden />

      <div className="p-5">
        {/* Avatar + action menu */}
        <div className="flex items-start justify-between mb-4">
          <MemberAvatar user={user} size="lg" />
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${user.name}`}
                  className="h-8 w-8 -mt-1 -mr-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canEdit && onEdit && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="h-3.5 w-3.5 mr-2" />Edit details
                  </DropdownMenuItem>
                )}
                {canEdit && onToggleActive && (
                  <DropdownMenuItem onClick={handleToggleActive}>
                    {user.isActive
                      ? <><UserX     className="h-3.5 w-3.5 mr-2" />Deactivate</>
                      : <><UserCheck className="h-3.5 w-3.5 mr-2" />Activate</>}
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Name + role */}
        <div className="space-y-2 mb-4 min-w-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground leading-tight truncate tracking-tight">
              {user.name}
            </h3>
            {user.position && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.position}</p>
            )}
          </div>
          <RoleBadge role={user.role} />
        </div>

        {/* Contact */}
        <div className="pt-4 border-t border-border/50 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <Mail className="h-3 w-3 shrink-0 opacity-70" />
            <a
              href={`mailto:${user.email}`}
              className="truncate hover:text-foreground hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {user.email}
            </a>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0 opacity-70" />
              <span className="tabular-nums">{user.phone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

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

  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-semibold">No members to show</p>
        <p className="text-xs text-muted-foreground mt-1">Try clearing your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {members.map(user => (
        <MemberCard
          key={user.id}
          user={user}
          showActions={showActions}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
