// src/pages/AgendasPage.tsx
//
// Lightweight list-of-all-agendas view. Not the primary page for /agendas
// (Agendas.tsx → AgendaManager handles per-meeting editing) but kept here
// because the route is still imported in a few places and a working list
// view is genuinely useful for an "all agendas across all statuses" overview.
//
// Bugs fixed:
//   1. agendasData?.items → agendasData?.data
//      (ResponseObject is { statusCode, message, data: T[] } — .items never existed)
//   2. Removed the hardcoded `status: 'draft'` filter that meant only drafts
//      could ever show up.
//   3. handleCreate was wired to BOTH create and edit — split into two
//      handlers so editing actually updates instead of trying to create.
//   4. AgendaForm was passed `meetings={[]}` — now passes the real list.
//   5. Header now uses the gradient-tile pattern consistent with the rest
//      of the dashboard.

import { useState, useMemo } from 'react';
import { Plus, ClipboardList, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  useAgendas, useCreateAgenda, useUpdateAgenda, useDeleteAgenda,
  AGENDAS_QUERY_KEYS,
} from '@/hooks/api/useAgendas';
import { useMeetings } from '@/hooks/api/useMeetings';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AgendaList from '@/components/agenda/AgendaList';
import AgendaForm from '@/components/agenda/AgendaForm';
import { toast } from 'sonner';
import type { Agenda, Meeting } from '@/types/api.types';

function unwrapArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.data))  return r.data  as T[];
  if (Array.isArray(r.items)) return r.items as T[];
  // Double-wrap fallback
  const inner = r.data as { data?: unknown } | undefined;
  if (inner && Array.isArray(inner.data)) return inner.data as T[];
  return [];
}

const AgendasPage = () => {
  const queryClient = useQueryClient();
  const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // No status filter — show every agenda the user can see.
  const { data: agendasData, isLoading, isError, error, refetch } = useAgendas({ page: 1, limit: 50 });
  const { data: meetingsData } = useMeetings({ page: 1, limit: 100 });

  // Defensive unwrap — works whether the backend returns ResponseObject,
  // a plain array, or the legacy double-wrapped shape.
  const agendas  = useMemo<Agenda[]>(() => unwrapArray<Agenda>(agendasData),  [agendasData]);
  const meetings = useMemo<Meeting[]>(() => unwrapArray<Meeting>(meetingsData), [meetingsData]);

  const createMutation = useCreateAgenda();
  const updateMutation = useUpdateAgenda();
  const deleteMutation = useDeleteAgenda();

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAgenda(null);
  };

  // Form submits to one of two mutations depending on whether we're editing
  // an existing agenda or creating a new one.
  const handleSubmit = (data: { title: string; description?: string; meetingId: string }) => {
    if (editingAgenda) {
      updateMutation.mutate(
        { agendaId: editingAgenda.id, data: { title: data.title, description: data.description } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
            toast.success('Agenda updated');
            closeForm();
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Update failed');
          },
        },
      );
      return;
    }
    createMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
        toast.success('Agenda created');
        closeForm();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to create agenda');
      },
    });
  };

  const handleEdit = (agenda: Agenda) => {
    setEditingAgenda(agenda);
    setIsFormOpen(true);
  };

  const handleDelete = (agendaId: string) => {
    deleteMutation.mutate(agendaId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
        toast.success('Agenda deleted');
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Delete failed');
      },
    });
  };

  if (isError) {
    return (
      <div className="space-y-6 pb-12">
        <Header onCreate={() => setIsFormOpen(true)} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Failed to load agendas</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {(error as any)?.response?.data?.message ?? (error as Error)?.message ?? 'The server returned an unexpected error.'}
            </p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Header onCreate={() => setIsFormOpen(true)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agendas</CardTitle>
        </CardHeader>
        <CardContent>
          <AgendaList
            agendas={agendas}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(o) => { if (!o) closeForm(); else setIsFormOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgenda ? 'Edit agenda' : 'Create new agenda'}</DialogTitle>
          </DialogHeader>
          <AgendaForm
            onSubmit={handleSubmit}
            initialData={editingAgenda ? { title: editingAgenda.title, description: editingAgenda.description, meetingId: editingAgenda.meetingId } : undefined}
            onCancel={closeForm}
            meetings={meetings}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Header extracted so error/main paths share it identically.
function Header({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
          <ClipboardList className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2.25} />
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight leading-tight">Agendas</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Plan, sequence and publish discussion items for each meeting.
          </p>
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={onCreate}
            className="h-9 gap-2 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/25 ring-1 ring-inset ring-white/10">
            <Plus className="h-4 w-4" />New agenda
          </Button>
        </DialogTrigger>
      </Dialog>
    </div>
  );
}

export default AgendasPage;
