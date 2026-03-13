import React from 'react';
import { AgendaItem, AgendaStats } from '@/types/api';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button as UiButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Trash, Move, Play, CheckCircle } from 'lucide-react';
import { useAgendaStats } from '@/hooks/api/useAgendas';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // Assume installed or use simple reorder
import { toast } from 'sonner';
import AgendaItemForm from './AgendaItemForm';

interface Props {
  agendaId: string;
  items: AgendaItem[];
  onAddItem: (data: any) => void;
  onUpdateItem: (itemId: string, data: any) => void;
  onDeleteItem: (itemId: string) => void;
  onReorder: (newOrder: any[]) => void;
  onStartItem: (itemId: string) => void;
  onCompleteItem: (itemId: string) => void;
  editingItem?: AgendaItem | null;
  setEditingItem: (item: AgendaItem | null) => void;
}

const AgendaItemsManager: React.FC<Props> = ({
  agendaId,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorder,
  onStartItem,
  onCompleteItem,
  editingItem,
  setEditingItem,
}) => {
  const { data: stats } = useAgendaStats(agendaId);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    onReorder(newItems.map((item, index) => ({ itemId: item.id, orderIndex: index })));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Agenda Items ({items.length})</CardTitle>
          <StatsDisplay stats={stats} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <UiButton onClick={() => setEditingItem(null)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </UiButton>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="agenda-items">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`p-4 cursor-move ${snapshot.isDragging ? 'ring-2 ring-primary shadow-lg' : ''}`}
                      >
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
                            <UiButton
                              variant="ghost"
                              size="sm"
                              {...provided.dragHandleProps}
                              title="Reorder"
                            >
                              <Move className="h-4 w-4" />
                            </UiButton>
                            {item.status === 'pending' && (
                              <UiButton variant="ghost" size="sm" onClick={() => onStartItem(item.id)}>
                                <Play className="h-4 w-4" />
                              </UiButton>
                            )}
                            {item.status === 'in-progress' && (
                              <UiButton variant="ghost" size="sm" onClick={() => onCompleteItem(item.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </UiButton>
                            )}
                            <UiButton variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                              <Edit3 className="h-4 w-4" />
                            </UiButton>
                            <UiButton variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)}>
                              <Trash className="h-4 w-4" />
                            </UiButton>
                          </div>
                        </div>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {editingItem !== undefined && (
          <AgendaItemForm
            item={editingItem || null}
            agendaId={agendaId}
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

