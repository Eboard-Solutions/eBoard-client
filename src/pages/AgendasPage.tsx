import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAgendas, useCreateAgenda, useDeleteAgenda, AGENDAS_QUERY_KEYS } from '@/hooks/api/useAgendas';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AgendaList from '@/components/agenda/AgendaList';
import AgendaForm from '@/components/agenda/AgendaForm';
import { toast } from 'sonner';
import type { Agenda } from '@/types/api.types';

const AgendasPage = () => {
  const queryClient = useQueryClient();
  const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: agendasData, isLoading, isError, error, refetch } = useAgendas({ 
    status: 'draft', 
    page: 1, 
    limit: 20 
  });


  const createMutation = useCreateAgenda();
  const deleteMutation = useDeleteAgenda();

  const handleCreate = (data: { title: string; description?: string; meetingId: string }) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: AGENDAS_QUERY_KEYS.all });
        toast.success('Agenda created successfully');
        setIsFormOpen(false);
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.message || 'Failed to create agenda';
        toast.error(msg);
      }
    });
  };

  const handleEdit = (agenda: Agenda) => {
    setEditingAgenda(agenda);
    setIsFormOpen(true);
  };

  const handleDelete = (agendaId: string) => {
    deleteMutation.mutate(agendaId, {
      onSuccess: () => {
        toast.success('Agenda deleted');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Delete failed');
      }
    });
  };

  if (isLoading) return <div className="p-8 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p>Loading agendas...</p>
      <Button variant="link" onClick={() => refetch()} className="mt-2">Retry</Button>
    </div>
  </div>;

  if (isError) return <div className="p-8 text-center">
    <h2 className="text-2xl font-bold text-destructive mb-4">Failed to load agendas</h2>
    <p className="text-muted-foreground mb-6">Backend returned 500 error. Please check server status.</p>
    <Button onClick={() => refetch()}>Retry</Button>
  </div>;


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendas</h1>
          <p className="text-muted-foreground">Manage meeting agendas and items</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Agenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAgenda ? 'Edit Agenda' : 'Create New Agenda'}</DialogTitle>
              </DialogHeader>
              <AgendaForm 
                onSubmit={handleCreate} 
                initialData={editingAgenda}
                onCancel={() => {
                  setEditingAgenda(null);
                  setIsFormOpen(false);
                }}
                meetings={[]}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Agendas</CardTitle>
        </CardHeader>
        <CardContent>
          <AgendaList 
            agendas={agendasData?.items || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AgendasPage;

