import React from 'react';
import type { Agenda, AgendaItem, AgendaItemType } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Edit, Trash2, Calendar, Clock, FileText, Paperclip,
  Target, Users, ChevronRight, FileCheck, Megaphone,
  GitBranch, Vote, MessageSquare, Info,
} from 'lucide-react';
import { format } from 'date-fns';

// Visual tokens per agenda-item type. Keeps the card layout consistent
// across colours and saves us writing a switch in JSX every time. The
// underlying enum values come from the API (see AgendaItemType).
const ITEM_TYPE_META: Record<AgendaItemType, { label: string; icon: React.ElementType; chip: string }> = {
  discussion:   { label: 'Discussion',   icon: MessageSquare, chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/60' },
  decision:     { label: 'Decision',     icon: GitBranch,     chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/60' },
  information:  { label: 'Information',  icon: Info,          chip: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/60' },
  action:       { label: 'Action',       icon: FileCheck,     chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60' },
  presentation: { label: 'Presentation', icon: Megaphone,     chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60' },
  vote:         { label: 'Vote',         icon: Vote,          chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/60' },
};

const STATUS_CHIP: Record<string, string> = {
  draft:       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  published:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300',
  completed:   'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300',
};

interface AgendaListProps {
  agendas: Agenda[];
  onEdit: (agenda: Agenda) => void;
  onDelete: (agendaId: string) => void;
  loading?: boolean;
}

function totalDuration(items?: AgendaItem[]): number {
  return (items ?? []).reduce((sum, i) => sum + (i.duration ?? 0), 0);
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const AgendaList: React.FC<AgendaListProps> = ({ agendas, onEdit, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (agendas.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-base font-semibold">No agendas yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first agenda to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {agendas.map((agenda) => {
        const status = (agenda.status ?? 'draft').toLowerCase();
        const items = (agenda.items ?? []).slice().sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        const total = totalDuration(items);
        // Pre-read materials = every attachment across every item, surfaced
        // at the agenda level so members can prep before the meeting
        // instead of digging into each item.
        const preReads = items.flatMap((item) =>
          (item.attachments ?? []).map((a) => ({ ...a, itemTitle: item.title })),
        );
        const presenters = Array.from(new Set(items.map((i) => i.presenterName).filter(Boolean) as string[]));

        return (
          <article
            key={agenda.id}
            className="group rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            {/* Header — title + status + objectives (the description field) */}
            <div className="p-5 border-b border-border/40 bg-gradient-to-br from-card to-muted/20">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="text-base font-bold tracking-tight text-foreground truncate">
                    {agenda.title}
                  </h3>
                  {agenda.createdAt && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {format(new Date(agenda.createdAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_CHIP[status] ?? STATUS_CHIP.draft}`}>
                  {status.replace('_', ' ')}
                </span>
              </div>

              {/* Objectives — what the meeting is for. Highlighted in its
                  own callout so the reader doesn't have to scan the items
                  to figure out the purpose. */}
              {agenda.description && (
                <div className="mt-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 p-3">
                  <div className="flex items-start gap-2">
                    <Target className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                        Objectives
                      </p>
                      <p className="text-sm text-indigo-900 dark:text-indigo-100 mt-0.5 leading-relaxed line-clamp-3">
                        {agenda.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick stats — number of items, total time, presenters */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(total)}
                </span>
                {presenters.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {presenters.length} presenter{presenters.length === 1 ? '' : 's'}
                  </span>
                )}
                {preReads.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    {preReads.length} pre-read{preReads.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            {/* Items preview — first 3 items shown with type + duration */}
            <div className="p-5 space-y-2.5">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No agenda items yet.</p>
              ) : (
                <>
                  {items.slice(0, 3).map((item) => {
                    const meta = ITEM_TYPE_META[item.type] ?? ITEM_TYPE_META.information;
                    const Icon = meta.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-2.5 text-sm">
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{item.title}</p>
                          {(item.presenterName || item.duration > 0) && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {item.presenterName && <span>{item.presenterName}</span>}
                              {item.presenterName && item.duration > 0 && <span> · </span>}
                              {item.duration > 0 && <span>{formatDuration(item.duration)}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 pt-1">
                      <ChevronRight className="h-3 w-3" />
                      {items.length - 3} more item{items.length - 3 === 1 ? '' : 's'}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Pre-read materials — surfaced as a distinct strip so members
                can find prep documents without opening the agenda first. */}
            {preReads.length > 0 && (
              <div className="px-5 pb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Pre-read materials
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preReads.slice(0, 5).map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/40 text-xs hover:bg-muted hover:border-border transition-colors max-w-[220px]"
                      title={`${doc.name} — ${doc.itemTitle}`}
                    >
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </a>
                  ))}
                  {preReads.length > 5 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs text-muted-foreground">
                      + {preReads.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="px-5 pb-4 pt-2 border-t border-border/40 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(agenda)} className="gap-1.5 text-xs">
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(agenda.id)}
                className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default AgendaList;
