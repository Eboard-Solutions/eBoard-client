// src/hooks/api/useNotifications.ts
// React Query hooks for Notifications API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationsService from '@/api/services/notifications.service';
import type {
  CreateNotificationData,
  Notification,
  UpdateNotificationData,
  NotificationFilters,
} from '@/types/api.types';

// Walk whatever shape the notifications cache happens to be in (raw array,
// ResponseObject { data: [...] }, or nested { data: { data: [...] } }) and
// rewrite each notification through `patch`. Pure / immutable so React Query
// notices the change and re-renders without waiting for the network.
function patchNotificationsCache(
  cached: unknown,
  patch: (n: Notification) => Notification,
): unknown {
  if (!cached) return cached;
  const patchList = (list: Notification[]) => list.map(patch);

  if (Array.isArray(cached)) return patchList(cached as Notification[]);
  const c = cached as Record<string, unknown>;
  if (Array.isArray(c.data)) return { ...c, data: patchList(c.data as Notification[]) };
  if (c.data && typeof c.data === 'object') {
    const d = c.data as Record<string, unknown>;
    if (Array.isArray(d.data))  return { ...c, data: { ...d, data:  patchList(d.data  as Notification[]) } };
    if (Array.isArray(d.items)) return { ...c, data: { ...d, items: patchList(d.items as Notification[]) } };
  }
  if (Array.isArray(c.items)) return { ...c, items: patchList(c.items as Notification[]) };
  return cached;
}

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// Get all notifications
export function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: notificationKeys.list(filters || {}),
    queryFn: () => NotificationsService.getAll(filters),
  });
}

// Get notification by ID
export function useNotificationById(id: string) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => NotificationsService.getById(id),
    enabled: !!id,
  });
}

// Get unread notifications count. We store the bare number in the cache (not
// the full response) so optimistic writes from mark-as-read mutations can
// just `setQueryData(key, n - 1)` without re-deriving from a shape.
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await NotificationsService.getAll({ category: 'Unread' as any, page: 1 });
      return response.totalRecords ?? response.data?.length ?? 0;
    },
  });
}

// Create notification
export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotificationData) => NotificationsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

// Update notification
export function useUpdateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotificationData }) =>
      NotificationsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

// Mark notification as read. Optimistically flips `isRead` and decrements
// the unread badge so the user sees the change in the same frame as the
// click; rolls back if the API call fails.
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationsService.markAsRead(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationKeys.lists() }),
        queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() }),
      ]);

      const listSnapshots = queryClient.getQueriesData<unknown>({ queryKey: notificationKeys.lists() });
      const countSnapshot = queryClient.getQueryData<unknown>(notificationKeys.unreadCount());

      // Track whether this notification was actually unread *before* the
      // optimistic write so we can decrement the badge correctly. Double-
      // clicks must not subtract twice.
      let wasUnread = false;
      for (const [, value] of listSnapshots) {
        const list = extractList(value);
        if (list.some((n) => n.id === id && !n.isRead)) {
          wasUnread = true;
          break;
        }
      }

      for (const [key, value] of listSnapshots) {
        queryClient.setQueryData(key, patchNotificationsCache(value, (n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ));
      }

      if (wasUnread && typeof countSnapshot === 'number') {
        queryClient.setQueryData(notificationKeys.unreadCount(), Math.max(0, countSnapshot - 1));
      }

      return { listSnapshots, countSnapshot };
    },
    onError: (_err, _id, ctx) => {
      ctx?.listSnapshots?.forEach(([key, value]) => queryClient.setQueryData(key as readonly unknown[], value));
      if (ctx && ctx.countSnapshot !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), ctx.countSnapshot);
      }
    },
    onSettled: (_, __, id) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

// Mark all notifications as read. Optimistically zeros the badge and flips
// every cached notification's `isRead` flag so the dropdown updates the
// instant the user clicks.
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => NotificationsService.markAllAsRead(),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationKeys.lists() }),
        queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() }),
      ]);

      const listSnapshots = queryClient.getQueriesData<unknown>({ queryKey: notificationKeys.lists() });
      const countSnapshot = queryClient.getQueryData<unknown>(notificationKeys.unreadCount());

      for (const [key, value] of listSnapshots) {
        queryClient.setQueryData(key, patchNotificationsCache(value, (n) => (n.isRead ? n : { ...n, isRead: true })));
      }
      queryClient.setQueryData(notificationKeys.unreadCount(), 0);

      return { listSnapshots, countSnapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.listSnapshots?.forEach(([key, value]) => queryClient.setQueryData(key as readonly unknown[], value));
      if (ctx && ctx.countSnapshot !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), ctx.countSnapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.details() });
    },
  });
}

// The unread-count cache stores a raw number (per the `select` transform in
// useUnreadNotificationsCount), so we only need a list extractor for the
// list caches' "was unread?" check.
function extractList(cached: unknown): Notification[] {
  if (!cached) return [];
  if (Array.isArray(cached)) return cached as Notification[];
  const c = cached as Record<string, unknown>;
  if (Array.isArray(c.data))  return c.data  as Notification[];
  if (Array.isArray(c.items)) return c.items as Notification[];
  if (c.data && typeof c.data === 'object') {
    const d = c.data as Record<string, unknown>;
    if (Array.isArray(d.data))  return d.data  as Notification[];
    if (Array.isArray(d.items)) return d.items as Notification[];
  }
  return [];
}

// Toggle notification flag
export function useToggleNotificationFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFlagged }: { id: string; isFlagged: boolean }) =>
      NotificationsService.toggleFlag(id, isFlagged),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

// Bulk delete notifications
export function useBulkDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => NotificationsService.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
