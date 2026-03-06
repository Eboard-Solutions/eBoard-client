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
  FileText,
  Phone,
  MapPin,
  Globe,
  Image as ImageIcon,
  X,
  Save,
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
        Loading permissions...
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <AlertTriangle className="h-14 w-14 text-destructive" />
        <h2 className="text-2xl font-semibold">Access Problem</h2>
        <p className="max-w-md text-muted-foreground">{authError}</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={refreshAuth}>
            Retry
          </Button>
          <Button asChild>
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 py-8 px-4 md:px-6">
      {/* Header + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Members & Organizations</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? 'Full administrative control'
              : isOrgAdmin
              ? 'Manage your organization'
              : 'View-only access'}
          </p>

          {needsOrgSetup && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-900">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="flex-1">
                  <p className="font-medium">Organization setup required</p>
                  <p className="mt-1 leading-relaxed text-amber-800">
                    Please complete your organization profile to unlock full member management features.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-amber-400 hover:bg-amber-100"
                    onClick={() => setShowCreateOrgOverlay(true)}
                  >
                    Finish Setup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'members' && canInvite && !needsOrgSetup && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Invite Member
              </Button>
            </DialogTrigger>
            <AddMemberDialog />
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'members' | 'organizations')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="members" className="py-3 text-base">
            <Users className="mr-2 h-4.5 w-4.5" />
            Members
          </TabsTrigger>
          <TabsTrigger value="organizations" className="py-3 text-base">
            <Building2 className="mr-2 h-4.5 w-4.5" />
            Organizations
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6 space-y-6">
          {needsOrgSetup ? (
            <Card className="border-dashed py-24 text-center">
              <CardContent className="space-y-6">
                <Building2 className="mx-auto h-16 w-16 text-muted-foreground/70" />
                <h3 className="text-2xl font-semibold">Organization Setup Required</h3>
                <p className="mx-auto max-w-md text-muted-foreground">
                  Configure your organization details to begin managing members.
                </p>
                <Button size="lg" onClick={() => setShowCreateOrgOverlay(true)}>
                  Set Up Organization
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filters */}
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search name or email..."
                        className="h-10 pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-10 w-44">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="OrgAdmin">OrgAdmin</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="BoardMember">Board Member</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-0.5 rounded-md border p-1 sm:ml-auto">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid className="h-4.5 w-4.5" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setViewMode('list')}
                      >
                        <ListIcon className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {membersLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="h-80 animate-pulse rounded-xl bg-muted/50" />
                    ))}
                </div>
              ) : members.length === 0 ? (
                <Card className="border-dashed py-24 text-center">
                  <CardContent className="space-y-5">
                    <Users className="mx-auto h-14 w-14 text-muted-foreground/60" />
                    <h3 className="text-xl font-medium">No members found</h3>
                    <p className="text-muted-foreground">
                      {canInvite ? 'Invite your first team member.' : 'No members in this organization yet.'}
                    </p>
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

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
            <Button onClick={() => setEditOrg({} as Organisation)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </div>

          {orgsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/50" />
                ))}
            </div>
          ) : organizations.length === 0 ? (
            <Card className="border-dashed py-24 text-center">
              <CardContent className="space-y-5">
                <Building2 className="mx-auto h-14 w-14 text-muted-foreground/60" />
                <h3 className="text-xl font-medium">No organizations yet</h3>
                <p className="text-muted-foreground">Create your first organization to continue.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-medium">Name</TableHead>
                    <TableHead className="font-medium">Email</TableHead>
                    <TableHead className="font-medium">Website</TableHead>
                    <TableHead className="w-24 text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        {org.organisationName || org.name || '—'}
                      </TableCell>
                      <TableCell>{org.OrgEmail || org.email || '—'}</TableCell>
                      <TableCell>
                        {org.websiteUrl ? (
                          <a
                            href={org.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Visit
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditOrg(org)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setOrgToDelete(org.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────────────── */}

      {editMember && (
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="sm:max-w-lg">
            <EditMemberDialog
              member={editMember}
              onSubmit={(updates) => updateUser.mutate({ userId: editMember.id, data: updates })}
              committees={[]}
              allowSuperAdminRole={isSuperAdmin}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone.
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
              <DialogTitle className="text-2xl">
                {editOrg?.id ? 'Edit Organization' : 'Create Organization'}
              </DialogTitle>
              <DialogDescription>
                {editOrg?.id
                  ? 'Update the organization details below.'
                  : 'Fill in the required information to set up your organization.'}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const payload = Object.fromEntries(formData) as any;

                if (editOrg?.id) {
                  updateOrg.mutate({ orgId: editOrg.id, data: payload });
                } else {
                  registerOrg.mutate(payload);
                }
              }}
              className="space-y-6 py-5"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organisationName">
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="organisationName"
                    name="organisationName"
                    defaultValue={editOrg?.organisationName || editOrg?.name || ''}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="OrgEmail">
                    Contact Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="OrgEmail"
                    name="OrgEmail"
                    type="email"
                    defaultValue={editOrg?.OrgEmail || editOrg?.email || ''}
                    placeholder="hello@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editOrg?.description || ''}
                  placeholder="Brief description of your organization…"
                  rows={3}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    defaultValue={editOrg?.phoneNumber || ''}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editOrg?.address || ''}
                    placeholder="123 Business Rd, City, Country"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    defaultValue={editOrg?.websiteUrl || ''}
                    placeholder="https://www.company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    defaultValue={editOrg?.logoUrl || ''}
                    placeholder="https://company.com/logo.png"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 pt-5 sm:pt-6 border-t">
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
                <Button type="submit" disabled={registerOrg.isPending || updateOrg.isPending}>
                  {registerOrg.isPending || updateOrg.isPending
                    ? 'Saving…'
                    : editOrg?.id
                    ? 'Save Changes'
                    : 'Create Organization'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}