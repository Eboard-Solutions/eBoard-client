'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Search, Grid3X3, List, Users, Building2,
  UserPlus, Send, RefreshCcw, Filter, X,
} from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { usePermissions } from '@/lib/permissions';
import { useMyOrganisation } from '@/hooks/api/useOrganisations';
import {
  useOrganisationUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
} from '@/hooks/api/useUsers';
import type { User as ApiUser } from '@/types/api.types';

import AddMemberDialog,  { type AddMemberFormData }  from '@/components/members/AddMemberDialog';
import InviteDialog,     { type InviteFormData }      from '@/components/members/InviteDialog';
import EditMemberDialog, { type EditMemberFormData }  from '@/components/members/EditMemberDialog';
import MembersGrid from '@/components/members/MembersGrid';
import MembersList from '@/components/members/MembersList';
import type { DisplayUser } from '@/components/members/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely unwrap the backend ResponseObject into a plain User array.
 *
 * The backend always returns:
 *   { statusCode, message, data: User[], pageInfo?: {...} }
 *
 * Previous code checked for `.items` which never exists — so members
 * were always an empty array even when the fetch succeeded.
 */
function extractUsers(raw: unknown): ApiUser[] {
  if (!raw) return [];

  // Already a plain array (shouldn't happen with this backend, but safe)
  if (Array.isArray(raw)) return raw as ApiUser[];

  const obj = raw as Record<string, unknown>;

  // Standard ResponseObject shape: { data: User[] }
  if (Array.isArray(obj.data)) return obj.data as ApiUser[];

  // Fallback shapes just in case
  if (Array.isArray(obj.users))   return obj.users   as ApiUser[];
  if (Array.isArray(obj.members)) return obj.members as ApiUser[];
  if (Array.isArray(obj.items))   return obj.items   as ApiUser[];

  return [];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accentClass, icon: Icon }: {
  label: string; value: number; sub?: string; accentClass: string;
  icon?: React.ElementType;
}) {
  // Resolve the matching foreground tint from the bg-*-500 accent so the
  // icon container and number share a single colour identity.
  const tintBg = accentClass.replace('-500', '-50') + ' dark:' + accentClass.replace('bg-', 'bg-') + '/15';
  const tintFg = accentClass.replace('bg-', 'text-');
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-border transition-all duration-200 overflow-hidden">
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full ${accentClass} opacity-[0.08] group-hover:opacity-[0.14] transition-opacity translate-x-8 -translate-y-8 pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black tabular-nums tracking-tight leading-none">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-2 font-medium">{sub}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tintBg} ${tintFg} ring-1 ring-inset ring-white/40 dark:ring-white/5`}>
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm overflow-hidden">
      <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-muted/60 opacity-60 translate-x-6 -translate-y-6 pointer-events-none" />
      <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
      <div className="mt-2 h-8 w-16 rounded-lg bg-muted/70 animate-pulse" />
      <div className="mt-2 h-3 w-24 rounded bg-muted/60 animate-pulse" />
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
    user,
    refresh: refreshAuth,
  } = usePermissions();

  const queryClient = useQueryClient();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search,           setSearch]           = useState('');
  const [roleFilter,       setRoleFilter]       = useState('all');
  const [viewMode,         setViewMode]         = useState<ViewMode>('grid');
  const [showAddDialog,    setShowAddDialog]    = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editTarget,       setEditTarget]       = useState<DisplayUser | null>(null);
  const [deleteTargetId,   setDeleteTargetId]   = useState<string | null>(null);

  // ── Fetch org for orgCode and name only ───────────────────────────────────
  const {
    data: myOrg,
    isLoading: orgLoading,
  } = useMyOrganisation(!authLoading && !!user && isOrgAdmin);

  const organisationId: string | null = currentorganisationId ?? myOrg?.organisationId ?? null;
  const orgCode:        string | null = myOrg?.orgCode ?? null;
  const orgName:        string | null = myOrg?.organisationName ?? null;

  // ── Permissions ───────────────────────────────────────────────────────────
  const canManage = isSuperAdmin || isOrgAdmin;
  const canUpdate = canManage;
  const canDelete = canManage;

  const needsOrgSetup = !!user && !authLoading && !orgLoading && !organisationId && !myOrg;

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    data: membersRaw,
    isLoading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
    isFetching: membersFetching,
  } = useOrganisationUsers(canManage && !!user && !authLoading);
  const createUser = useCreateUser();
  const updateUser      = useUpdateUser();
  const toggleStatus    = useToggleUserStatus();
  const deleteUser      = useDeleteUser();

  // ── Transform → DisplayUser ───────────────────────────────────────────────
  // FIX: use extractUsers() to correctly unwrap { data: User[] } from the
  // ResponseObject. The old code checked for `.items` which doesn't exist
  // in the backend response, so members was always an empty array.
  const allMembers = useMemo<DisplayUser[]>(() => {
    const items = extractUsers(membersRaw);

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
      isActive:  u.isActive ?? u.status === 'ACTIVE' ?? true,
    }));
  }, [membersRaw]);

  // ── Filtered ──────────────────────────────────────────────────────────────
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
    board:  allMembers.filter(m => m.role === 'BOARD_MEMBER' || m.role === 'BoardMember').length,
    admins: allMembers.filter(m => m.role === 'ORG_ADMIN' || m.role === 'OrgAdmin' || m.role === 'Admin').length,
    active: allMembers.filter(m => m.isActive).length,
  }), [allMembers]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddSubmit = useCallback((data: AddMemberFormData) => {
    // OPTIMISTIC UX: close the dialog and show a loading toast the moment
    // the request leaves. If a temp password was set we surface it in the
    // success toast with a one-click Copy action so the admin can share it
    // with the new member without having to remember what they typed.
    setShowAddDialog(false);
    const pendingToast = toast.loading('Adding member…');
    const tempPassword = data.password;

    createUser.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });

        if (tempPassword) {
          // Long-duration toast with a Copy action — keeps the password
          // visible while the admin tabs to their chat tool to share it.
          toast.success(`${data.firstName} ${data.lastName} added`, {
            id: pendingToast,
            duration: 30_000, // 30s — give the admin time to copy/share
            description: `Temporary password: ${tempPassword}  ·  They must change it on first login.`,
            action: {
              label: 'Copy password',
              onClick: () => {
                navigator.clipboard.writeText(tempPassword)
                  .then(() => toast.success('Password copied to clipboard'))
                  .catch(() => toast.error('Could not access clipboard'));
              },
            },
          });
        } else {
          toast.success('Member added', {
            id: pendingToast,
            description: 'They will receive their activation email shortly. Use Invite to resend if needed.',
          });
        }
      },
      onError: (err) => {
        // The service attached situation-specific copy to err.message
        // (409 → "already a member", 403 → "org not active", timeout, etc.).
        const status = (err as { response?: { status?: number } })?.response?.status;
        const message = err instanceof Error ? err.message : 'Failed to add member';

        if (status === 409) {
          toast.info('Already a member', { id: pendingToast, description: message, duration: 6000 });
        } else {
          toast.error('Could not add member', { id: pendingToast, description: message });
          // Re-open the dialog so the admin doesn't lose their context.
          setShowAddDialog(true);
        }
      },
    });
  }, [createUser, queryClient]);

  const handleInviteSubmit = useCallback((data: InviteFormData) => {
    console.info('[Invite] payload:', data);
    const count = data.emails.length;
    toast.success(
      `Invitation${count > 1 ? 's' : ''} sent to ${count} recipient${count > 1 ? 's' : ''}`,
      {
        description: orgCode
          ? `They'll need organisation code: ${orgCode}`
          : 'Check your email integration.',
      },
    );
    setShowInviteDialog(false);
  }, [orgCode]);

  const handleEditSubmit = useCallback((userId: string, data: EditMemberFormData) => {
    // Close immediately, show optimistic loading toast — feels instant.
    setEditTarget(null);
    const pendingToast = toast.loading('Saving changes…');
    updateUser.mutate({ userId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Member updated', { id: pendingToast });
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to update member', { id: pendingToast });
      },
    });
  }, [updateUser, queryClient]);

  // FIX: updateUser's UpdateUserDto does not include isActive.
  // The backend exposes a dedicated PATCH /:userId/toggle-status endpoint
  // that accepts { isActive: boolean }. Use useToggleUserStatus for this.
  const handleToggleActive = useCallback((member: DisplayUser) => {
    const verb = member.isActive ? 'Deactivating' : 'Activating';
    const past = member.isActive ? 'deactivated' : 'activated';
    const pendingToast = toast.loading(`${verb} ${member.name.split(' ')[0]}…`);
    toggleStatus.mutate(
      { userId: member.id, isActive: !member.isActive },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          toast.success(`Member ${past}`, { id: pendingToast });
        },
        onError: (err) => toast.error(
          err instanceof Error ? err.message : 'Failed to update status',
          { id: pendingToast },
        ),
      },
    );
  }, [toggleStatus, queryClient]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    // Close the dialog immediately so the user gets visual confirmation.
    const id = deleteTargetId;
    setDeleteTargetId(null);
    const pendingToast = toast.loading('Removing member…');
    deleteUser.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('Member removed', { id: pendingToast });
      },
      onError: (err) => toast.error(
        err instanceof Error ? err.message : 'Failed to remove member',
        { id: pendingToast },
      ),
    });
  }, [deleteTargetId, deleteUser, queryClient]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading members…</p>
        </div>
      </div>
    );
  }

  // ── Hard auth failure ─────────────────────────────────────────────────────
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
      // Match the dashboard: no container/max-width — let the AppLayout's
      // p-6 wrapper do the work, so the page expands to fill the available
      // space next to the sidebar instead of leaving whitespace on wide screens.
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage members for your organisation</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Organisation setup required</p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                Create your organisation first before managing members.
              </p>
              <Button variant="outline" size="sm"
                className="mt-3 h-7 text-xs border-amber-400 hover:bg-amber-100" asChild>
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

  if (!canManage && user) {
    return (
      <div className="pb-10">
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have permission to view the member directory.
          </p>
        </div>
      </div>
    );
  }

  // Only show a full-page error when we have NO data to display.
  // If a previous successful fetch is still in cache (placeholderData), the
  // page renders normally and a toast / inline notice can surface the issue.
  if (membersError && !membersRaw) {
    const err    = membersError as { code?: string; response?: { status?: number; data?: { message?: string } }; message?: string };
    const status = err?.response?.status;
    const isTimeout = err?.code === 'ECONNABORTED';
    const isNetwork = !isTimeout && !status;            // axios "Network Error" (no response)

    // Friendly, situation-specific copy. "Timeout" / "ECONNABORTED" leaks
    // are no longer visible to end users — they'd only ever see this when
    // there's truly nothing to show.
    const { title, body } = (() => {
      if (isTimeout) return {
        title: "The server is taking too long to respond",
        body:  "We couldn't load the member directory in time. Please try again — your data is safe.",
      };
      if (isNetwork) return {
        title: "Couldn't reach the server",
        body:  "Check your internet connection and try again.",
      };
      if (status === 404) return {
        title: "No members found",
        body:  "Your organisation doesn't have any members yet.",
      };
      if (status === 403) return {
        title: "You don't have permission to view members",
        body:  "Ask an admin to grant you access to the directory.",
      };
      if (status && status >= 500) return {
        title: "Something went wrong on the server",
        body:  err?.response?.data?.message ?? "Please try again in a moment.",
      };
      return {
        title: "Unable to load members",
        body:  err?.response?.data?.message ?? err?.message ?? "An unexpected error occurred.",
      };
    })();

    return (
      <div className="pb-10">
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{body}</p>
          <div className="mt-5 flex gap-2 justify-center">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => refetchMembers()}
              disabled={membersFetching}>
              <RefreshCcw className={`h-3.5 w-3.5 ${membersFetching ? 'animate-spin' : ''}`} />
              {membersFetching ? 'Retrying…' : 'Try again'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Subtitle ──────────────────────────────────────────────────────────────
  const subtitle = isSuperAdmin
    ? 'Full administrative control across all organisations'
    : canManage
    ? `Manage${orgName ? ` ${orgName}'s` : " your organisation's"} members and access`
    : 'View the member directory';

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    // Full-bleed inside the AppLayout's p-6 — same pattern as the Dashboard
    // and Organisation pages. No container/max-w-7xl cap, so the grid uses
    // every pixel between the sidebar and the right edge.
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
            <Users className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2.25} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight leading-tight">Members</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-9 gap-2"
              onClick={() => setShowInviteDialog(true)}>
              <Send className="h-3.5 w-3.5" />Invite
            </Button>
            <Button size="sm"
              className="h-9 gap-2 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/25 ring-1 ring-inset ring-white/10"
              onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-3.5 w-3.5" />Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {membersLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : allMembers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={stats.total}  icon={Users}        accentClass="bg-blue-500"    sub={`${stats.active} active`} />
          <StatCard label="Board Members" value={stats.board}  icon={UserPlus}     accentClass="bg-emerald-500" />
          <StatCard label="Admins"        value={stats.admins} icon={Building2}    accentClass="bg-violet-500"  />
          <StatCard label="Active"        value={stats.active} icon={Send}         accentClass="bg-amber-500"
            sub={stats.total - stats.active > 0 ? `${stats.total - stats.active} inactive` : 'all members active'}
          />
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-44 text-sm shrink-0">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
            <SelectItem value="BOARD_MEMBER">Board Member</SelectItem>
            <SelectItem value="SECRETARY">Secretary</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/50 p-1 shrink-0">
          {(['grid', 'list'] as const).map(mode => (
            <button key={mode} type="button" title={`${mode} view`}
              onClick={() => setViewMode(mode)}
              className={`flex items-center justify-center h-7 w-7 rounded-md transition-all ${
                viewMode === mode
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'grid' ? <Grid3X3 className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>

        {(search || roleFilter !== 'all') && (
          <button type="button" onClick={() => { setSearch(''); setRoleFilter('all'); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 transition-colors">
            <X className="h-3 w-3" />Clear
          </button>
        )}
      </div>

      {!membersLoading && (search || roleFilter !== 'all') && (
        <p className="text-xs text-muted-foreground -mt-2">
          {members.length} of {allMembers.length} members
        </p>
      )}

      {membersLoading && (
        <p className="text-xs text-muted-foreground -mt-2">
          Loading member data…
        </p>
      )}

      {/* Content */}
      {membersLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
                <div className="h-14 w-14 rounded-full bg-muted/60 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted/60 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted/60 animate-pulse rounded w-1/2" />
                  <div className="h-5 bg-muted/60 animate-pulse rounded-full w-24" />
                </div>
                <div className="pt-4 border-t border-border/40">
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
              ? 'Try adjusting your search or filter.'
              : canManage
              ? 'Add your first team member or send invitations to get started.'
              : 'No members have been added yet.'}
          </p>
          {canManage && !search && roleFilter === 'all' && (
            <div className="flex gap-3 justify-center mt-5">
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => setShowInviteDialog(true)}>
                <Send className="h-3.5 w-3.5" />Invite Members
              </Button>
              <Button size="sm" className="gap-2"
                onClick={() => setShowAddDialog(true)}>
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

      {/* ── Dialogs ── */}

      <Dialog open={showAddDialog} onOpenChange={open => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <AddMemberDialog
            onSubmit={handleAddSubmit}
            onCancel={() => setShowAddDialog(false)}
            isLoading={createUser.isPending}
            allowSuperAdminRole={isSuperAdmin}
            orgName={orgName ?? undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={open => { if (!open) setShowInviteDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <InviteDialog
            onSubmit={handleInviteSubmit}
            onCancel={() => setShowInviteDialog(false)}
            canAssignSuperAdmin={isSuperAdmin}
            orgCode={orgCode ?? undefined}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
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

      <AlertDialog open={!!deleteTargetId}
        onOpenChange={open => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the member from your organisation.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteUser.isPending}>
              {deleteUser.isPending ? 'Removing…' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}