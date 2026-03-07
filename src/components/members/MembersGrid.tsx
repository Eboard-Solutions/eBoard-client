import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Mail, Phone, Shield } from 'lucide-react';

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

function getInitials(user: User) {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`;
  if (user.name) return user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  return user.email[0].toUpperCase();
}

const avatarColors = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function getAvatarColor(id: string) {
  const index = id.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
}

export default function MembersGrid({ members, onEdit, onDelete }: Props) {
  const role = (r: string) => roleConfig[r] ?? { label: r, className: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {members.map((user) => {
        const { label, className } = role(user.role);
        const gradientColor = getAvatarColor(user.id);

        return (
          <Card
            key={user.id}
            className="group relative overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all duration-200"
          >
            {/* Top accent bar */}
            <div className={`h-1 w-full bg-gradient-to-r ${gradientColor} opacity-70`} />

            <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <div className="relative mt-2">
                <Avatar className="h-20 w-20 ring-2 ring-background shadow-md">
                  <AvatarImage src={user.profilePictureUrl ?? user.avatar} alt={user.name} />
                  <AvatarFallback className={`bg-gradient-to-br ${gradientColor} text-white text-lg font-semibold`}>
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator placeholder */}
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-background" />
              </div>

              {/* Name & Role */}
              <div className="space-y-1.5 w-full">
                <h3 className="font-semibold text-foreground text-base leading-tight truncate">
                  {user.name}
                </h3>
                {(user.title || user.position) && (
                  <p className="text-xs text-muted-foreground truncate">{user.title ?? user.position}</p>
                )}
                <Badge variant="outline" className={`text-xs font-medium border ${className}`}>
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {label}
                </Badge>
              </div>

              {/* Contact info */}
              <div className="w-full space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{user.email}</span>
                </div>
                {(user.phoneNumber ?? user.phone) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span>{user.phoneNumber ?? user.phone}</span>
                  </div>
                )}
              </div>

              {/* Committees */}
              {(user.committees?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 justify-center w-full">
                  {user.committees!.slice(0, 3).map((c) => (
                    <Badge key={c} variant="outline" className="text-xs px-2 py-0 h-5 border-dashed">
                      {c}
                    </Badge>
                  ))}
                  {user.committees!.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-muted-foreground">
                      +{user.committees!.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              {(onEdit || onDelete) && (
                <div className="flex gap-2 w-full pt-3 border-t border-border/60">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                      onClick={() => onEdit(user)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5 hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive transition-colors"
                      onClick={() => onDelete(user.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}