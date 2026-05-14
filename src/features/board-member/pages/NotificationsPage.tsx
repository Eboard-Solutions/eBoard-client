'use client';

import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CalendarDays, CheckSquare, FileText, Vote, BarChart3, Megaphone, MessageSquare, Check, Trash2, Flag, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification } from '@/hooks/api';
import { useToggleNotificationFlag } from '@/hooks/api/useNotifications';
import MemberPortalLayout from '../components/MemberPortalLayout';
import { EmptyState, unwrapList } from '../components/page-helpers';
import { NotificationDetailsDialog, type NotificationPreview } from '@/components/notifications/NotificationDetailsDialog';

type NotificationItem = {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  isFlagged: boolean;
  category?: string;
  priority?: NotificationPreview['priority'];
  senderName?: string;
  targetRoute?: string;
  actionLabel?: string;
  createdAt?: string | number | Date | null;
};

function normalizeNotification(item: any): NotificationItem {
  return {
    notificationId: item?.notificationId ?? item?.id ?? '',
    type: item?.type ?? item?.category ?? 'SYSTEM',
    title: item?.title ?? 'Notification',
    body: item?.body ?? item?.message ?? '',
    isRead: Boolean(item?.isRead),
    isFlagged: Boolean(item?.isFlagged),
    category: item?.category ?? item?.type ?? 'SYSTEM',
    priority: item?.priority ?? 'NORMAL',
    senderName: item?.senderName,
    targetRoute: item?.targetRoute,
    actionLabel: item?.actionLabel,
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
  const [, setLocation] = useLocation();
  const { data } = useNotifications();
  const markRead = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const toggleFlag = useToggleNotificationFlag();
  const [filter, setFilter] = useState<'all' | 'unread' | 'flagged'>('all');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  const notifications = useMemo(() => unwrapList<any>(data).map(normalizeNotification), [data]);
  const selectedNotification: NotificationPreview | null = selectedNotificationId
    ? (() => {
        const notification = notifications.find((item) => item.notificationId === selectedNotificationId);
        if (!notification) return null;
        return {
          id: notification.notificationId,
          title: notification.title,
          message: notification.body,
          category: (notification.category ?? 'SYSTEM') as NotificationPreview['category'],
          priority: notification.priority ?? 'NORMAL',
          isRead: notification.isRead,
          isFlagged: notification.isFlagged,
          senderName: notification.senderName,
          targetRoute: notification.targetRoute,
          actionLabel: notification.actionLabel,
          createdAt: notification.createdAt,
        };
      })()
    : null;

  const visibleNotifications = useMemo(() => {
    return notifications
      .filter((notification) => {
        if (filter === 'unread') return !notification.isRead;
        if (filter === 'flagged') return notification.isFlagged;
        return true;
      })
      .sort((left, right) => Number(left.isRead) - Number(right.isRead) || Number(right.isFlagged) - Number(left.isFlagged));
  }, [filter, notifications]);

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
  const flagged = notifications.filter((n) => n.isFlagged).length;

  const openNotification = (notification: NotificationItem) => {
    setSelectedNotificationId(notification.notificationId);

    if (!notification.isRead && notification.notificationId) {
      markRead.mutate(notification.notificationId);
    }
  };

  return (
    <MemberPortalLayout icon={Bell} title="Notifications" color="bg-rose-500" subtitle="Alerts, actions, and live updates">
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total', value: notifications.length, tone: 'from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300', hint: 'Everything in one place' },
          { label: 'Unread', value: unread, tone: 'from-indigo-600 to-blue-600', hint: 'Needs your attention' },
          { label: 'Flagged', value: flagged, tone: 'from-amber-500 to-orange-500', hint: 'Saved for follow-up' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</p>
            <div className={`mt-2 inline-flex h-10 min-w-16 items-center rounded-2xl bg-gradient-to-r px-3 text-lg font-black text-white shadow-sm ${stat.tone}`}>
              {stat.value}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-border/60 bg-gradient-to-r from-indigo-50 via-background to-rose-50 p-4 shadow-sm dark:from-indigo-950/20 dark:via-background dark:to-rose-950/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Notification center</p>
          <p className="text-sm text-muted-foreground">Open a notification to mark it read and jump to the related page.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'unread', 'flagged'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === value
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-indigo-300 hover:text-foreground',
              )}
            >
              {value === 'all' ? 'All' : value === 'unread' ? `Unread (${unread})` : `Flagged (${flagged})`}
            </button>
          ))}
          {unread > 0 && (
            <Button size="sm" className="h-9 gap-1.5 rounded-full px-4" onClick={() => markAll.mutate()}>
              <Sparkles className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" sub="You're all caught up!" />
      ) : visibleNotifications.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing to show" sub="Try switching the filter to see more notifications." />
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const color = TYPE_COLORS[n.type] ?? 'bg-slate-100 text-slate-600';
            return (
              <div
                key={n.notificationId || `${n.title}-${n.createdAt ?? 'unknown'}`}
                className={cn(
                  'group rounded-3xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  !n.isRead ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/70 dark:bg-indigo-950/20' : 'border-border/70 bg-background/80',
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn('h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-[1.02]', color)}
                    aria-label={`Open ${n.title}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('text-sm font-semibold', n.isRead ? 'text-muted-foreground' : 'text-foreground')}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="rounded-full bg-indigo-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">New</span>}
                      {n.isFlagged && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Flagged</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{formatNotificationTime(n.createdAt)}</span>
                      {n.actionLabel && <><span>·</span><span>{n.actionLabel}</span></>}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!n.isRead && (
                      <button
                        type="button"
                        disabled={!n.notificationId}
                        onClick={() => markRead.mutate(n.notificationId)}
                        className="rounded-full border border-indigo-200 bg-white/90 p-2 text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900 dark:bg-slate-950/80 dark:hover:bg-indigo-950/40"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!n.notificationId}
                      onClick={() => toggleFlag.mutate({ id: n.notificationId, isFlagged: !n.isFlagged })}
                      className="rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={n.isFlagged ? 'Unflag notification' : 'Flag notification'}
                    >
                      <Flag className={cn('h-4 w-4', n.isFlagged && 'fill-current text-amber-500')} />
                    </button>
                    <button
                      type="button"
                      disabled={!n.notificationId}
                      onClick={() => deleteNotification.mutate(n.notificationId)}
                      className="rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className="rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Open notification"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NotificationDetailsDialog
        open={Boolean(selectedNotification)}
        notification={selectedNotification}
        onOpenChange={(open) => {
          if (!open) setSelectedNotificationId(null);
        }}
        onMarkRead={(notification) => {
          if (notification.id) {
            markRead.mutate(notification.id);
          }
        }}
        onToggleFlag={(notification) => {
          if (notification.id) {
            toggleFlag.mutate({ id: notification.id, isFlagged: !notification.isFlagged });
          }
        }}
        onDelete={(notification) => {
          if (notification.id) {
            deleteNotification.mutate(notification.id, {
              onSuccess: () => setSelectedNotificationId(null),
            });
          }
        }}
        onOpenRelated={(notification) => {
          setSelectedNotificationId(null);
          setLocation(notification.targetRoute ?? '/board/notifications');
        }}
        isMarkReadPending={markRead.isPending}
        isToggleFlagPending={toggleFlag.isPending}
        isDeletePending={deleteNotification.isPending}
      />
    </MemberPortalLayout>
  );
}