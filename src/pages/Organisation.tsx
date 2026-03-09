'use client';

import {
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  FileText,
  Settings,
  Shield,
  Edit3,
  Save,
  X,
  Upload,
  Camera,
  Search,
  Trash2,
  Download,
  Send,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Phone,
  Mail,
  MapPin,
  Link2,
  Hash,
  Calendar,
  Lock,
  Key,
  Monitor,
  LogOut,
  Bell,
  RefreshCcw,
  ShieldCheck,
  Activity,
  MoreHorizontal,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { usePermissions } from '@/lib/permissions';
import { useOrganisations, useUpdateOrganisation } from '@/hooks/api/useOrganisations';
import {
  useOrganisationUsers,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/api/useUsers';
import type { Organisation, User as ApiUser } from '@/types/api.types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrgDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  category: 'policy' | 'meeting' | 'report' | 'other';
}

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginHistoryEntry {
  id: string;
  event: string;
  device: string;
  ip: string;
  time: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  OrgAdmin:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  Admin:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  BoardMember: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  User:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

const DOC_CATEGORY_COLORS: Record<string, string> = {
  policy:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  meeting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  report:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  other:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const MEMBER_ROLES = ['OrgAdmin', 'Admin', 'BoardMember', 'User'] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_DOCS: OrgDocument[] = [
  {
    id: '1',
    name: 'Board Charter 2024.pdf',
    type: 'PDF',
    size: '2.4 MB',
    uploadedBy: 'Alice Kim',
    uploadedAt: '2024-03-01',
    url: '#',
    category: 'policy',
  },
  {
    id: '2',
    name: 'Q1 Meeting Minutes.docx',
    type: 'DOCX',
    size: '340 KB',
    uploadedBy: 'Bob Chen',
    uploadedAt: '2024-04-10',
    url: '#',
    category: 'meeting',
  },
  {
    id: '3',
    name: 'Annual Report 2023.pdf',
    type: 'PDF',
    size: '8.1 MB',
    uploadedBy: 'Alice Kim',
    uploadedAt: '2024-02-15',
    url: '#',
    category: 'report',
  },
  {
    id: '4',
    name: 'Privacy Policy.pdf',
    type: 'PDF',
    size: '1.2 MB',
    uploadedBy: 'Carol Diaz',
    uploadedAt: '2024-01-20',
    url: '#',
    category: 'policy',
  },
];

const MOCK_SESSIONS: LoginSession[] = [
  {
    id: '1',
    device: 'Chrome on macOS',
    location: 'Nairobi, KE',
    ip: '197.232.10.4',
    lastActive: '2 minutes ago',
    isCurrent: true,
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'Nairobi, KE',
    ip: '197.232.10.5',
    lastActive: '3 hours ago',
    isCurrent: false,
  },
  {
    id: '3',
    device: 'Firefox on Windows',
    location: 'Mombasa, KE',
    ip: '41.89.12.7',
    lastActive: '2 days ago',
    isCurrent: false,
  },
];

const MOCK_LOGIN_HISTORY: LoginHistoryEntry[] = [
  {
    id: '1',
    event: 'Successful login',
    device: 'Chrome on macOS',
    ip: '197.232.10.4',
    time: '2025-03-09 08:12',
  },
  {
    id: '2',
    event: 'Successful login',
    device: 'Safari on iPhone',
    ip: '197.232.10.5',
    time: '2025-03-08 17:45',
  },
  {
    id: '3',
    event: 'Failed login attempt',
    device: 'Unknown',
    ip: '45.33.32.156',
    time: '2025-03-07 03:22',
  },
  {
    id: '4',
    event: 'Password changed',
    device: 'Chrome on macOS',
    ip: '197.232.10.4',
    time: '2025-03-06 14:01',
  },
];

// ─── Shared Small Components ────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function FieldRow({ label, icon: Icon, children }: FieldRowProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-1.5 text-foreground/80">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? 'h-3.5 w-3.5'}`}
    />
  );
}

// ─── Profile Tab ────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  org: Organisation;
  onSave: (data: Partial<Organisation>) => void;
  isSaving: boolean;
}

function ProfileTab({ org, onSave, isSaving }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Organisation>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const current: Partial<Organisation> = { ...org, ...form };

  function fieldProps(key: keyof Organisation) {
    return {
      value: (form[key] as string) ?? (org[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
      disabled: !editing,
    };
  }

  function handleSave() {
    onSave(form);
    setEditing(false);
    setForm({});
  }

  function handleCancel() {
    setEditing(false);
    setForm({});
  }

  const createdAtLabel = org.createdAt
    ? new Date(org.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const systemInfo = [
    { label: 'Organisation ID', value: org.organisationId ?? '—' },
    { label: 'Status', value: org.status ?? 'PENDING' },
    { label: 'Approved By', value: org.approvedBy ?? 'Not yet approved' },
    {
      label: 'Approved At',
      value: org.approvedAt ? new Date(org.approvedAt).toLocaleDateString() : '—',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Identity Banner */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-indigo-600/20 via-blue-500/15 to-violet-500/20 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_60%)]" />
        </div>
        <CardContent className="pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-10">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-lg">
                {current.logoUrl ? (
                  <img
                    src={current.logoUrl}
                    alt="Organisation logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40">
                    <Building2 className="h-9 w-9 text-indigo-400" />
                  </div>
                )}
              </div>
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors"
                    aria-label="Upload logo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                  />
                </>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-foreground truncate">
                {current.organisationName ?? 'Organisation Name'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {org.orgCode && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    {org.orgCode}
                  </span>
                )}
                <StatusBadge isActive={org.isActive ?? false} />
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Created {createdAtLabel}
                </span>
              </div>
            </div>

            {/* Edit actions */}
            <div className="shrink-0 flex gap-2 pb-1">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8 gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 gap-1.5"
                  >
                    {isSaving ? <Spinner /> : <Save className="h-3.5 w-3.5" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="h-8 gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow label="Organisation Name" icon={Building2}>
              <Input
                {...fieldProps('organisationName')}
                placeholder="Acme Corp"
                className="h-9 text-sm"
              />
            </FieldRow>
            <FieldRow label="Organisation Code" icon={Hash}>
              <Input
                value={org.orgCode ?? ''}
                disabled
                placeholder="ORG-001"
                className="h-9 text-sm bg-muted/40"
                readOnly
              />
            </FieldRow>
            <FieldRow label="Description" icon={FileText}>
              <Textarea
                value={(form.description as string) ?? (org.description as string) ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                disabled={!editing}
                placeholder="Brief description…"
                rows={3}
                className="resize-none text-sm"
              />
            </FieldRow>
            <FieldRow label="Website" icon={Globe}>
              <Input
                {...fieldProps('websiteUrl')}
                placeholder="https://company.com"
                className="h-9 text-sm"
              />
            </FieldRow>
            <FieldRow label="Logo URL" icon={Link2}>
              <Input
                {...fieldProps('logoUrl')}
                placeholder="https://company.com/logo.png"
                className="h-9 text-sm"
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow label="Contact Email" icon={Mail}>
              <Input
                {...fieldProps('OrgEmail')}
                type="email"
                placeholder="hello@company.com"
                className="h-9 text-sm"
              />
            </FieldRow>
            <FieldRow label="Phone Number" icon={Phone}>
              <Input
                {...fieldProps('phoneNumber')}
                placeholder="+254 700 000 000"
                className="h-9 text-sm"
              />
            </FieldRow>
            <FieldRow label="Address" icon={MapPin}>
              <Input
                {...fieldProps('address')}
                placeholder="123 Main St, City, Country"
                className="h-9 text-sm"
              />
            </FieldRow>
            <Separator />
            <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                System Info
              </p>
              {systemInfo.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-medium text-foreground truncate max-w-[160px]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Members Tab ────────────────────────────────────────────────────────────────

interface OrgMembersTabProps {
  canManage: boolean;
}

function OrgMembersTab({ canManage }: OrgMembersTabProps) {
  const { data: membersRaw, isLoading } = useOrganisationUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const members = useMemo<ApiUser[]>(() => {
    const items: ApiUser[] = Array.isArray(membersRaw)
      ? membersRaw
      : (membersRaw as { items?: ApiUser[] } | undefined)?.items ?? [];

    return items.filter((u) => {
      const matchSearch = !search.trim()
        ? true
        : `${u.firstName ?? ''} ${u.lastName ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase());

      const matchRole = roleFilter === 'all' ? true : u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [membersRaw, search, roleFilter]);

  function handleRoleChange(userId: string, newRole: string) {
    updateUser.mutate(
      { userId, data: { role: newRole } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users', 'organisation-users'] });
          toast.success('Role updated');
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to update role'),
      }
    );
  }

  function handleToggleActive(user: ApiUser) {
    updateUser.mutate(
      { userId: user.id, data: { isActive: !user.isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users', 'organisation-users'] });
          toast.success(user.isActive ? 'Member deactivated' : 'Member activated');
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Failed to update member'),
      }
    );
  }

  function handleDelete() {
    if (!memberToDelete) return;
    deleteUser.mutate(memberToDelete, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users', 'organisation-users'] });
        toast.success('Member removed');
        setMemberToDelete(null);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to remove member'),
    });
  }

  const colSpan = canManage ? 5 : 4;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-36 text-sm shrink-0">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {MEMBER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button
            size="sm"
            className="h-9 gap-2 shrink-0"
            onClick={() => setShowInvite(true)}
          >
            <Send className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="pl-5 py-3 font-semibold text-foreground">Member</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Email</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Role</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Status</TableHead>
              {canManage && (
                <TableHead className="w-14 pr-5 text-right py-3 font-semibold text-foreground">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: colSpan }).map((_, j) => (
                    <TableCell key={j} className="py-4">
                      <div className="h-4 animate-pulse rounded bg-muted/60 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {search || roleFilter !== 'all'
                    ? 'No matching members.'
                    : 'No members in this organisation yet.'}
                </TableCell>
              </TableRow>
            ) : (
              members.map((user) => {
                const displayName =
                  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—';
                const initials =
                  `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() ||
                  'U';
                const roleClass = ROLE_COLORS[user.role] ?? ROLE_COLORS['User'];

                return (
                  <TableRow
                    key={user.id}
                    className="group border-b border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="pl-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={user.profilePictureUrl} />
                          <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">
                          {displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${roleClass}`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell className="pr-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {MEMBER_ROLES.map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={user.role === role}
                                onClick={() => handleRoleChange(user.id, role)}
                              >
                                Assign as {role}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                              {user.isActive ? (
                                <>
                                  <UserMinus className="h-3.5 w-3.5 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3.5 w-3.5 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setMemberToDelete(user.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new member to this organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email Address</Label>
              <Input type="email" placeholder="member@company.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Role</Label>
              <Select defaultValue="BoardMember">
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                toast.success('Invitation sent');
                setShowInvite(false);
              }}
            >
              <Send className="h-4 w-4" />
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={() => setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the member from the organisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Documents Tab ──────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  canManage: boolean;
}

function DocumentsTab({ canManage }: DocumentsTabProps) {
  const [docs, setDocs] = useState<OrgDocument[]>(MOCK_DOCS);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        const matchCat = catFilter === 'all' || d.category === catFilter;
        const matchSearch =
          !search.trim() || d.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      }),
    [docs, search, catFilter]
  );

  const docStats = [
    { label: 'Total', value: docs.length, color: 'text-foreground' },
    {
      label: 'Policies',
      value: docs.filter((d) => d.category === 'policy').length,
      color: 'text-blue-600',
    },
    {
      label: 'Meeting Files',
      value: docs.filter((d) => d.category === 'meeting').length,
      color: 'text-amber-600',
    },
    {
      label: 'Reports',
      value: docs.filter((d) => d.category === 'report').length,
      color: 'text-emerald-600',
    },
  ];

  function handleDeleteDoc() {
    if (!docToDelete) return;
    setDocs((prev) => prev.filter((d) => d.id !== docToDelete));
    toast.success('Document deleted');
    setDocToDelete(null);
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-36 text-sm shrink-0">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="policy">Policy</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button
            size="sm"
            className="h-9 gap-2 shrink-0"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {docStats.map(({ label, value, color }) => (
          <Card key={label} className="border border-border/60 shadow-sm">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="pl-5 py-3 font-semibold text-foreground">Document</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Category</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Size</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Uploaded By</TableHead>
              <TableHead className="py-3 font-semibold text-foreground">Date</TableHead>
              <TableHead className="w-20 pr-5 text-right py-3 font-semibold text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="group border-b border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="pl-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/50">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground max-w-[220px] truncate">
                        {doc.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        DOC_CATEGORY_COLORS[doc.category]
                      }`}
                    >
                      {doc.category}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-muted-foreground">
                    {doc.size}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-muted-foreground">
                    {doc.uploadedBy}
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-muted-foreground">
                    {doc.uploadedAt}
                  </TableCell>
                  <TableCell className="pr-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                        asChild
                      >
                        <a href={doc.url} download>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDocToDelete(doc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a file to the organisation document library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              className="border-2 border-dashed border-border/70 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Click to select file</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX up to 20 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.pptx"
                className="hidden"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <Select defaultValue="other">
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Document uploaded');
                setShowUpload(false);
              }}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This document will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteDoc}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────────────────────────

interface SettingsTabProps {
  canManage: boolean;
}

const NOTIFICATION_SETTINGS = [
  {
    label: 'Meeting reminders',
    description: 'Send reminders before scheduled meetings',
    defaultChecked: true,
  },
  {
    label: 'New member joined',
    description: 'Notify admins when someone joins the org',
    defaultChecked: true,
  },
  {
    label: 'Document uploads',
    description: 'Alert members when new documents are added',
    defaultChecked: false,
  },
  {
    label: 'Task assignments',
    description: 'Notify users when tasks are assigned to them',
    defaultChecked: true,
  },
  {
    label: 'Voting opens',
    description: 'Notify members when a new vote is created',
    defaultChecked: true,
  },
] as const;

function SettingsTab({ canManage }: SettingsTabProps) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    toast.success('Settings saved');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Meeting Defaults */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Meeting Defaults</CardTitle>
          <CardDescription className="text-xs">
            Default settings applied to all new meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default Duration</Label>
              <Select defaultValue="60" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default Reminder</Label>
              <Select defaultValue="24h" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="3h">3 hours before</SelectItem>
                  <SelectItem value="24h">24 hours before</SelectItem>
                  <SelectItem value="48h">48 hours before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localisation */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Localisation</CardTitle>
          <CardDescription className="text-xs">
            Timezone and language preferences for the organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Select defaultValue="Africa/Nairobi" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT +3)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Language</Label>
              <Select defaultValue="en" disabled={!canManage}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
          <CardDescription className="text-xs">
            Control which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {NOTIFICATION_SETTINGS.map(({ label, description, defaultChecked }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-2.5 border-b border-border/40 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <Switch defaultChecked={defaultChecked} disabled={!canManage} />
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" className="h-9 gap-2 min-w-32" onClick={handleSave}>
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Security Tab ───────────────────────────────────────────────────────────────

interface SecurityTabProps {
  canManage: boolean;
}

const SECURITY_POLICIES = [
  {
    label: 'Enforce Two-Factor Authentication',
    description: 'Require all members to use 2FA when signing in',
    defaultChecked: false,
    icon: Shield,
  },
  {
    label: 'Strong Password Policy',
    description: 'Require passwords to be at least 12 characters with mixed complexity',
    defaultChecked: true,
    icon: Key,
  },
  {
    label: 'Security Alerts',
    description: 'Email admins when suspicious activity is detected',
    defaultChecked: true,
    icon: Bell,
  },
  {
    label: 'Single Session Enforcement',
    description: 'Prevent members from being logged in on multiple devices simultaneously',
    defaultChecked: false,
    icon: Monitor,
  },
] as const;

function SecurityTab({ canManage }: SecurityTabProps) {
  const [sessions, setSessions] = useState<LoginSession[]>(MOCK_SESSIONS);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  function revokeAllOthers() {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.success('All other sessions revoked');
  }

  function revokeSession() {
    if (!revokeId) return;
    setSessions((prev) => prev.filter((s) => s.id !== revokeId));
    toast.success('Session revoked');
    setRevokeId(null);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Security Policies */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Security Policies
          </CardTitle>
          <CardDescription className="text-xs">
            Organisation-wide security enforcement settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {SECURITY_POLICIES.map(({ label, description, defaultChecked, icon: Icon }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                  <Icon className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <Switch
                defaultChecked={defaultChecked}
                disabled={!canManage}
                className="shrink-0 mt-0.5"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4 text-emerald-500" />
                Active Sessions
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Devices currently logged into the organisation portal
              </CardDescription>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={revokeAllOthers}
              >
                <LogOut className="h-3 w-3" />
                Revoke All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sess.device}
                    </p>
                    {sess.isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sess.location} · {sess.ip} · {sess.lastActive}
                  </p>
                </div>
              </div>
              {!sess.isCurrent && canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setRevokeId(sess.id)}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            Login History
          </CardTitle>
          <CardDescription className="text-xs">
            Recent authentication events for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {MOCK_LOGIN_HISTORY.map((entry) => {
              const isSuccess = entry.event.startsWith('Successful');
              const isFail = entry.event.startsWith('Failed');

              const iconBg = isSuccess
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : isFail
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30';

              const icon = isSuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : isFail ? (
                <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              );

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{entry.event}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.device} · {entry.ip}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{entry.time}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revoke Session Confirm */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              This device will be signed out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={revokeSession}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tab Config ─────────────────────────────────────────────────────────────────

const TAB_CONFIG = [
  { value: 'profile',   label: 'Profile',   icon: Building2 },
  { value: 'members',   label: 'Members',   icon: Users     },
  { value: 'documents', label: 'Documents', icon: FileText  },
  { value: 'settings',  label: 'Settings',  icon: Settings  },
  { value: 'security',  label: 'Security',  icon: Shield    },
] as const;

type TabValue = (typeof TAB_CONFIG)[number]['value'];

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function OrganisationPage() {
  const {
    can,
    isSuperAdmin,
    isOrgAdmin,
    isLoading: authLoading,
    authError,
    refresh: refreshAuth,
  } = usePermissions();

  const queryClient = useQueryClient();
  const { data: orgsRaw, isLoading: orgsLoading } = useOrganisations();
  const updateOrg = useUpdateOrganisation();

  const [activeTab, setActiveTab] = useState<TabValue>('profile');

  const org = useMemo<Organisation | null>(() => {
    const items: Organisation[] = Array.isArray(orgsRaw)
      ? orgsRaw
      : (orgsRaw as { items?: Organisation[] } | undefined)?.items ?? [];
    return items[0] ?? null;
  }, [orgsRaw]);

  const canManage = isSuperAdmin || isOrgAdmin || can('org:manage');

  const handleSaveProfile = useCallback(
    (data: Partial<Organisation>) => {
      if (!org) return;
      updateOrg.mutate(
        { orgId: org.organisationId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organisations'] });
            toast.success('Organisation profile updated');
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Failed to save changes'),
        }
      );
    },
    [org, updateOrg, queryClient]
  );

  // ── Loading state ────────────────────────────────────────────────────────────
  if (authLoading || orgsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Spinner />
          Loading organisation…
        </div>
      </div>
    );
  }

  // ── Auth error ───────────────────────────────────────────────────────────────
  if (authError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Access Problem</h2>
          <p className="mt-2 max-w-md text-muted-foreground text-sm">{authError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshAuth}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button asChild>
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  // ── No org ───────────────────────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">No Organisation Found</h2>
          <p className="mt-2 max-w-md text-muted-foreground text-sm">
            You don't appear to be linked to an organisation yet.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto space-y-7 py-8 px-4 md:px-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Organisation</h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Manage your organisation's profile, members, documents, and security settings."
              : "View your organisation's details and member directory."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge isActive={org.isActive ?? false} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList className="h-10 p-1 bg-muted/50 border border-border/60 flex-wrap">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2 text-sm h-8 px-4">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab
            org={org}
            onSave={handleSaveProfile}
            isSaving={updateOrg.isPending}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <OrgMembersTab canManage={canManage} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab canManage={canManage} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab canManage={canManage} />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecurityTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}