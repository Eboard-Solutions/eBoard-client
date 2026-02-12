// src/components/members/MembersList.tsx (Updated with actions, can be MembersTable)
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function MembersList({ members, onEdit, onDelete }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Committees</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profilePictureUrl} />
                <AvatarFallback>{user.firstName[0] + user.lastName[0]}</AvatarFallback>
              </Avatar>
              {user.name}
            </TableCell>
            <TableCell><Badge variant="secondary">{user.role.replace('_', ' ')}</Badge></TableCell>
            <TableCell>{user.title || '—'}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.phoneNumber || '—'}</TableCell>
            <TableCell>
              {user.committees?.map((c) => <Badge key={c} variant="outline" className="mr-1">{c}</Badge>)}
            </TableCell>
            <TableCell className="flex gap-2">
              {onEdit && <Button variant="ghost" size="icon" onClick={() => onEdit(user)}><Edit className="h-4 w-4" /></Button>}
              {onDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(user.id)}><Trash className="h-4 w-4" /></Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}