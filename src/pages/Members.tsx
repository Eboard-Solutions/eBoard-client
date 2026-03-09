'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Search,
  Grid,
  List as ListIcon,
  Users,
  Building2,
  UserPlus,
  Send,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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

import AddMemberDialog from '@/components/members/AddMemberDialog';
import EditMemberDialog from '@/components/members/EditMemberDialog';
import InviteDialog from '@/components/members/InviteDialog';
import MembersGrid from '@/components/members/MembersGrid';
import MembersList from '@/components/members/MembersList';
import { useOrganisations } from '@/hooks/api/useOrganisations';

type ViewMode = 'grid' | 'list';

interface DisplayUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  role: string;
  position?: string;
  phone?: string;
}

export default function MembersPage() {
  const {
    can,
    isSuperAdmin,
    isOrgAdmin,
    currentOrgId,
    isLoading: authLoading,
    authError,
    refresh: refreshAuth,
  } = usePermissions();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [editMember, setEditMember] = useState<DisplayUser | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCreateOrgOverlay, setShowCreateOrgOverlay] = useState(false);

  // ── Data fetching ───────────────────────────────────────
  const { data: membersRaw, isLoading: membersLoading } = useOrganisationUsers();
  const { data: orgsRaw } = useOrganisations();

  const organizations = useMemo(() => {
    return Array.isArray(orgsRaw) ? orgsRaw : (orgsRaw as any)?.items ?? [];
  }, [orgsRaw]);

  const members = useMemo<DisplayUser[]>(() => {
    const items = Array.isArray(membersRaw) ? membersRaw : (membersRaw as any)?.items ?? [];
    return items
      .filter((user: ApiUser) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase();
        return fullName.includes(term) || user.email?.toLowerCase().includes(term);
      })
      .filter((user: ApiUser) =>
        roleFilter === 'all' ? true : user.role?.toLowerCase() === roleFilter.toLowerCase()
      )
      .map(
        (user: ApiUser): DisplayUser => ({
          id: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.profilePictureUrl,
          role: user.role,
          position: user.title,
          phone: user.phoneNumber,
        })
      );
  }, [membersRaw, search, roleFilter]);

  // ── Mutations ───────────────────────────────────────────
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const canInvite = can('members:invite');
  const canDelete = can('members:delete');

  const needsOrgSetup = isOrgAdmin && !currentOrgId;

  // ── Stats ───────────────────────────────────────────────
  const boardMembers = members.filter(m => m.role === 'BoardMember').length;
  const admins = members.filter(m => m.role === 'Admin' || m.role === 'OrgAdmin').length;

  // ── Handlers ────────────────────────────────────────────
  const handleDeleteMemberConfirm = useCallback(() => {
    if (!memberToDelete) return;
    deleteUser.mutate(memberToDelete, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users', 'organisation-users'] });
        toast.success('Member removed successfully');
        setMemberToDelete(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove member'),
    });
  }, [memberToDelete, deleteUser, queryClient]);

  // ── Render states ───────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading permissions...
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Access Problem</h2>
          <p className="mt-2 max-w-md text-muted-foreground">{authError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshAuth}>Retry</Button>
          <Button asChild><a href="/auth/signin">Sign In</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-7 py-8 px-4 md:px-6 max-w-7xl">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? 'Full administrative control across all organizations'
              : isOrgAdmin
              ? 'Manage members for your organization'
              : 'View members and organization details'}
          </p>
        </div>

        {canInvite && !needsOrgSetup && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-2 h-9"
              onClick={() => setShowInviteDialog(true)}
            >
              <Send className="h-4 w-4" />
              Invite Board Member
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 h-9"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Org Setup Warning */}
      {needsOrgSetup && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium">Organization setup required</p>
              <p className="mt-0.5 text-amber-800 text-xs leading-relaxed">
                Complete your organization profile to unlock full member management features.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-xs border-amber-400 hover:bg-amber-100"
                onClick={() => setShowCreateOrgOverlay(true)}
              >
                Finish Setup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Stats ─────────────────────────────────── */}
      {!needsOrgSetup && !membersLoading && members.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Members', value: members.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Board Members', value: boardMembers, icon: UserPlus, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Admins', value: admins, icon: Building2, color: 'text-violet-600 bg-violet-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border border-border/60 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────── */}
      {needsOrgSetup ? (
        <Card className="border-dashed py-20 text-center">
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">Organization Setup Required</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Configure your organization details to begin managing members.
            </p>
            <Button onClick={() => setShowCreateOrgOverlay(true)}>
              Set Up Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                className="h-9 pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-40 text-sm shrink-0">
                <SelectValue placeholder="Filter role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="OrgAdmin">Org Admin</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="BoardMember">Board Member</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-0.5 rounded-md border border-border/60 bg-background p-1 shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {membersLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <Card className="border-dashed py-20 text-center">
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Users className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                </div>
                <h3 className="text-lg font-medium">No members found</h3>
                <p className="text-sm text-muted-foreground">
                  {search || roleFilter !== 'all'
                    ? 'Try adjusting your search or filter.'
                    : canInvite
                    ? 'Get started by inviting your first team member.'
                    : 'No members in this organization yet.'}
                </p>
                {canInvite && !search && roleFilter === 'all' && (
                  <Button size="sm" className="gap-2" onClick={() => setShowInviteDialog(true)}>
                    <Send className="h-4 w-4" />
                    Invite Board Member
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <MembersGrid
              members={members}
              onEdit={setEditMember}
              onDelete={canDelete ? setMemberToDelete : undefined}
            />
          ) : (
            <MembersList
              members={members}
              onEdit={setEditMember}
              onDelete={canDelete ? setMemberToDelete : undefined}
            />
          )}
        </>
      )}

      {/* ── Dialogs ─────────────────────────────────────────── */}

      {/* Invite Board Member */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <InviteDialog
            organizations={organizations.map((o: any) => ({
              id: o.id,
              name: o.organisationName ?? o.name ?? o.id,
            }))}
            canChangeOrg={isSuperAdmin}
            canAssignSuperAdmin={isSuperAdmin}
            onSubmit={() => {
              queryClient.invalidateQueries({ queryKey: ['users'] });
              setShowInviteDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Member */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <AddMemberDialog
            onSubmit={(data) => {
              createUser.mutate(data, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['users', 'organisation-users'] });
                  toast.success('Member added successfully');
                  setShowAddDialog(false);
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add member'),
              });
            }}
            committees={[]}
            allowSuperAdminRole={isSuperAdmin}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Member */}
      {editMember && (
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="sm:max-w-lg">
            <EditMemberDialog
              member={editMember}
              onSubmit={(updates) => {
                updateUser.mutate(
                  { userId: editMember.id, data: updates },
                  {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ['users', 'organisation-users'] });
                      toast.success('Member updated');
                      setEditMember(null);
                    },
                    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update member'),
                  }
                );
              }}
              committees={[]}
              allowSuperAdminRole={isSuperAdmin}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Member Confirm */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the member from your organization. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteMemberConfirm}
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