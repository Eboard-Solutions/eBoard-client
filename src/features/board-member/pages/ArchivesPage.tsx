'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarDays, FileText, Vote, Archive } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetings, useDocuments, useResolutions } from '@/hooks/api';
import type { Meeting, Document, Resolution } from '../types';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { SearchBar, EmptyState, unwrapList } from '../components/page-helpers';

export function ArchivesPage() {
  const { data: meetingsData } = useMeetings();
  const { data: documentsData } = useDocuments();
  const { data: resolutionsData } = useResolutions();

  const meetings = unwrapList<Meeting>(meetingsData);
  const documents = unwrapList<Document>(documentsData);
  const resolutions = unwrapList<Resolution>(resolutionsData);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const pastMeetings = meetings.filter((m) => m.status === 'COMPLETED');
  const archivedDocs = documents.filter((d) => d.category === 'MINUTES' || d.category === 'REPORT');
  const closedRes = resolutions.filter((r) => r.status === 'PASSED' || r.status === 'REJECTED' || r.status === 'DEFERRED');

  const all = useMemo(
    () =>
      [
        ...pastMeetings.map((m) => ({ id: m.meetingId, type: 'Meeting' as const, title: m.title, date: m.scheduledAt, summary: m.postMeetingSummary ?? m.description })),
        ...archivedDocs.map((d) => ({ id: d.documentId, type: 'Document' as const, title: d.title, date: d.createdAt, summary: d.description })),
        ...closedRes.map((r) => ({ id: r.resolutionId, type: 'Resolution' as const, title: r.title, date: r.updatedAt, summary: r.outcome ?? r.description })),
      ]
        .filter((item) => (!search || item.title.toLowerCase().includes(search.toLowerCase())) && (type === 'all' || item.type === type))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [pastMeetings, archivedDocs, closedRes, search, type],
  );

  const TYPE_COLORS: Record<string, string> = {
    Meeting: 'bg-indigo-100 text-indigo-700',
    Document: 'bg-sky-100 text-sky-700',
    Resolution: 'bg-amber-100 text-amber-700',
  };

  const TYPE_ICONS: Record<string, React.ElementType> = {
    Meeting: CalendarDays,
    Document: FileText,
    Resolution: Vote,
  };

  return (
    <MemberPortalLayout icon={Archive} title="Archives" color="bg-orange-600" subtitle="Historical board records">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search archives…" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-40 text-sm shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All records</SelectItem>
            <SelectItem value="Meeting">Meetings</SelectItem>
            <SelectItem value="Document">Documents</SelectItem>
            <SelectItem value="Resolution">Resolutions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Past Meetings', value: pastMeetings.length, color: 'text-indigo-600' },
          { label: 'Archived Docs', value: archivedDocs.length, color: 'text-sky-600' },
          { label: 'Closed Resolutions', value: closedRes.length, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {all.length === 0 ? (
        <EmptyState icon={Archive} title="No archived records" />
      ) : (
        <div className="space-y-2">
          {all.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <div key={item.id} className="flex items-start gap-4 p-4 rounded-2xl border border-border/60 bg-card hover:shadow-sm transition-all">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[item.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type]}`}>{item.type}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                  {item.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MemberPortalLayout>
  );
}