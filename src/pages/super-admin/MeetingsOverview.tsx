// src/pages/super-admin/MeetingsOverview.tsx
import { useState, useMemo } from 'react';
import {
  Calendar, Search, Video, MapPin, Monitor,
  Clock, CheckCircle2, XCircle, Play, CalendarRange,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeetings } from '@/hooks/api/useMeetings';
import type { Meeting, MeetingStatus } from '@/types/api.types';
import { SuperAdminPageHeader } from './_SuperAdminPageHeader';
import { DataTableCard } from './_DataTableCard';

const statusConfig: Record<MeetingStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled:    { label: 'Scheduled',   color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700', icon: Clock },
  inProgress:   { label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700', icon: Play },
  completed:    { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700', icon: CheckCircle2 },
  cancelled:    { label: 'Cancelled',   color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700', icon: XCircle },
};

const formatIcons: Record<string, React.ElementType> = {
  online: Video,
  'in-person': MapPin,
  hybrid: Monitor,
};

export function MeetingsOverview() {
  const { data, isLoading, isError } = useMeetings();
  const meetings: Meeting[] = isError ? [] : (Array.isArray(data) ? data : (data as any)?.items ?? []);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    let result = meetings;
    if (tab !== 'all') result = result.filter(m => m.status === tab);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [meetings, tab, search]);

  const counts = useMemo(() => ({
    all: meetings.length,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    inProgress: meetings.filter(m => m.status === 'inProgress').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    cancelled: meetings.filter(m => m.status === 'cancelled').length,
  }), [meetings]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        icon={CalendarRange}
        eyebrow="Platform Data"
        title="Meetings"
        subtitle="Every scheduled, live, and completed meeting across the platform."
        gradient="from-blue-600 via-indigo-600 to-violet-700"
        stats={[
          { label: 'Total',       value: counts.all,        icon: Calendar },
          { label: 'Scheduled',   value: counts.scheduled,  icon: Clock },
          { label: 'In Progress', value: counts.inProgress, icon: Play },
          { label: 'Completed',   value: counts.completed,  icon: CheckCircle2 },
        ]}
      />

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="inProgress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search meetings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {['all', 'scheduled', 'inProgress', 'completed'].map(t => (
          <TabsContent key={t} value={t} className="mt-4">
            <DataTableCard>
                {isLoading ? (
                  <div className="p-10 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">Loading meetings...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <Calendar className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {search ? 'No meetings match your search' : 'No meetings found'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((meeting, idx) => {
                        const sc = statusConfig[meeting.status ?? 'scheduled'];
                        const StatusIcon = sc.icon;
                        const FormatIcon = formatIcons[meeting.meetingFormat] ?? Calendar;
                        return (
                          <TableRow key={meeting.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{meeting.title}</p>
                                  {meeting.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">{meeting.description}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                              {meeting.date ? new Date(meeting.date).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                              {meeting.startTime ?? '—'} – {meeting.endTime ?? '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                <FormatIcon className="h-3.5 w-3.5" />
                                <span className="capitalize">{meeting.meetingFormat}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">
                                {meeting.meetingType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {sc.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </DataTableCard>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
