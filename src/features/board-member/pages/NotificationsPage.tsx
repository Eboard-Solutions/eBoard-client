'use client';

import { formatDistanceToNow } from 'date-fns';
import { Bell, CalendarDays, CheckSquare, FileText, Vote, BarChart3, Megaphone, MessageSquare, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification } from '@/hooks/api';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { EmptyState, unwrapList } from '../components/page-helpers';

type NotificationItem = {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt?: string | number | Date | null;
};

function normalizeNotification(item: any): NotificationItem {
  return {
    notificationId: item?.notificationId ?? item?.id ?? '',
    type: item?.type ?? item?.category ?? 'SYSTEM',
    title: item?.title ?? 'Notification',
    body: item?.body ?? item?.message ?? '',
    isRead: Boolean(item?.isRead),
    createdAt: item?.createdAt ?? null,
  };
}

function formatNotificationTime(createdAt?: string | number | Date | null): string {
  if (!createdAt) return 'Just now';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return formatDistanceToNow(date, { addSuffix: true });
}

export function NotificationsPage() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = unwrapList<any>(data).map(normalizeNotification);

  const TYPE_ICONS: Record<string, React.ElementType> = {
    MEETING: CalendarDays,
    TASK: CheckSquare,
    DOCUMENT: FileText,
    RESOLUTION: Vote,
    POLL: BarChart3,
    ANNOUNCEMENT: Megaphone,
    MESSAGE: MessageSquare,
  };

  const TYPE_COLORS: Record<string, string> = {
    MEETING: 'bg-indigo-100 text-indigo-700',
    TASK: 'bg-emerald-100 text-emerald-700',
    DOCUMENT: 'bg-sky-100 text-sky-700',
    RESOLUTION: 'bg-amber-100 text-amber-700',
    POLL: 'bg-violet-100 text-violet-700',
    ANNOUNCEMENT: 'bg-rose-100 text-rose-700',
    MESSAGE: 'bg-emerald-100 text-emerald-700',
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <MemberPortalLayout icon={Bell} title="Notifications" color="bg-rose-500" subtitle="Alerts and updates">
      {unread > 0 && (
        <div className="flex justify-end mb-4">
          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 mt-1 gap-1.5" onClick={() => markAll.mutate()}>
            <Check className="h-4 w-4" />Clear all
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" sub="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const color = TYPE_COLORS[n.type] ?? 'bg-slate-100 text-slate-600';
            return (
              <div key={n.notificationId || `${n.title}-${n.createdAt ?? 'unknown'}`} className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all ${!n.isRead ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatNotificationTime(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.isRead && (
                    <button type="button" disabled={!n.notificationId} onClick={() => markRead.mutate(n.notificationId)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:cursor-not-allowed disabled:opacity-50">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" disabled={!n.notificationId} onClick={() => deleteNotification.mutate(n.notificationId)} className="text-muted-foreground hover:text-destructive transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MemberPortalLayout>
  );
}