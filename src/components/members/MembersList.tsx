import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Shield } from 'lucide-react';

interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  profilePictureUrl?: string;
  role: string;
  title?: string;
  position?: string;
  phoneNumber?: string;
  phone?: string;
  committees?: string[];
}

interface Props {
  members: User[];
  onEdit?: (member: User) => void;
  onDelete?: (id: string) => void;
}

const roleConfig: Record<string, { label: string; className: string }> = {
  SuperAdmin: { label: 'Super Admin', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  OrgAdmin: { label: 'Org Admin', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  Admin: { label: 'Admin', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  BoardMember: { label: 'Board Member', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  User: { label: 'User', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function getInitials(user: User) {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
  if (user.name) return user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  return user.email[0].toUpperCase();
}

function getAvatarGradient(id: string) {
  return avatarGradients[id.charCodeAt(0) % avatarGradients.length];
}

export default function MembersList({ members, onEdit, onDelete }: Props) {
  const getRole = (r: string) => roleConfig[r] ?? { label: r, className: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
            <TableHead className="font-semibold text-foreground pl-5 py-3.5">Member</TableHead>
            <TableHead className="font-semibold text-foreground py-3.5">Role</TableHead>
            <TableHead className="font-semibold text-foreground py-3.5">Title</TableHead>
            <TableHead className="font-semibold text-foreground py-3.5">Contact</TableHead>
            <TableHead className="font-semibold text-foreground py-3.5">Committees</TableHead>
            {(onEdit || onDelete) && (
              <TableHead className="font-semibold text-foreground text-right pr-5 py-3.5">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((user, idx) => {
            const { label, className } = getRole(user.role);
            const gradient = getAvatarGradient(user.id);
            const initials = getInitials(user);

            return (
              <TableRow
                key={user.id}
                className="border-b border-border/40 hover:bg-muted/30 transition-colors group"
              >
                {/* Member */}
                <TableCell className="pl-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                      <AvatarImage src={user.profilePictureUrl ?? user.avatar} />
                      <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-xs font-semibold`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Role */}
                <TableCell className="py-4">
                  <Badge variant="outline" className={`text-xs font-medium border ${className} gap-1`}>
                    <Shield className="h-2.5 w-2.5" />
                    {label}
                  </Badge>
                </TableCell>

                {/* Title */}
                <TableCell className="py-4">
                  <span className="text-sm text-muted-foreground">
                    {user.title ?? user.position ?? '—'}
                  </span>
                </TableCell>

                {/* Contact */}
                <TableCell className="py-4">
                  <span className="text-sm text-muted-foreground">
                    {user.phoneNumber ?? user.phone ?? '—'}
                  </span>
                </TableCell>

                {/* Committees */}
                <TableCell className="py-4">
                  {(user.committees?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.committees!.slice(0, 2).map((c) => (
                        <Badge key={c} variant="outline" className="text-xs px-1.5 py-0 h-5 border-dashed">
                          {c}
                        </Badge>
                      ))}
                      {user.committees!.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-muted-foreground">
                          +{user.committees!.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                {(onEdit || onDelete) && (
                  <TableCell className="pr-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => onEdit(user)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDelete(user.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}