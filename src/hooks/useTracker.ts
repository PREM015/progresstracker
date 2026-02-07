/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useTracker.ts
// PURPOSE: Tracker entries hook - CRUD operations, filtering, stats
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
  TrackerEntry,
  TrackerEntryInput,
  TrackerSummary,
  TrackerFilter,
  DailyStats,
  BulkOperationResult,
} from '@/types/tracker';

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

interface TrackerStatsResponse {
  today: DailyStats | null;
  thisWeek: {
    problems: number;
    commits: number;
    time: number;
    points: number;
  };
  thisMonth: {
    problems: number;
    commits: number;
    time: number;
    points: number;
  };
  streak: {
    current: number;
    longest: number;
  };
}

interface HeatmapData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTracker(filters: TrackerFilter & { [key: string]: any } = {}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH ENTRIES (PAGINATED)
  // ==========================================================================
  const entriesQuery = useInfiniteQuery({
    queryKey: queryKeys.tracker.entries(filters),
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedResponse<TrackerEntry>> => {
      const params: Record<string, string> = {
        page: String(pageParam),
        limit: '20',
      };

      if (filters.startDate) params.startDate = String(filters.startDate);
      if (filters.endDate) params.endDate = String(filters.endDate);
      if (filters.platformIds?.length) params.platformIds = filters.platformIds.join(',');
      if (filters.categories?.length) params.categories = filters.categories.join(',');
      if (filters.source) params.source = filters.source;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get<ApiResponse<PaginatedResponse<TrackerEntry>>>(
        '/tracker',
        params
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch entries');
      }

      return response.data.data!;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Flatten entries from all pages
  const entries = useMemo(() => {
    return entriesQuery.data?.pages.flatMap(page => page.items) ?? [];
  }, [entriesQuery.data]);

  // ==========================================================================
  // FETCH RECENT ENTRIES
  // ==========================================================================
  const recentQuery = useQuery({
    queryKey: queryKeys.tracker.recent(10),
    queryFn: async (): Promise<TrackerEntry[]> => {
      const response = await apiClient.get<ApiResponse<{ entries: TrackerEntry[] }>>(
        '/tracker/recent',
        { limit: '10' }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch recent entries');
      }

      return response.data.data!.entries;
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // ==========================================================================
  // FETCH STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.tracker.stats(),
    queryFn: async (): Promise<TrackerStatsResponse> => {
      const response = await apiClient.get<ApiResponse<TrackerStatsResponse>>('/tracker/stats');

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch stats');
      }

      return response.data.data!;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH SUMMARY
  // ==========================================================================
  const summaryQuery = useQuery({
    queryKey: queryKeys.tracker.summary(),
    queryFn: async (): Promise<TrackerSummary> => {
      const response = await apiClient.get<ApiResponse<{ summary: TrackerSummary }>>(
        '/tracker/summary'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch summary');
      }

      return response.data.data!.summary;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH HEATMAP DATA
  // ==========================================================================
  const heatmapQuery = useQuery({
    queryKey: queryKeys.tracker.heatmap(new Date().getFullYear()),
    queryFn: async (): Promise<HeatmapData[]> => {
      const response = await apiClient.get<ApiResponse<{ heatmap: HeatmapData[] }>>(
        '/tracker/heatmap'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch heatmap');
      }

      return response.data.data!.heatmap;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // CREATE ENTRY
  // ==========================================================================
  const createMutation = useMutation({
    mutationKey: ['tracker', 'create'],
    mutationFn: async (data: TrackerEntryInput): Promise<TrackerEntry> => {
      const response = await apiClient.post<ApiResponse<{ entry: TrackerEntry }>>(
        '/tracker',
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to create entry');
      }

      return response.data.data!.entry;
    },
    onSuccess: () => {
      // Invalidate all tracker-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.streak.all });
    },
  });

  const createEntry = useCallback(
    async (data: TrackerEntryInput) => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  // ==========================================================================
  // UPDATE ENTRY
  // ==========================================================================
  const updateMutation = useMutation({
    mutationKey: ['tracker', 'update'],
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: Partial<TrackerEntryInput>
    }): Promise<TrackerEntry> => {
      const response = await apiClient.put<ApiResponse<{ entry: TrackerEntry }>>(
        `/tracker/${id}`,
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update entry');
      }

      return response.data.data!.entry;
    },
    onSuccess: (updatedEntry) => {
      // Update entry in cache
      queryClient.setQueryData(
        queryKeys.tracker.entry(updatedEntry.id),
        updatedEntry
      );
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.entries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.stats() });
    },
  });

  const updateEntry = useCallback(
    async (id: string, data: Partial<TrackerEntryInput>) => {
      return updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  // ==========================================================================
  // DELETE ENTRY
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationKey: ['tracker', 'delete'],
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/tracker/${id}`);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const deleteEntry = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // ==========================================================================
  // BULK CREATE
  // ==========================================================================
  const bulkCreateMutation = useMutation({
    mutationKey: ['tracker', 'bulkCreate'],
    mutationFn: async (entries: TrackerEntryInput[]): Promise<BulkOperationResult> => {
      const response = await apiClient.post<ApiResponse<BulkOperationResult>>(
        '/tracker/bulk',
        { entries }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to create entries');
      }

      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const bulkCreate = useCallback(
    async (entries: TrackerEntryInput[]) => {
      return bulkCreateMutation.mutateAsync(entries);
    },
    [bulkCreateMutation]
  );

  // ==========================================================================
  // BULK DELETE
  // ==========================================================================
  const bulkDeleteMutation = useMutation({
    mutationKey: ['tracker', 'bulkDelete'],
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      const response = await apiClient.post<ApiResponse<BulkOperationResult>>(
        '/tracker/batch-delete',
        { ids }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to delete entries');
      }

      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      return bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    entries,
    recentEntries: recentQuery.data ?? [],
    stats: statsQuery.data ?? null,
    summary: summaryQuery.data ?? null,
    heatmap: heatmapQuery.data ?? [],

    // Pagination
    hasNextPage: entriesQuery.hasNextPage,
    fetchNextPage: entriesQuery.fetchNextPage,
    isFetchingNextPage: entriesQuery.isFetchingNextPage,

    // Loading states
    isLoading: entriesQuery.isLoading,
    isLoadingRecent: recentQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingSummary: summaryQuery.isLoading,
    isLoadingHeatmap: heatmapQuery.isLoading,

    // Error states
    error: entriesQuery.error,
    recentError: recentQuery.error,
    statsError: statsQuery.error,

    // Actions
    createEntry,
    updateEntry,
    deleteEntry,
    bulkCreate,
    bulkDelete,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
    },

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkCreating: bulkCreateMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,

    // Mutation errors
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  }), [
    entries,
    recentQuery.data,
    recentQuery.isLoading,
    recentQuery.error,
    statsQuery.data,
    statsQuery.isLoading,
    statsQuery.error,
    summaryQuery.data,
    summaryQuery.isLoading,
    heatmapQuery.data,
    heatmapQuery.isLoading,
    entriesQuery.isLoading,
    entriesQuery.error,
    entriesQuery.hasNextPage,
    entriesQuery.fetchNextPage,
    entriesQuery.isFetchingNextPage,
    createEntry,
    updateEntry,
    deleteEntry,
    bulkCreate,
    bulkDelete,
    createMutation.isPending,
    createMutation.error,
    updateMutation.isPending,
    updateMutation.error,
    deleteMutation.isPending,
    deleteMutation.error,
    bulkCreateMutation.isPending,
    bulkDeleteMutation.isPending,
    queryClient,
  ]);
}

// =============================================================================
// SINGLE ENTRY HOOK
// =============================================================================

export function useTrackerEntry(id: string) {
  const query = useQuery({
    queryKey: queryKeys.tracker.entry(id),
    queryFn: async (): Promise<TrackerEntry> => {
      const response = await apiClient.get<ApiResponse<{ entry: TrackerEntry }>>(
        `/tracker/${id}`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Entry not found');
      }

      return response.data.data!.entry;
    },
    enabled: !!id,
  });

  return {
    entry: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// DAILY ENTRY HOOK
// =============================================================================

export function useDailyEntry(date: string) {
  const query = useQuery({
    queryKey: queryKeys.tracker.daily(date),
    queryFn: async (): Promise<TrackerEntry | null> => {
      const response = await apiClient.get<ApiResponse<{ entry: TrackerEntry | null }>>(
        '/tracker/daily',
        { date }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch daily entry');
      }

      return response.data.data!.entry;
    },
    enabled: !!date,
  });

  return {
    entry: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useTracker;