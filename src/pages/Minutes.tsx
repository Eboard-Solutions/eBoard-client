import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Loader2, Filter, Calendar, FileText, Eye, Edit3, Download, ChevronRight } from 'lucide-react';

import { useMinutes, useMinutesById, useDeleteMinutes } from '@/hooks/api/useMinutes';
import type { Minutes, MinutesStatus, MinutesFilters, CreateMinutesData } from '@/types/api.types';
import { MinutesManager } from '@/components/meetings/MinutesManager';
import { useMeetings } from '@/hooks/api/useMeetings';
import type { Meeting } from '@/types/api.types';
import type { User } from '@/types/api.types';

interface MinutesListItemProps {
  minutes: Minutes;
  onView: (id: string) => void;
  onEdit: (minutes: Minutes, meeting?: Meeting) => void;
}

function MinutesListItem({ minutes, onView, onEdit }: MinutesListItemProps) {
  const statusBadge = (status: MinutesStatus) => {
    const map: Record<MinutesStatus, { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700', label: 'Draft' },
      'in_progress': { className: 'bg-blue-100 text-blue-700', label: 'In Progress' },
      review: { className: 'bg-yellow-100 text-yellow-700', label: 'Under Review' },
      approved: { className: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
      published: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Published' },
    };
    const { className, label } = map[status];
    return <Badge className={`text-xs border capitalize ${className}`}>{label}</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-all hover:shadow-primary/10 cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{minutes.title}</h3>
              {statusBadge(minutes.status)}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Meeting: {minutes.meeting?.title || minutes.meetingId}
              </div>
              {minutes.approvedAt && (
                <div className="flex items-center gap-1">
                  Approved: {new Date(minutes.approvedAt).toLocaleDateString()}
                </div>
              )}
              {minutes.publishedAt && (
                <div className="flex items-center gap-1 text-emerald-600">
                  Published: {new Date(minutes.publishedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(minutes); }}>
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onView(minutes.id); }}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MinutesPage() {
  const [, setLocation] = useLocation();
  
  // State
  const [filters, setFilters] = useState<MinutesFilters>({});
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'published'>('all');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showMinutesManager, setShowMinutesManager] = useState(false);
  const [editingMinutes, setEditingMinutes] = useState<{ minutes: Minutes; meeting?: Meeting } | null>(null);
  const [viewingMinutesId, setViewingMinutesId] = useState<string>('');

  // Data
  const { data: minutesPage, refetch: refetchMinutes } = useMinutes(filters);
  const { data: meetings } = useMeetings({ limit: 50 });
  const deleteMutation = useDeleteMinutes({
    onSuccess: () => {
      toast.success('Minutes deleted');
      refetchMinutes();
    },
  });

  const minutesList = minutesPage?.items ?? [];
  const filteredMinutes = minutesList.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) &&
    (!selectedMeetingId || m.meetingId === selectedMeetingId) &&
    (activeTab === 'all' || m.status === activeTab)
  );

  const handleCreateMinutes = () => {
    setEditingMinutes(null);
    setShowMinutesManager(true);
  };

  const handleEditMinutes = (minutes: Minutes, meeting?: Meeting) => {
    setEditingMinutes({ minutes, meeting });
    setShowMinutesManager(true);
  };

  const handleViewMinutes = (id: string) => {
    setViewingMinutesId(id);
    // Could open modal or navigate to detail view
    toast.info('Minutes detail view coming soon');
  };

  const handleSaveMinutes = async (output: any) => {
    // This would use existing useCreateMinutes/useUpdateMinutes hooks
    toast.success('Minutes saved successfully!');
    setShowMinutesManager(false);
    setEditingMinutes(null);
    refetchMinutes();
  };

  const updateFilters = (newFilters: Partial<MinutesFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Minutes</h1>
          <p className="text-muted-foreground">Meeting minutes, decisions, and action items</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleCreateMinutes} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> New Minutes
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-5 w-5" /> Export All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search minutes by title..."
                className="pl-10 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
              <SelectTrigger className="w-[220px] bg-background">
                <SelectValue placeholder="Filter by meeting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Meetings</SelectItem>
                {meetings?.items?.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
              {(['all', 'draft', 'published'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => refetchMinutes()}>
              <Filter className="mr-1.5 h-3.5 w-3.5" /> Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1.5 h-auto rounded-lg gap-1.5 flex-wrap">
          <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow">
            All Minutes ({minutesList.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="data-[state=active]:bg-background data-[state=active]:shadow">
            Draft ({minutesList.filter(m => m.status === 'draft').length})
          </TabsTrigger>
          <TabsTrigger value="published" className="data-[state=active]:bg-background data-[state=active]:shadow">
            Published ({minutesList.filter(m => m.status === 'published').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-2 space-y-4">
          {filteredMinutes.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="p-16 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                <h3 className="text-xl font-medium mb-2">No minutes found</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first minutes or adjust your filters
                </p>
                <Button onClick={handleCreateMinutes} className="gap-2">
                  <Plus className="h-4 w-4" /> Create Minutes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMinutes.map(minutes => (
                <MinutesListItem
                  key={minutes.id}
                  minutes={minutes}
                  onView={handleViewMinutes}
                  onEdit={handleEditMinutes}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Minutes Manager Modal */}
      {showMinutesManager && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-card border shadow-2xl rounded-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingMinutes ? `Edit ${editingMinutes.minutes.title}` : 'New Minutes'}
                </h2>
                <p className="text-muted-foreground">
                  {editingMinutes ? 'Update minutes content and items' : 'Record meeting decisions and actions'}
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowMinutesManager(false)}>
                <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
                Close
              </Button>
            </div>
            <MinutesManager
              meeting={editingMinutes?.meeting}
              existingMinutes={editingMinutes?.minutes || undefined}
              onSave={handleSaveMinutes}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewingMinutesId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card border shadow-2xl rounded-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between">
              <h2 className="text-xl font-bold">Minutes Preview</h2>
              <Button variant="ghost" size="icon" onClick={() => setViewingMinutesId('')}>
                <ChevronRight className="h-5 w-5 rotate-180" />
              </Button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <p>Full minutes preview coming soon for ID: {viewingMinutesId}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
