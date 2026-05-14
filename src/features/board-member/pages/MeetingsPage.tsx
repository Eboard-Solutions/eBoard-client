'use client';

import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import { CalendarDays, Clock, MapPin, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMyMeetings, useRSVP } from '@/hooks/api';
import type { Meeting } from '../types';
import { SearchBar, EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';

export function MeetingsPage() {
  const { data: meetingsData } = useMyMeetings();
  const rsvpMutation = useRSVP();
  const meetings = useMemo(() => unwrapList<Meeting>(meetingsData), [meetingsData]);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selected, setSelected] = useState<Meeting | null>(null);

  const now = new Date();

  const filtered = useMemo(
    () =>
      meetings
        .filter((m) => {
          const matchSearch =
            !search ||
            m.title.toLowerCase().includes(search.toLowerCase()) ||
            m.location.toLowerCase().includes(search.toLowerCase());
          const isUpcoming = new Date(m.scheduledAt) >= now || m.status === 'IN_PROGRESS';
          return matchSearch && (tab === 'upcoming' ? isUpcoming : !isUpcoming);
        })
        .sort((a, b) =>
          tab === 'upcoming'
            ? new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
            : new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
        ),
    [meetings, search, tab],
  );

  const TYPE_COLORS: Record<string, string> = {
    BOARD: 'bg-indigo-100 text-indigo-700',
    COMMITTEE: 'bg-sky-100 text-sky-700',
    ANNUAL: 'bg-violet-100 text-violet-700',
    SPECIAL: 'bg-amber-100 text-amber-700',
    EMERGENCY: 'bg-red-100 text-red-700',
  };

  return (
    <MemberPortalLayout icon={CalendarDays} title="Meetings" color="bg-indigo-600" subtitle="Board and committee meeting schedule">

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search meetings…" />
      </div>

      <div className="flex items-center gap-1 border-b border-border/60 mb-5">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title={`No ${tab} meetings`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const isT = isToday(new Date(m.scheduledAt));
            const isTo = isTomorrow(new Date(m.scheduledAt));
            return (
              <div
                key={m.meetingId}
                className={`rounded-[24px] border border-border/60 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer overflow-hidden ${
                  isT ? 'border-indigo-300 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/20' : ''
                }`}
                onClick={() => setSelected(m)}
              >
                <div className={`h-0.5 ${m.status === 'COMPLETED' ? 'bg-slate-300' : m.status === 'CANCELLED' ? 'bg-red-400' : 'bg-indigo-500'}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`shrink-0 rounded-xl p-2.5 text-center min-w-[52px] ${isT || isTo ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'}`}>
                        <p className="text-[9px] font-bold uppercase">{format(new Date(m.scheduledAt), 'MMM')}</p>
                        <p className="text-lg font-semibold leading-none">{format(new Date(m.scheduledAt), 'd')}</p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[m.meetingType] ?? TYPE_COLORS.BOARD}`}>{m.meetingType}</span>
                          {(isT || isTo) && <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{isT ? 'Today' : 'Tomorrow'}</span>}
                          {m.status !== 'SCHEDULED' && <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">{m.status}</span>}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{m.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(m.scheduledAt), 'h:mm a')}
                          </span>
                          {m.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {m.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {m.attendees.length} attendees
                          </span>
                        </div>
                      </div>
                    </div>
                    {m.status === 'SCHEDULED' && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {(['ACCEPTED', 'TENTATIVE', 'DECLINED'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              rsvpMutation.mutate({ meetingId: m.meetingId, data: { status: s.toLowerCase() as any } });
                              toast.success(`RSVP updated: ${s}`);
                            }}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all ${
                              m.myRsvp === s
                                ? s === 'ACCEPTED'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : s === 'DECLINED'
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-amber-500 text-white border-amber-500'
                                : 'border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  {format(new Date(selected.scheduledAt), 'EEEE, MMMM d yyyy')} · {format(new Date(selected.scheduledAt), 'h:mm a')} – {format(new Date(selected.endTime), 'h:mm a')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                      <p className="font-medium text-sm sm:text-base">{selected.location || '—'}</p>
                  </div>
                  {selected.meetingLink && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Virtual Link</p>
                      <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 flex items-center gap-1 text-sm font-medium hover:underline">
                        <Video className="h-3.5 w-3.5" /> Join Meeting
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                {selected.meetingLink && selected.status === 'IN_PROGRESS' && (
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4" />Join Live Meeting</a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MemberPortalLayout>
  );
}