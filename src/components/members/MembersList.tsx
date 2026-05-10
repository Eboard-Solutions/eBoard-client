// src/components/members/MembersList.tsx
//
// Compact, responsive table view of members.
// - Shared role/avatar primitives from ./shared (DRY with MembersGrid)
// - Hides Title and Phone columns on narrow viewports (sm/md respectively)
// - Action menu trigger always visible on touch (focus-within); revealed on
//   hover only on devices that support hover precisely
// - Row component is memoized so toggling search/filter doesn't re-render every row

import { memo, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit3, Trash2, Users, UserCheck, UserX, MoreHorizontal, Mail,
} from 'lucide-react';
import type { DisplayUser } from './types';
import { MemberAvatar, RoleBadge, StatusDot } from './shared';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  members:         DisplayUser[];
  canEdit?:        boolean;
  canDelete?:      boolean;
  onEdit?:         (member: DisplayUser) => void;
  onDelete?:       (id: string) => void;
  onToggleActive?: (member: DisplayUser) => void;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  user:           DisplayUser;
  showActions:    boolean;
  canEdit:        boolean;
  canDelete:      boolean;
  onEdit?:        (member: DisplayUser) => void;
  onDelete?:      (id: string) => void;
  onToggleActive?: (member: DisplayUser) => void;
}

const MemberRow = memo(function MemberRow({
  user, showActions, canEdit, canDelete, onEdit, onDelete, onToggleActive,
}: RowProps) {
  // Stable handlers — only rebound when their dependency changes
  const handleEdit         = useCallback(() => onEdit?.(user),         [onEdit, user]);
  const handleToggleActive = useCallback(() => onToggleActive?.(user), [onToggleActive, user]);
  const handleDelete       = useCallback(() => onDelete?.(user.id),    [onDelete, user.id]);

  return (
    <TableRow className="group border-b border-border/40 hover:bg-muted/20 focus-within:bg-muted/20 transition-colors">
      {/* Member */}
      <TableCell className="pl-4 sm:pl-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <MemberAvatar user={user} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate tracking-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0 opacity-60" />
              {user.email}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Role */}
      <TableCell className="py-3">
        <RoleBadge role={user.role} />
      </TableCell>

      {/* Title — hidden on small */}
      <TableCell className="py-3 text-sm text-muted-foreground hidden md:table-cell">
        {user.position || <span className="text-muted-foreground/50">—</span>}
      </TableCell>

      {/* Phone — hidden on small/medium */}
      <TableCell className="py-3 text-sm text-muted-foreground hidden lg:table-cell tabular-nums">
        {user.phone || <span className="text-muted-foreground/50">—</span>}
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          user.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
        }`}>
          <StatusDot active={user.isActive} size="xs" />
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </TableCell>

      {/* Actions */}
      {showActions && (
        <TableCell className="pr-4 sm:pr-5 py-3 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${user.name}`}
                /* Visible always on touch (no `hover:` support) and on
                   focus-within for keyboard users; otherwise reveal on hover. */
                className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
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
                    ? <><UserX      className="h-3.5 w-3.5 mr-2" />Deactivate</>
                    : <><UserCheck  className="h-3.5 w-3.5 mr-2" />Activate</>}
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
        </TableCell>
      )}
    </TableRow>
  );
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembersList({
  members,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  const showActions = canEdit || canDelete;

  // The page handles loading/empty states for the page-level no-data case,
  // but defend against an accidental empty array so the bare table doesn't
  // render headers above nothing.
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
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="pl-4 sm:pl-5 py-3 font-semibold text-foreground text-xs uppercase tracking-wider">
                Member
              </TableHead>
              <TableHead className="py-3 font-semibold text-foreground text-xs uppercase tracking-wider">
                Role
              </TableHead>
              <TableHead className="py-3 font-semibold text-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                Title
              </TableHead>
              <TableHead className="py-3 font-semibold text-foreground text-xs uppercase tracking-wider hidden lg:table-cell">
                Phone
              </TableHead>
              <TableHead className="py-3 font-semibold text-foreground text-xs uppercase tracking-wider">
                Status
              </TableHead>
              {showActions && (
                <TableHead className="pr-4 sm:pr-5 py-3 text-right font-semibold text-foreground text-xs uppercase tracking-wider w-16">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(user => (
              <MemberRow
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
