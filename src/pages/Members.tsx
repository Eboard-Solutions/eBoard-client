'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Grid,
  List as ListIcon,
  Users,
  AlertTriangle,
  Building2,
  Edit,
  Trash2,
  Save,
  X,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

import type { User as ApiUser, Organisation, CreateOrganisationData } from '@/types/api.types';

import AddMemberDialog from '@/components/members/AddMemberDialog';
import EditMemberDialog from '@/components/members/EditMemberDialog';
import MembersGrid from '@/components/members/MembersGrid';
import MembersList from '@/components/members/MembersList';

type ViewMode = 'grid' | 'list';

// Local User type for members list compatibility
interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  role: string;
  position?: string;
  department?: string;
  phone?: string;
  [key: string]: unknown;
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
  const [editMember, setEditMember] = useState<User | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [editOrg, setEditOrg] = useState<Organisation | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // ── Members Query (using new hooks) ─────────────────────────────────────────────
  const { data: membersData, isLoading: membersLoading } = useOrganisationUsers();
  
  const members = useMemo(() => {
    const rawMembers: ApiUser[] = Array.isArray(membersData) 
      ? membersData 
      : (membersData as { items?: ApiUser[] })?.items || [];
    
    return rawMembers
      .filter((m: ApiUser) => {
        if (search.trim()) {
          const searchLower = search.toLowerCase();
          const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
          return name.includes(searchLower) || m.email?.toLowerCase().includes(searchLower);
        }
        return true;
      })
      .filter((m: ApiUser) => {
        if (roleFilter !== 'all') {
          return m.role?.toLowerCase() === roleFilter.toLowerCase();
        }
        return true;
      })
      .map((m: ApiUser): User => ({
        id: m.id,
        name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        avatar: m.profilePictureUrl,
        role: m.role,
        position: m.title,
        phone: m.phoneNumber,
      }));
  }, [membersData, search, roleFilter]);

  // ── Organizations Query (using new hooks) ───────────────────────────────────────
  const { data: orgsData, isLoading: orgsLoading } = useOrganisations();
  
  const organizations: Organisation[] = useMemo(() => {
    return Array.isArray(orgsData) 
      ? orgsData 
      : (orgsData as { items?: Organisation[] })?.items || [];
  }, [orgsData]);

  // ── Mutations (using new hooks) ─────────────────────────────────────────────────
  const registerOrgMutation = useRegisterOrganisation();
  const updateOrgMutation = useUpdateOrganisation();
  const deleteOrgMutation = useDeleteOrganisation();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Alias mutations for compatibility
  const createMemberMutation = createUserMutation;
  const updateMemberMutation = updateUserMutation;
  const deleteMemberMutation = deleteUserMutation;
  const createOrgMutation = registerOrgMutation;

  // ── Handlers ────────────────────────────────────────────────────────────────────
  const handleMemberDelete = useCallback(() => {
    if (memberToDelete) {
      deleteUserMutation.mutate(memberToDelete, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          toast.success('Member removed');
          setMemberToDelete(null);
        },
        onError: (err) => toast.error((err as Error).message || 'Failed to remove member'),
      });
    }
  }, [memberToDelete, deleteUserMutation, queryClient]);

  const handleOrgDelete = useCallback(() => {
    if (orgToDelete) {
      deleteOrgMutation.mutate(orgToDelete, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['organisations'] });
          localStorage.removeItem('currentOrganizationId');
          toast.success('Organization deleted');
          setOrgToDelete(null);
        },
        onError: (err) => toast.error((err as Error).message || 'Failed to delete organization'),
      });
    }
  }, [orgToDelete, deleteOrgMutation, queryClient]);

  const canInvite = useMemo(() => can('members:invite'), [can]);
  const canDeleteMember = useMemo(() => can('members:delete'), [can]);

  // Debug logging
  useEffect(() => {
    console.log('[MembersPage] currentOrgId:', currentOrgId);
    console.log('[MembersPage] isOrgAdmin:', isOrgAdmin);
  }, [currentOrgId, isOrgAdmin]);

  // ── Render ──────────────────────────────────────────────────────────────────────
  if (authLoading) return <div className="flex min-h-[60vh] items-center justify-center">Loading...</div>;

  if (authError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-semibold">Access Issue</h2>
        <p className="max-w-md text-muted-foreground">{authError}</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={refreshAuth}>Retry</Button>
          <Button asChild><a href="/auth/signin">Sign In</a></Button>
        </div>
      </div>
    );
  }

  const needsOrgSetup = isOrgAdmin && !currentOrgId;

  return (
    <div className="container mx-auto space-y-8 py-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members & Organizations</h1>
          <p className="text-muted-foreground mt-1.5">
            {isSuperAdmin ? 'Full admin control' : isOrgAdmin ? 'Manage your organization' : 'Limited view'}
          </p>

          {needsOrgSetup && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Organization setup required</p>
                  <p className="mt-1 text-amber-700">
                    Your organization was created during signup, but is not yet fully linked.  
                    Please complete the organization details to start managing members.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-400 hover:bg-amber-100"
                    onClick={() => setShowCreateOrg(true)}
                  >
                    Complete Organization Setup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'members' && canInvite && !needsOrgSetup && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <AddMemberDialog
                onSubmit={createMemberMutation.mutate}
                committees={[]}
                allowSuperAdminRole={isSuperAdmin}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="members" className="text-base">
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="organizations" className="text-base">
            <Building2 className="mr-2 h-4 w-4" />
            Organizations
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          {needsOrgSetup ? (
            <Card className="py-16 text-center border-dashed bg-amber-50/30">
              <CardContent className="space-y-6">
                <Building2 className="mx-auto h-16 w-16 text-amber-600" />
                <h3 className="text-2xl font-semibold text-amber-900">
                  Finish Setting Up Your Organization
                </h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  As a new OrgAdmin, your organization needs to be fully configured before you can add or view members.
                </p>
                <Button size="lg" onClick={() => setShowCreateOrg(true)}>
                  Set Up Organization Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filters */}
              <Card className="border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-65">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="OrgAdmin">OrgAdmin</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="BoardMember">Board Member</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 rounded-md border p-1 sm:ml-auto">
                      <Button
                        size="icon"
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        className="h-9 w-9"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        className="h-9 w-9"
                        onClick={() => setViewMode('list')}
                      >
                        <ListIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Members content */}
              {membersLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-72 animate-pulse rounded-xl bg-muted/70" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <Card className="py-16 text-center border-dashed">
                  <CardContent className="space-y-4">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="text-xl font-medium">No members found</h3>
                    <p className="text-muted-foreground">
                      {canInvite
                        ? 'Add your first member to get started'
                        : 'No members available in your organization yet'}
                    </p>
                  </CardContent>
                </Card>
              ) : viewMode === 'grid' ? (
                <MembersGrid
                  members={members}
                  onEdit={(member) => setEditMember(member as User)}
                  onDelete={canDeleteMember ? setMemberToDelete : undefined}
                />
              ) : (
                <MembersList
                  members={members}
                  onEdit={(member) => setEditMember(member as User)}
                  onDelete={canDeleteMember ? setMemberToDelete : undefined}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
            <Button onClick={() => setEditOrg({} as Organisation)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </div>

          {orgsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/70" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <Card className="py-16 text-center border-dashed">
              <CardContent className="space-y-4">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-medium">No organizations yet</h3>
                <p className="text-muted-foreground">Create your first organization</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org: Organisation) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        {org.organisationName || org.name || 'Unnamed'}
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
                        <Button variant="ghost" size="icon" onClick={() => setOrgToDelete(org.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* ── Dialogs ──────────────────────────────────────────────────────────────── */}

      {editMember && (
        <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
          <DialogContent className="sm:max-w-lg">
            <EditMemberDialog
              member={editMember}
              onSubmit={(data) => updateMemberMutation.mutate({ userId: editMember.id, data })}
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
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleMemberDelete}
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(editOrg || showCreateOrg) && (
        <Dialog
          open={!!editOrg || showCreateOrg}
          onOpenChange={() => {
            setEditOrg(null);
            setShowCreateOrg(false);
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">
                {editOrg?.id ? 'Edit Organization' : 'Create New Organization'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {editOrg?.id
                  ? 'Update the details of your organization.'
                  : 'Fill in the information below to set up your organization.'}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);

                // ── DEBUG: see exactly what is being sent ──
                console.log('[Organization Form] Raw FormData entries:', [...formData.entries()]);
                console.log('[Organization Form] As object:', data);
                console.log('[Organization Form] As JSON:', JSON.stringify(data, null, 2));

                if (editOrg?.id) {
                  updateOrgMutation.mutate({ orgId: editOrg.id, data });
                } else {
                  createOrgMutation.mutate(data as CreateOrganisationData);
                }
              }}
              className="space-y-6 py-4"
            >
              {/* Required fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="organisationName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organization Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="organisationName"
                    name="organisationName"
                    defaultValue={editOrg?.organisationName || editOrg?.name || ''}
                    placeholder="Acme Corporation"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="OrgEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="OrgEmail"
                    name="OrgEmail"
                    type="email"
                    defaultValue={editOrg?.OrgEmail || editOrg?.email || ''}
                    placeholder="contact@company.com"
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editOrg?.description || ''}
                  placeholder="Tell us about your organization..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    defaultValue={editOrg?.phoneNumber || ''}
                    placeholder="+1-800-555-1234"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editOrg?.address || ''}
                    placeholder="123 Business Ave, City, Country"
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website URL
                  </Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    defaultValue={editOrg?.websiteUrl || ''}
                    placeholder="https://www.company.com"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Logo URL
                  </Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    type="url"
                    defaultValue={editOrg?.logoUrl || ''}
                    placeholder="https://company.com/logo.png"
                    className="h-11"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOrg(null);
                    setShowCreateOrg(false);
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" className="gap-2 min-w-35">
                  <Save className="h-4 w-4" />
                  {editOrg?.id ? 'Save Changes' : 'Create Organization'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!orgToDelete} onOpenChange={() => setOrgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleOrgDelete}
              disabled={deleteOrgMutation.isPending}
            >
              {deleteOrgMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}