// src/components/members/MembersGrid.tsx (Updated with actions)
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash } from 'lucide-react';

import type { User } from '@/pages/Members';

interface Props {
  members: User[];
  onEdit?: (member: User) => void;
  onDelete?: (id: string) => void;
}

export default function MembersGrid({ members, onEdit, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((user) => (
        <Card key={user.id} className="hover:shadow-lg transition-all">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.profilePictureUrl} alt={user.name} />
              <AvatarFallback>{user.firstName[0] + user.lastName[0]}</AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.title || '—'}</p>
              <Badge variant="secondary" className="mt-1">
                {user.role.replace('_', ' ')}
              </Badge>
            </div>

            <div className="w-full space-y-2 text-sm text-muted-foreground">
              <p>{user.email}</p>
              {user.phoneNumber && <p>{user.phoneNumber}</p>}
            </div>

            {user.committees?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {user.committees.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            )}

            <div className="flex gap-2 w-full pt-4 border-t">
              {onEdit && <Button variant="outline" className="flex-1" onClick={() => onEdit(user)}><Edit className="h-4 w-4 mr-2" /> Edit</Button>}
              {onDelete && <Button variant="destructive" className="flex-1" onClick={() => onDelete(user.id)}><Trash className="h-4 w-4 mr-2" /> Delete</Button>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}