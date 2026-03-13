import React, { useState, useEffect } from 'react';
import type { AgendaItem, CreateAgendaItemData } from '@/types/api.types';
// import { Agenda, CreateAgendaData, UpdateAgendaData } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
// import { Button as DialogButton } from '@/components/ui/button';
// import { useMeetings } from '@/hooks/api/useMeetings'; // Assume exists
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface AgendaFormProps {
  onSubmit: (data: { title: string; description?: string; meetingId: string }) => void;
  initialData?: { title: string; description?: string; meetingId: string };
  onCancel: () => void;
  meetings?: Array<{ id: string; title: string }>;
}

const AgendaForm: React.FC<AgendaFormProps> = ({ 
  onSubmit, 
  initialData, 
  onCancel,
  meetings = []
}) => {
  const [formData, setFormData] = useState<{ title: string; description: string; meetingId: string }>({
    title: '',
    description: '',
    meetingId: '',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        meetingId: initialData.meetingId || '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.meetingId) {
      toast.error('Please select a meeting');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter agenda title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meetingId">Meeting *</Label>
        <Select value={formData.meetingId} onValueChange={(value) => setFormData({ ...formData, meetingId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a meeting" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Recent Meetings</SelectLabel>
              {meetings.map((meeting: any) => (
                <SelectItem key={meeting.id} value={meeting.id}>
                  {meeting.title}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Agenda description (optional)"
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Agenda' : 'Create Agenda'}
        </Button>
      </div>
    </form>
  );
};

export default AgendaForm;

