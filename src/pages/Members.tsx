'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
import { Search, Plus, Grid, List } from 'lucide-react';

import { usePermissions } from '@/lib/permissions';

import AddMemberDialog from '@/components/members/AddMemberDialog';
import EditMemberDialog from '@/components/members/EditMemberDialog';
import MembersGrid from '@/components/members/MembersGrid';
import MembersList from '@/components/members/MembersList';

import {
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  fetchCommittees,
} from '@/lib/api/members';

// ────────────────────────────────────────────────
// Types (unchanged)
// ────────────────────────────────────────────────
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  committees?: string[];
  organizationId?: string;     // ← make sure this exists
  hasOrganisation?: boolean;   // ← or hasOrganization — pick one name
}

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────
export default function Members() {
  const permissions = usePermissions();
  const { can, isSuperAdmin, isOrgAdmin, currentOrgId, isLoading, authError } = permissions;

  const queryClient = useQueryClient();

  // ── Early access decisions ───────────────────────────────────────
  if (isLoading) {
    return <div className="p-8 text-center">Loading permissions...</div>;
  }

  if (authError || !currentOrgId) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Access Issue</h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          {authError ? 'Authentication error. Please sign in again.' : 
           'No organization assigned. Please contact support.'}
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </div>
    );
  }

  if (!isSuperAdmin && !isOrgAdmin) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h2 className="text-2xl font-semibold">Access Restricted</h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          This page is only available to Super Administrators and Organization Administrators.
        </p>
        <Button variant="outline" className="mt-6" asChild>
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </div>
    );
  }

  // ── Allowed users reach this point ──────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const { data: committees = [] } = useQuery<string[]>({
    queryKey: ['committees'],
    queryFn: fetchCommittees,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ['members', searchQuery, roleFilter, currentOrgId],
    queryFn: () =>
      fetchMembers({
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        // You may want to pass organizationId if backend supports it
      }),
  });

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const updateMutation = useMutation({
    mutationFn: updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member updated');
      setEditOpen(false);
    },
    onError: () => toast.error('Failed to update member'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member removed');
      setDeleteConfirmOpen(false);
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const handleDeleteRequest = (id: string) => {
    setMemberToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (memberToDelete) deleteMutation.mutate(memberToDelete);
  };

  const handleEdit = (member: User) => {
    setSelectedMember(member);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin ? 'Manage users across organizations' : 'Manage users in your organization'}
          </p>
        </div>

        {can('members:invite') && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <AddMemberDialog
                onSubmit={(data) => createMutation.mutate(data)}
                committees={committees}
                showSuperAdminRole={isSuperAdmin}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, title..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {isSuperAdmin && <SelectItem value="super-admin">Super Admin</SelectItem>}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="board_member">Board Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 rounded-md border p-1 sm:ml-auto">
              <Button
                size="icon"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {membersLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No members found</p>
            <p className="mt-2">Try adjusting your search or role filter</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <MembersGrid
          members={members}
          onEdit={can('members:update') ? handleEdit : undefined}
          onDelete={can('members:delete') ? handleDeleteRequest : undefined}
        />
      ) : (
        <MembersList
          members={members}
          onEdit={can('members:update') ? handleEdit : undefined}
          onDelete={can('members:delete') ? handleDeleteRequest : undefined}
        />
      )}

      {/* Edit dialog */}
      {selectedMember && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <EditMemberDialog
              member={selectedMember}
              onSubmit={(data) => updateMutation.mutate({ id: selectedMember.id, ...data })}
              committees={committees}
              showSuperAdminRole={isSuperAdmin}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}