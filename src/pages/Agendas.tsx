// src/pages/Agendas.tsx
//
// Standalone Agendas page. Previously the agenda manager was nested as a
// sub-tab inside Meetings.tsx — that hid it from the sidebar nav and made
// the Meetings page own a concern that isn't really about meeting CRUD.
// Promoting it to a top-level route gives it a stable URL and a sidebar link.

import { useMemo } from 'react';
import { ClipboardList, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useMeetings } from '@/hooks/api/useMeetings';
import { useOrganisationUsers } from '@/hooks/api/useUsers';
import { AgendaManager } from '@/components/meetings/AgendaManager';
import type { Meeting } from '@/types/api.types';

// Defensive unwrapper — handles ResponseObject `.data`, the legacy `.items`
// shape, double-wrapped responses, and bare arrays. The previous version
// missed double-wraps and silently rendered empty.
function unwrapArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.data))  return r.data  as T[];
  if (Array.isArray(r.items)) return r.items as T[];
  const inner = r.data as { data?: unknown; items?: unknown } | undefined;
  if (inner && Array.isArray(inner.data))  return inner.data  as T[];
  if (inner && Array.isArray(inner.items)) return inner.items as T[];
  return [];
}

export default function Agendas() {
  const [, navigate] = useLocation();
  const {
    data: meetingsRaw,
    isLoading: loadingMeetings,
    isError: meetingsError,
    error:   meetingsErrObj,
    refetch: refetchMeetings,
  } = useMeetings({ page: 1, limit: 100 });
  const { data: usersRaw } = useOrganisationUsers();

  const meetings = useMemo<Meeting[]>(() => unwrapArray<Meeting>(meetingsRaw), [meetingsRaw]);
  const members  = useMemo(() => unwrapArray<unknown>(usersRaw),                [usersRaw]);

  // Surface a real error UI when the meetings fetch fails. Without this,
  // a 401/timeout/500 falls through to the "No meetings yet" empty state and
  // the user thinks they have no meetings when in fact the request failed.
  const errMessage = meetingsError
    ? (meetingsErrObj as any)?.response?.data?.message
        ?? (meetingsErrObj as Error)?.message
        ?? 'Could not reach the server.'
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header — gradient-tile pattern matches Members / Organisation / Minutes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/15">
            <ClipboardList className="h-6 w-6 text-white drop-shadow-sm" strokeWidth={2.25} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight leading-tight">Agendas</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Plan, sequence and publish discussion items for each meeting.
            </p>
          </div>
        </div>
      </div>

      {/* Skeleton while we wait for the first meetings response */}
      {loadingMeetings && meetings.length === 0 && (
        <div className="space-y-3">
          <div className="h-12 rounded-xl bg-muted/50 animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
        </div>
      )}

      {/* Error state — distinct from "no meetings yet" so the user doesn't
          mistake a failed request for an empty org. */}
      {meetingsError && meetings.length === 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 py-12 px-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <p className="text-base font-semibold">Couldn't load meetings</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            {errMessage}
          </p>
          <Button size="sm" variant="outline" className="mt-5 gap-2"
            onClick={() => refetchMeetings()}>
            <RefreshCw className="h-4 w-4" />Try again
          </Button>
        </div>
      )}

      {/* If meetings have loaded but the org has none, give the user a clear
          path forward instead of dropping them into an empty AgendaManager. */}
      {!loadingMeetings && !meetingsError && meetings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/20 to-transparent py-16 px-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shadow-sm mb-4">
            <Calendar className="h-7 w-7 text-indigo-500" />
          </div>
          <p className="text-base font-semibold">No meetings yet</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            Agendas are attached to meetings. Schedule a meeting first, then come back here to build its agenda.
          </p>
          <Button size="sm" className="mt-5 gap-2 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/25 ring-1 ring-inset ring-white/10"
            onClick={() => navigate('/meetings')}>
            <Calendar className="h-4 w-4" />Go to meetings
          </Button>
        </div>
      )}

      {/* Render the manager only once we have at least one meeting to attach to */}
      {meetings.length > 0 && (
        <AgendaManager meetings={meetings} members={members as never} />
      )}
    </div>
  );
}
