'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Search, Grid3X3, List, Users, Building2,
  UserPlus, Send, RefreshCcw, Filter, X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { usePermissions } from '@/lib/permissions';
import {
  useOrganisationUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/api/useUsers';
import type { User as ApiUser } from '@/types/api.types';

import AddMemberDialog, { type AddMemberFormData }   from '@/components/members/AddMemberDialog';
import InviteDialog,    { type InviteFormData }       from '@/components/members/InviteDialog';
import EditMemberDialog, { type EditMemberFormData }  from '@/components/members/EditMemberDialog';
import MembersGrid   from '@/components/members/MembersGrid';
import MembersList   from '@/components/members/MembersList';
import type { DisplayUser } from '@/components/members/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list';

function StatCard({
  label, value, sub, accentClass,
}: {
  label: string; value: number; sub?: string; accentClass: string;
}) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${accentClass} opacity-10 translate-x-6 -translate-y-6 pointer-events-none`} />
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const {
    isSuperAdmin,
    isOrgAdmin,
    currentorganisationId,
    isLoading: authLoading,
    authError,
    authErrorKind,
    refresh: refreshAuth,
  } = usePermissions();

  const queryClient = useQueryClient();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');
  const [viewMode,    setViewMode]    = useState<ViewMode>('grid');

  const [showAddDialog,    setShowAddDialog]    = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editTarget,       setEditTarget]       = useState<DisplayUser | null>(null);
  const [deleteTargetId,   setDeleteTargetId]   = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: membersRaw, isLoading: membersLoading } = useOrganisationUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // ── Permission flags ──────────────────────────────────────────────────────
  // KEY FIX: derive button visibility from ROLE flags (isSuperAdmin / isOrgAdmin),
  // NOT from can() which returns false while user=null or isLoading=true.
  // can() is fine for granular checks inside mutations, but not for rendering buttons.
  const canManage  = isSuperAdmin || isOrgAdmin;   // can add/invite
  const canUpdate  = isSuperAdmin || isOrgAdmin;   // can edit members
  const canDelete  = isSuperAdmin || isOrgAdmin;   // can remove members

  // OrgAdmin who has not yet created their organisation
  const needsOrgSetup = isOrgAdmin && !currentorganisationId;

  // ── Transform API data → DisplayUser ──────────────────────────────────────
  const allMembers = useMemo<DisplayUser[]>(() => {
    const items: ApiUser[] = Array.isArray(membersRaw)
      ? membersRaw
      : (membersRaw as { items?: ApiUser[] } | undefined)?.items ?? [];

    return items.map((u): DisplayUser => ({
      id:        u.userId ?? u.id ?? '',
      name:      `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      firstName: u.firstName ?? '',
      lastName:  u.lastName  ?? '',
      email:     u.email,
      avatar:    u.profilePictureUrl,
      role:      u.role,
      position:  u.title,
      phone:     u.phoneNumber,
      isActive:  u.isActive ?? true,
    }));
  }, [membersRaw]);

  // ── Filtered members ──────────────────────────────────────────────────────
  const members = useMemo(() =>
    allMembers.filter(u => {
      const term = search.toLowerCase().trim();
      const matchSearch = !term
        || u.name.toLowerCase().includes(term)
        || u.email.toLowerCase().includes(term)
        || (u.position ?? '').toLowerCase().includes(term);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    }),
    [allMembers, search, roleFilter],
  );

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:  allMembers.length,
    board:  allMembers.filter(m => m.role === 'BoardMember').length,
    admins: allMembers.filter(m => m.role === 'Admin' || m.role === 'OrgAdmin').length,
    active: allMembers.filter(m => m.isActive).length,
  }), [allMembers]);

  // ── Mutation handlers ─────────────────────────────────────────────────────

  const handleAddSubmit = useCallback((data: AddMemberFormData) => {
    createUser.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Member added successfully');
        setShowAddDialog(false);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to add member'),
    });
  }, [createUser, queryClient]);

  const handleInviteSubmit = useCallback((data: InviteFormData) => {
    // TODO: wire to /api/v1/auth/invite or similar endpoint when available
    toast.success(
      `Invitation${data.emails.length > 1 ? 's' : ''} sent to ${data.emails.length} recipient${data.emails.length > 1 ? 's' : ''}`,
    );
    setShowInviteDialog(false);
  }, []);

  const handleEditSubmit = useCallback((userId: string, data: EditMemberFormData) => {
    updateUser.mutate(
      { userId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          toast.success('Member updated');
          setEditTarget(null);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to update member'),
      },
    );
  }, [updateUser, queryClient]);

  const handleToggleActive = useCallback((user: DisplayUser) => {
    updateUser.mutate(
      { userId: user.id, data: { isActive: !user.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          toast.success(user.isActive ? 'Member deactivated' : 'Member activated');
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to update member'),
      },
    );
  }, [updateUser, queryClient]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    deleteUser.mutate(deleteTargetId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Member removed');
        setDeleteTargetId(null);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to remove member'),
    });
  }, [deleteTargetId, deleteUser, queryClient]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Hard auth failure (401/403 only) ──────────────────────────────────────
  if (authError && (authErrorKind === 'invalid_token' || authErrorKind === 'insufficient_role')) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Access Problem</h2>
          <p className="mt-1.5 max-w-md text-muted-foreground text-sm">{authError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={refreshAuth}>
            <RefreshCcw className="h-4 w-4 mr-2" />Retry
          </Button>
          <Button size="sm" asChild><a href="/auth/signin">Sign In</a></Button>
        </div>
      </div>
    );
  }

  // ── Org setup required ────────────────────────────────────────────────────
  if (needsOrgSetup) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage members for your organisation</p>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Organisation setup required
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                Create your organisation first before managing members.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs border-amber-400 hover:bg-amber-100"
                asChild
              >
                <a href="/organisation">Set Up Organisation</a>
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-dashed py-20 text-center">
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">No Organisation Yet</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Set up your organisation profile first to start managing members.
            </p>
            <Button asChild><a href="/organisation">Set Up Organisation</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto space-y-6 py-8 px-4 md:px-6 max-w-7xl">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSuperAdmin
              ? 'Full administrative control across all organisations'
              : isOrgAdmin
              ? "Manage your organisation's members and access"
              : 'View the member directory'}
          </p>
        </div>

        {/* Add/Invite buttons — shown for any OrgAdmin or SuperAdmin */}
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => setShowInviteDialog(true)}
            >
              <Send className="h-3.5 w-3.5" />
              Invite
            </Button>
            <Button
              size="sm"
              className="h-9 gap-2 shadow-sm"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Stats — only shown once data is loaded and there are members */}
      {!membersLoading && allMembers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Members"
            value={stats.total}
            accentClass="bg-blue-500"
            sub={`${stats.active} active`}
          />
          <StatCard label="Board Members" value={stats.board}  accentClass="bg-emerald-500" />
          <StatCard label="Admins"        value={stats.admins} accentClass="bg-violet-500"  />
          <StatCard
            label="Active"
            value={stats.active}
            accentClass="bg-amber-500"
            sub={stats.total - stats.active > 0 ? `${stats.total - stats.active} inactive` : undefined}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Role filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-44 text-sm shrink-0">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="OrgAdmin">Org Admin</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="BoardMember">Board Member</SelectItem>
            <SelectItem value="User">User</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-1 shrink-0">
          <button
            type="button"
            title="Grid view"
            onClick={() => setViewMode('grid')}
            className={`flex items-center justify-center h-7 w-7 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="List view"
            onClick={() => setViewMode('list')}
            className={`flex items-center justify-center h-7 w-7 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Clear filters */}
        {(search || roleFilter !== 'all') && (
          <button
            type="button"
            onClick={() => { setSearch(''); setRoleFilter('all'); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 transition-colors"
          >
            <X className="h-3 w-3" />Clear
          </button>
        )}
      </div>

      {/* Result count when filtering */}
      {!membersLoading && (search || roleFilter !== 'all') && (
        <p className="text-xs text-muted-foreground -mt-2">
          {members.length} of {allMembers.length} members
        </p>
      )}

      {/* Content area */}
      {membersLoading ? (
        // Skeleton
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-14 w-14 rounded-full bg-muted/60 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted/60 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted/60 animate-pulse rounded w-1/2" />
                  <div className="h-5 bg-muted/60 animate-pulse rounded-full w-24" />
                </div>
                <div className="pt-4 border-t border-border/40 space-y-2">
                  <div className="h-3 bg-muted/60 animate-pulse rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/40 last:border-0">
                <div className="h-9 w-9 rounded-full bg-muted/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted/60 animate-pulse rounded w-40" />
                  <div className="h-3 bg-muted/60 animate-pulse rounded w-56" />
                </div>
                <div className="h-5 w-24 bg-muted/60 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        )
      ) : members.length === 0 ? (
        // Empty state
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 py-20 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </div>
          <h3 className="text-base font-semibold">
            {search || roleFilter !== 'all' ? 'No matching members' : 'No members yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
            {search || roleFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : canManage
              ? 'Add your first team member or send invitations to get started.'
              : 'No members have been added to this organisation yet.'}
          </p>
          {canManage && !search && roleFilter === 'all' && (
            <div className="flex gap-3 justify-center mt-5">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowInviteDialog(true)}
              >
                <Send className="h-3.5 w-3.5" />Invite Members
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setShowAddDialog(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />Add Member
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <MembersGrid
          members={members}
          canEdit={canUpdate}
          canDelete={canDelete}
          onEdit={setEditTarget}
          onDelete={setDeleteTargetId}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <MembersList
          members={members}
          canEdit={canUpdate}
          canDelete={canDelete}
          onEdit={setEditTarget}
          onDelete={setDeleteTargetId}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      {/* Add Member */}
      <Dialog
        open={showAddDialog}
        onOpenChange={open => { if (!open) setShowAddDialog(false); }}
      >
        <DialogContent className="sm:max-w-md">
          <AddMemberDialog
            onSubmit={handleAddSubmit}
            onCancel={() => setShowAddDialog(false)}
            isLoading={createUser.isPending}
            allowSuperAdminRole={isSuperAdmin}
          />
        </DialogContent>
      </Dialog>

      {/* Invite Members */}
      <Dialog
        open={showInviteDialog}
        onOpenChange={open => { if (!open) setShowInviteDialog(false); }}
      >
        <DialogContent className="sm:max-w-md">
          <InviteDialog
            onSubmit={handleInviteSubmit}
            onCancel={() => setShowInviteDialog(false)}
            canAssignSuperAdmin={isSuperAdmin}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member */}
      <Dialog
        open={!!editTarget}
        onOpenChange={open => { if (!open) setEditTarget(null); }}
      >
        <DialogContent className="sm:max-w-md">
          {/* Only render dialog content when editTarget is set to avoid stale data */}
          {editTarget && (
            <EditMemberDialog
              member={editTarget}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditTarget(null)}
              isLoading={updateUser.isPending}
              allowSuperAdminRole={isSuperAdmin}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={open => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the member from your organisation.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Removing…' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}