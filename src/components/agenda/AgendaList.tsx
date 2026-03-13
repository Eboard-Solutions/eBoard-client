import React from 'react';
import type { Agenda } from '@/types/api.types';
// import { Agenda } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
// import { format, formatDistanceToNow } from 'date-fns';
// import { useAgendaStats } from '@/hooks/api/useAgendas';
import { Skeleton } from '@/components/ui/skeleton';

interface AgendaListProps {
  agendas: Agenda[];
  onEdit: (agenda: Agenda) => void;
  onDelete: (agendaId: string) => void;
  loading?: boolean;
}

  const AgendaList: React.FC<AgendaListProps> = ({ agendas, onEdit, onDelete, loading }) => {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : agendas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No agendas found. Create your first agenda to get started.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Meeting</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agendas.map((agenda) => (
              <TableRow key={agenda.id}>
                <TableCell className="font-medium">{agenda.title}</TableCell>
                <TableCell>
                  <Badge variant={agenda.status === 'published' ? 'default' : 'secondary'}>
                    {agenda.status?.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{agenda.meetingId}</TableCell>
                <TableCell>{agenda.items?.length || 0}</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {agenda.createdAt ? new Date(agenda.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(agenda)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(agenda.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AgendaList;

