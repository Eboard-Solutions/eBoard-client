'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Plus,
  Search,
  Grid,
  List as ListIcon,
  Users,
  Building2,
  Edit,
  Trash2,
  Mail,
  UserPlus,
  Send,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { usePermissions } from '@/lib/permissions';
import {
  useOrganisationUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/api/useUsers';
import {
  useOrganisations,
  useRegisterOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
} from '@/hooks/api/useOrganisations';

import type { User as ApiUser, Organisation } from '@/types/api.types';

import AddMemberDialog from '@/components/members/AddMemberDialog';
import EditMemberDialog from '@/components/members/EditMemberDialog';
import InviteDialog from '@/components/members/InviteDialog';
import MembersGrid from '@/components/members/MembersGrid';
import MembersList from '@/components/members/MembersList';

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

  const [activeTab, setActiveTab] = useState<'members' | 'organizations'>('members');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [editMember, setEditMember] = useState<DisplayUser | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [editOrg, setEditOrg] = useState<Organisation | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<string | null>(null);
  const [showCreateOrgOverlay, setShowCreateOrgOverlay] = useState(false);

  // ── Data fetching ───────────────────────────────────────
  const { data: membersRaw, isLoading: membersLoading } = useOrganisationUsers();
  const { data: orgsRaw, isLoading: orgsLoading } = useOrganisations();

  const members = useMemo<DisplayUser[]>(() => {
    const items = Array.isArray(membersRaw) ? membersRaw : membersRaw?.items ?? [];
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

  const organizations = useMemo<Organisation[]>(() => {
    return Array.isArray(orgsRaw) ? orgsRaw : orgsRaw?.items ?? [];
  }, [orgsRaw]);

  // ── Mutations ───────────────────────────────────────────
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const registerOrg = useRegisterOrganisation();
  const updateOrg = useUpdateOrganisation();
  const deleteOrg = useDeleteOrganisation();

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

  const handleDeleteOrgConfirm = useCallback(() => {
    if (!orgToDelete) return;
    deleteOrg.mutate(orgToDelete, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['organisations'] });
        localStorage.removeItem('currentOrganizationId');
        toast.success('Organization deleted');
        setOrgToDelete(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete organization'),
    });
  }, [orgToDelete, deleteOrg, queryClient]);

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Members & Organizations
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? 'Full administrative control across all organizations'
              : isOrgAdmin
              ? 'Manage members and settings for your organization'
              : 'View members and organization details'}
          </p>
        </div>

        {/* CTA Buttons */}
        {activeTab === 'members' && canInvite && !needsOrgSetup && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Invite Board Member — primary CTA */}
            <Button
              size="sm"
              className="gap-2 h-9"
              onClick={() => setShowInviteDialog(true)}
            >
              <Send className="h-4 w-4" />
              Invite Board Member
            </Button>

            {/* Add Member directly */}
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
      {activeTab === 'members' && !needsOrgSetup && !membersLoading && members.length > 0 && (
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

      {/* ── Tabs ────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'members' | 'organizations')}>
        <TabsList className="h-10 p-1 bg-muted/50 border border-border/60">
          <TabsTrigger value="members" className="gap-2 text-sm h-8 px-4">
            <Users className="h-4 w-4" />
            Members
            {members.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-xs ml-0.5">
                {members.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2 text-sm h-8 px-4">
            <Building2 className="h-4 w-4" />
            Organizations
            {organizations.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-xs ml-0.5">
                {organizations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Members Tab ─────────────────────────────────── */}
        <TabsContent value="members" className="mt-5 space-y-5">
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
        </TabsContent>

        {/* ── Organizations Tab ────────────────────────────── */}
        <TabsContent value="organizations" className="mt-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Organizations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {organizations.length} organization{organizations.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <Button
              size="sm"
              className="gap-2 h-9"
              onClick={() => setEditOrg({} as Organisation)}
            >
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </div>

          {orgsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <Card className="border-dashed py-20 text-center">
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Building2 className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                </div>
                <h3 className="text-lg font-medium">No organizations yet</h3>
                <p className="text-sm text-muted-foreground">Create your first organization to get started.</p>
                <Button size="sm" onClick={() => setEditOrg({} as Organisation)}>
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                    <TableHead className="font-semibold text-foreground pl-5 py-3">Name</TableHead>
                    <TableHead className="font-semibold text-foreground py-3">Email</TableHead>
                    <TableHead className="font-semibold text-foreground py-3">Website</TableHead>
                    <TableHead className="w-24 text-right font-semibold text-foreground pr-5 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                      <TableCell className="pl-5 py-3.5 font-medium text-sm">
                        {org.organisationName ?? org.name ?? '—'}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-muted-foreground">
                        {org.OrgEmail ?? org.email ?? '—'}
                      </TableCell>
                      <TableCell className="py-3.5">
                        {org.websiteUrl ? (
                          <a
                            href={org.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {org.websiteUrl.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={() => setEditOrg(org)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setOrgToDelete(org.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────── */}

      {/* Invite Board Member */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <InviteDialog
            organizations={organizations.map(o => ({
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
              This will permanently remove the member from your organization.
              This action cannot be undone.
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

      {/* Create / Edit Organization */}
      {(editOrg || showCreateOrgOverlay) && (
        <Dialog
          open={!!editOrg || showCreateOrgOverlay}
          onOpenChange={() => {
            setEditOrg(null);
            setShowCreateOrgOverlay(false);
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    {editOrg?.id ? 'Edit Organization' : 'Create Organization'}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-sm">
                    {editOrg?.id
                      ? 'Update the organization details below.'
                      : 'Fill in the required information to set up your organization.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const payload = Object.fromEntries(formData) as any;

                if (editOrg?.id) {
                  updateOrg.mutate(
                    { orgId: editOrg.id, data: payload },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['organisations'] });
                        toast.success('Organization updated');
                        setEditOrg(null);
                      },
                      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update organization'),
                    }
                  );
                } else {
                  registerOrg.mutate(payload, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ['organisations'] });
                      toast.success('Organization created');
                      setEditOrg(null);
                      setShowCreateOrgOverlay(false);
                    },
                    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create organization'),
                  });
                }
              }}
              className="space-y-5 py-4"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="organisationName" className="text-sm font-medium">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="organisationName"
                    name="organisationName"
                    defaultValue={editOrg?.organisationName ?? editOrg?.name ?? ''}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="OrgEmail" className="text-sm font-medium">
                    Contact Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="OrgEmail"
                    name="OrgEmail"
                    type="email"
                    defaultValue={editOrg?.OrgEmail ?? editOrg?.email ?? ''}
                    placeholder="hello@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editOrg?.description ?? ''}
                  placeholder="Brief description of your organization…"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    defaultValue={editOrg?.phoneNumber ?? ''}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editOrg?.address ?? ''}
                    placeholder="123 Business Rd, City, Country"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="websiteUrl" className="text-sm font-medium">Website</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    defaultValue={editOrg?.websiteUrl ?? ''}
                    placeholder="https://www.company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl" className="text-sm font-medium">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    defaultValue={editOrg?.logoUrl ?? ''}
                    placeholder="https://company.com/logo.png"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOrg(null);
                    setShowCreateOrgOverlay(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={registerOrg.isPending || updateOrg.isPending} className="gap-2 min-w-32">
                  {registerOrg.isPending || updateOrg.isPending ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving…
                    </>
                  ) : editOrg?.id ? (
                    'Save Changes'
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Organization Confirm */}
      <AlertDialog open={!!orgToDelete} onOpenChange={() => setOrgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteOrgConfirm}
              disabled={deleteOrg.isPending}
            >
              {deleteOrg.isPending ? 'Deleting…' : 'Delete Organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}