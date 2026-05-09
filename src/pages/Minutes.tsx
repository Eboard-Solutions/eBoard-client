// src/pages/Minutes.tsx
//
// Standalone Minutes page. Mirrors Agendas.tsx — same shell, same data
// dependencies (meetings + members) — but renders the MinutesManager so
// the user can capture minutes, decisions, and action items per meeting.
//
// Both pages share the gradient-tile header pattern used by Members,
// Organisation and the Dashboard for visual consistency.

import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useMeetings } from '@/hooks/api/useMeetings';
import { useOrganisationUsers } from '@/hooks/api/useUsers';
import { MinutesManager } from '@/components/meetings/MinutesManager';
import type { Meeting } from '@/types/api.types';

function unwrapArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as T[];
  if (Array.isArray(r.data))  return r.data  as T[];
  return [];
}

export default function Minutes() {
  const { data: meetingsRaw, isLoading } = useMeetings({ page: 1, limit: 100 });
  const { data: usersRaw }                = useOrganisationUsers();

  const meetings = useMemo<Meeting[]>(() => unwrapArray(meetingsRaw), [meetingsRaw]);
  const members  = useMemo(() => unwrapArray<unknown>(usersRaw),       [usersRaw]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
            <FileText className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2.25} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight leading-tight">Minutes</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Capture, review and publish official records of board meetings.
            </p>
          </div>
        </div>
      </div>

      {isLoading && meetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-20 text-center text-sm text-muted-foreground">
          Loading minutes…
        </div>
      ) : (
        <MinutesManager meetings={meetings} members={members as never} />
      )}
    </div>
  );
}
