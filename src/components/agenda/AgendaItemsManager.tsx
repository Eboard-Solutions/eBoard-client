// Placeholder: simplified manager (drag-and-drop reorder removed pending dependency).
import React from 'react';
import type { AgendaItem, CreateAgendaItemData, AgendaStats } from '@/types/api.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Trash, Play, CheckCircle } from 'lucide-react';
import { useAgendaStats } from '@/hooks/api/useAgendas';
import AgendaItemForm from './AgendaItemForm';

interface Props {
  agendaId: string;
  items: AgendaItem[];
  onAddItem?: (data: CreateAgendaItemData) => void;
  onUpdateItem: (data: CreateAgendaItemData) => void;
  onDeleteItem: (itemId: string) => void;
  onStartItem: (itemId: string) => void;
  onCompleteItem: (itemId: string) => void;
  editingItem?: AgendaItem | null;
  setEditingItem: (item: AgendaItem | null) => void;
}

const AgendaItemsManager: React.FC<Props> = ({
  agendaId,
  items,
  onUpdateItem,
  onDeleteItem,
  onStartItem,
  onCompleteItem,
  editingItem,
  setEditingItem,
}) => {
  const { data: stats } = useAgendaStats(agendaId);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Agenda Items ({items.length})</CardTitle>
          <StatsDisplay stats={stats as AgendaStats | undefined} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => setEditingItem(null)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>

        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
                    <Badge>{item.type}</Badge>
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status || 'pending'}
                    </Badge>
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                  {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>⏱️ {item.duration} min</span>
                    {item.presenterName && <span>👤 {item.presenterName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === 'pending' && (
                    <Button variant="ghost" size="sm" onClick={() => onStartItem(item.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {item.status === 'in-progress' && (
                    <Button variant="ghost" size="sm" onClick={() => onCompleteItem(item.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {editingItem !== undefined && (
          <AgendaItemForm
            item={editingItem || null}
            onSubmit={onUpdateItem}
            onCancel={() => setEditingItem(null)}
            onDelete={onDeleteItem}
          />
        )}
      </CardContent>
    </Card>
  );
};

const StatsDisplay = ({ stats }: { stats: AgendaStats | undefined }) => (
  <div className="flex gap-4 text-sm">
    <div>✅ {stats?.completedItems || 0}/{stats?.totalItems || 0}</div>
    <div>⏱️ {stats?.elapsedDuration || 0}/{stats?.totalDuration || 0} min</div>
  </div>
);

export default AgendaItemsManager;
