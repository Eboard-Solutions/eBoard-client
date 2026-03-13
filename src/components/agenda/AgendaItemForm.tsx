import React, { useState } from 'react';

import type { AgendaItem, CreateAgendaItemData } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const AgendaItemTypes = ['discussion', 'decision', 'information', 'action', 'presentation', 'vote'] as const;
type ItemType = typeof AgendaItemTypes[number];

interface Props {
  item?: Partial<AgendaItem> | null;
  // agendaId: string; // unused - remove if not needed
  onSubmit: (data: CreateAgendaItemData) => void;
  onCancel: () => void;
  onDelete?: (itemId: string) => void;
}


const AgendaItemForm: React.FC<Props> = ({ 
  item, 
  agendaId, 
  onSubmit, 
  onCancel, 
  onDelete 
}) => {
  const [formData, setFormData] = useState<CreateAgendaItemData>({
    orderIndex: 0,
    type: 'discussion',
    title: '',
    description: '',
    duration: 15,
    presenterId: '',
    presenterName: '',
    notes: '',
  });

  // Use item prop directly - no useEffect needed for controlled form
// Removed defaultData - form is now fully controlled


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="p-6 border rounded-lg bg-card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Item title"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: ItemType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AgendaItemTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="120"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
              placeholder="15"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="presenter">Presenter</Label>
          <Input
            id="presenter"
            value={formData.presenterName}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                presenterName: e.target.value,
                presenterId: '',
              });
            }}
            placeholder="Presenter name (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed description..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Discussion notes..."
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {item?.id && onDelete && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => onDelete(item.id!)}
            >
              Delete
            </Button>
          )}
          <Button type="submit">
            {item ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AgendaItemForm;

