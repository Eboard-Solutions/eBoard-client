'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Megaphone, Pin, CheckCircle2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncements, useUpdateAnnouncement } from '@/hooks/api';
import type { Announcement } from '../types';
import { EmptyState, unwrapList } from '../components/page-helpers';
import MemberPortalLayout from '../components/MemberPortalLayout';

export function AnnouncementsPage() {
  const { data } = useAnnouncements();
  const update = useUpdateAnnouncement();
  const announcements = useMemo(() => unwrapList<Announcement>(data), [data]);

  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      [...announcements]
        .filter((a) => filter === 'all' || !a.isRead)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const pOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
          return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
        }),
    [announcements, filter],
  );

  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const PRIORITY_COLORS: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    NORMAL: 'bg-blue-100 text-blue-700',
    LOW: 'bg-slate-100 text-slate-500',
  };

  return (
    <MemberPortalLayout icon={Megaphone} title="Announcements" color="bg-rose-500" subtitle="Board notices and updates">
      <div className="flex items-start justify-between gap-4 mb-6">
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0 mt-1" onClick={() => {
            announcements.forEach((a) => update.mutate({ id: a.announcementId, data: { isRead: true } as any }));
          }}>
            <CheckCircle2 className="h-3 w-3" />Mark all read
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1 border-b border-border/60 mb-5">
        {(['unread', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              filter === f ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title={filter === 'unread' ? 'All caught up!' : 'No announcements'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((ann) => {
            const isExpanded = expanded.has(ann.announcementId);
            const isLong = ann.content.length > 200;

            return (
              <div key={ann.announcementId} className={`relative rounded-2xl border transition-all ${!ann.isRead ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}>
                {ann.isPinned && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-full ml-0" />}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {!ann.isRead && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
                    {ann.isRead && <span className="h-2 w-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {ann.isPinned && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-0.5"><Pin className="h-2.5 w-2.5" />Pinned</span>}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[ann.priority]}`}>{ann.priority}</span>
                          </div>
                          <h3 className={`font-semibold text-sm ${ann.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{ann.title}</h3>
                        </div>
                        {!ann.isRead && <Button size="sm" variant="ghost" className="h-6 text-xs shrink-0" onClick={() => update.mutate({ id: ann.announcementId, data: { isRead: true } as any })}>Read</Button>}
                      </div>

                      <p className={`text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>{ann.content}</p>
                      {isLong && (
                        <button type="button" onClick={() => {
                          setExpanded((prev) => {
                            const s = new Set(prev);
                            s.has(ann.announcementId) ? s.delete(ann.announcementId) : s.add(ann.announcementId);
                            return s;
                          });
                        }} className="text-xs text-indigo-600 mt-1.5">
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">{ann.authorName}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MemberPortalLayout>
  );
}