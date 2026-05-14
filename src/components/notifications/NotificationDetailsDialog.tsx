import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Bell, Check, Clock3, Flag, Trash2 } from 'lucide-react';
import type { Notification } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type NotificationPreview = Pick<
  Notification,
  | 'id'
  | 'title'
  | 'message'
  | 'category'
  | 'priority'
  | 'isRead'
  | 'isFlagged'
  | 'senderName'
  | 'targetRoute'
  | 'actionLabel'
  | 'createdAt'
>;

type NotificationDetailsDialogProps = {
  open: boolean;
  notification: NotificationPreview | null;
  onOpenChange: (open: boolean) => void;
  onMarkRead?: (notification: NotificationPreview) => void;
  onToggleFlag?: (notification: NotificationPreview) => void;
  onDelete?: (notification: NotificationPreview) => void;
  onOpenRelated?: (notification: NotificationPreview) => void;
  isMarkReadPending?: boolean;
  isToggleFlagPending?: boolean;
  isDeletePending?: boolean;
};

function formatTime(createdAt?: string | number | Date | null) {
  if (!createdAt) return 'Just now';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return formatDistanceToNow(date, { addSuffix: true });
}

function toneForPriority(priority?: NotificationPreview['priority']) {
  switch (priority) {
    case 'URGENT':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
    case 'HIGH':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'LOW':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
    default:
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
  }
}

export function NotificationDetailsDialog({
  open,
  notification,
  onOpenChange,
  onMarkRead,
  onToggleFlag,
  onDelete,
  onOpenRelated,
  isMarkReadPending,
  isToggleFlagPending,
  isDeletePending,
}: NotificationDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border/70 bg-background/95 backdrop-blur-xl">
        {!notification ? null : (
          <>
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-6 py-5 text-white">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
                    <Bell className="h-3 w-3" /> Notification
                  </span>
                  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]', toneForPriority(notification.priority))}>
                    {notification.priority ?? 'NORMAL'}
                  </span>
                  {notification.isFlagged && (
                    <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                      Flagged
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-semibold leading-tight text-white">
                  {notification.title}
                </DialogTitle>
                <DialogDescription className="max-w-xl text-sm text-white/85">
                  {notification.senderName ? `From ${notification.senderName}` : 'In-app alert'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold', notification.isRead ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300' : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300')}>
                  {notification.isRead ? 'Read' : 'Unread'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold capitalize">
                  {notification.category?.toLowerCase() ?? 'system'}
                </span>
                {notification.actionLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
                    Action: {notification.actionLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold">
                  <Clock3 className="h-3 w-3" /> {formatTime(notification.createdAt)}
                </span>
              </div>

              <div className="rounded-3xl border border-border/70 bg-muted/20 p-5 shadow-sm">
                <p className="whitespace-pre-line text-sm leading-7 text-foreground">
                  {notification.message || 'No further details are available for this notification.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Quick info</p>
                  <div className="mt-2 space-y-1 text-sm text-foreground">
                    <p>ID: <span className="font-mono text-xs text-muted-foreground">{notification.id}</span></p>
                    {notification.senderName && <p>Sender: {notification.senderName}</p>}
                    {notification.targetRoute && <p>Route: <span className="font-mono text-xs text-muted-foreground">{notification.targetRoute}</span></p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Suggested action</p>
                  <p className="mt-2 text-sm text-foreground">
                    Open the related page, then use the mark-read or flag actions below to keep the list clean.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-3">
                {onOpenRelated && notification.targetRoute && (
                  <Button variant="outline" className="gap-2 rounded-full" onClick={() => onOpenRelated(notification)}>
                    <ArrowRight className="h-4 w-4" />
                    Open related page
                  </Button>
                )}
                {onMarkRead && !notification.isRead && (
                  <Button className="gap-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => onMarkRead(notification)} disabled={isMarkReadPending}>
                    <Check className="h-4 w-4" />
                    Mark as read
                  </Button>
                )}
                {onToggleFlag && (
                  <Button variant="outline" className="gap-2 rounded-full" onClick={() => onToggleFlag(notification)} disabled={isToggleFlagPending}>
                    <Flag className={cn('h-4 w-4', notification.isFlagged && 'fill-current text-amber-500')} />
                    {notification.isFlagged ? 'Unflag' : 'Flag'}
                  </Button>
                )}
                {onDelete && (
                  <Button variant="destructive" className="gap-2 rounded-full" onClick={() => onDelete(notification)} disabled={isDeletePending}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}