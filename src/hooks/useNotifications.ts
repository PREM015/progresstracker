/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useNotifications.ts
// PURPOSE: Notifications hook - list, mark read, preferences
// ============================================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';
import type {
  Notification,
  NotificationPreferences,
  NotificationFilter,
} from '@/types/notification';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useNotifications(filters: NotificationFilter & { [key: string]: any } = {}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH NOTIFICATIONS (PAGINATED)
  // ==========================================================================
  const notificationsQuery = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedResponse<Notification>> => {
      const params: Record<string, string> = {
        page: String(pageParam),
        limit: '20',
      };

      if (filters.type) {
        params.type = Array.isArray(filters.type) ? filters.type.join(',') : filters.type;
      }
      if (filters.isRead !== undefined) params.isRead = String(filters.isRead);
      if (filters.isArchived !== undefined) params.isArchived = String(filters.isArchived);

      const response = await apiClient.get<ApiResponse<PaginatedResponse<Notification>>>(
        '/notifications',
        params
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }

      return response.data.data!;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Flatten notifications from all pages
  const notifications = useMemo(() => {
    return notificationsQuery.data?.pages.flatMap(page => page.items) ?? [];
  }, [notificationsQuery.data]);

  // ==========================================================================
  // FETCH UNREAD COUNT
  // ==========================================================================
  const unreadCountQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async (): Promise<number> => {
      const response = await apiClient.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch unread count');
      }

      return response.data.data!.count;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  // ==========================================================================
  // FETCH PREFERENCES
  // ==========================================================================
  const preferencesQuery = useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: async (): Promise<NotificationPreferences> => {
      const response = await apiClient.get<ApiResponse<{ preferences: NotificationPreferences }>>(
        '/notifications/preferences'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch preferences');
      }

      return response.data.data!.preferences;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // MARK AS READ
  // ==========================================================================
  const markReadMutation = useMutation({
    mutationKey: ['notifications', 'markRead'],
    mutationFn: async (ids: string | string[]) => {
      const idsArray = Array.isArray(ids) ? ids : [ids];

      const response = await apiClient.post('/notifications/mark-read', { ids: idsArray });

      if (response.error) {
        throw new Error(response.error);
      }

      return idsArray;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });

  const markAsRead = useCallback(
    async (ids: string | string[]) => {
      return markReadMutation.mutateAsync(ids);
    },
    [markReadMutation]
  );

  // ==========================================================================
  // MARK ALL AS READ
  // ==========================================================================
  const markAllReadMutation = useMutation({
    mutationKey: ['notifications', 'markAllRead'],
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/mark-all-read');

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
    },
  });

  const markAllAsRead = useCallback(async () => {
    return markAllReadMutation.mutateAsync();
  }, [markAllReadMutation]);

  // ==========================================================================
  // ARCHIVE NOTIFICATION
  // ==========================================================================
  const archiveMutation = useMutation({
    mutationKey: ['notifications', 'archive'],
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/notifications/${id}/archive`);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  const archive = useCallback(
    async (id: string) => {
      return archiveMutation.mutateAsync(id);
    },
    [archiveMutation]
  );

  // ==========================================================================
  // DELETE NOTIFICATION
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationKey: ['notifications', 'delete'],
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/notifications/${id}`);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });

  const deleteNotification = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // ==========================================================================
  // UPDATE PREFERENCES
  // ==========================================================================
  const updatePreferencesMutation = useMutation({
    mutationKey: ['notifications', 'updatePreferences'],
    mutationFn: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
      const response = await apiClient.put<ApiResponse<{ preferences: NotificationPreferences }>>(
        '/notifications/preferences',
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update preferences');
      }

      return response.data.data!.preferences;
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(queryKeys.notifications.preferences(), updatedPreferences);
    },
  });

  const updatePreferences = useCallback(
    async (data: Partial<NotificationPreferences>) => {
      return updatePreferencesMutation.mutateAsync(data);
    },
    [updatePreferencesMutation]
  );

  // ==========================================================================
  // DISMISS NOTIFICATION
  // ==========================================================================
  const dismissMutation = useMutation({
    mutationKey: ['notifications', 'dismiss'],
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/notifications/${id}/dismiss`);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  const dismiss = useCallback(
    async (id: string) => {
      return dismissMutation.mutateAsync(id);
    },
    [dismissMutation]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    notifications,
    unreadCount: unreadCountQuery.data ?? 0,
    preferences: preferencesQuery.data ?? null,

    // Pagination
    hasNextPage: notificationsQuery.hasNextPage,
    fetchNextPage: notificationsQuery.fetchNextPage,
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,

    // Loading states
    isLoading: notificationsQuery.isLoading,
    isLoadingPreferences: preferencesQuery.isLoading,

    // Error states
    error: notificationsQuery.error,
    preferencesError: preferencesQuery.error,

    // Actions
    markAsRead,
    markAllAsRead,
    archive,
    deleteNotification,
    dismiss,
    updatePreferences,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },

    // Mutation states
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,

    // Convenience
    hasUnread: (unreadCountQuery.data ?? 0) > 0,
    getById: (id: string) => notifications.find(n => n.id === id),
  }), [
    notifications,
    unreadCountQuery.data,
    preferencesQuery.data,
    preferencesQuery.isLoading,
    preferencesQuery.error,
    notificationsQuery.isLoading,
    notificationsQuery.error,
    notificationsQuery.hasNextPage,
    notificationsQuery.fetchNextPage,
    notificationsQuery.isFetchingNextPage,
    markAsRead,
    markAllAsRead,
    archive,
    deleteNotification,
    dismiss,
    updatePreferences,
    markReadMutation.isPending,
    markAllReadMutation.isPending,
    archiveMutation.isPending,
    deleteMutation.isPending,
    updatePreferencesMutation.isPending,
    queryClient,
  ]);
}

// =============================================================================
// NOTIFICATION BADGE HOOK (lightweight for navbar)
// =============================================================================

export function useNotificationBadge() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const query = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async (): Promise<number> => {
      const response = await apiClient.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count'
      );

      if (response.error || !response.data?.success) {
        return 0;
      }

      return response.data.data!.count;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  return {
    count: query.data ?? 0,
    hasUnread: (query.data ?? 0) > 0,
    isLoading: query.isLoading,
  };
}

export default useNotifications;