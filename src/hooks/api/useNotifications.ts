// src/hooks/api/useNotifications.ts
// React Query hooks for Notifications API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NotificationsService from '@/api/services/notifications.service';
import type {
  CreateNotificationData,
  UpdateNotificationData,
  NotificationFilters,
} from '@/types/api.types';

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

// Get unread notifications count
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => NotificationsService.getAll({ category: 'Unread', page: 1 }),
    select: (response) => response.totalRecords ?? response.data?.length ?? 0,
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

// Mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationsService.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => NotificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.details() });
    },
  });
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
