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
import { TrackerService } from '@/services/api/tracker.service';
import { queryKeys } from './keys';
import type {
  TrackerEntry,
  TrackerEntryInput,
  TrackerFilter,
} from '@/types/tracker';

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
    queryFn: ({ pageParam = 1 }) =>
      TrackerService.getEntries({ ...filters, page: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage?.pagination?.hasNextPage) return undefined;
      return lastPage.pagination.page + 1;
    },
    initialPageParam: 1,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Flatten entries from all pages
  const entries = useMemo(() => {
    return entriesQuery.data?.pages.flatMap(page => page.data) ?? [];
  }, [entriesQuery.data]);

  // ==========================================================================
  // FETCH RECENT ENTRIES
  // ==========================================================================
  const recentQuery = useQuery({
    queryKey: queryKeys.tracker.recent(10),
    queryFn: () => TrackerService.getRecent(10),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // ==========================================================================
  // FETCH STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.tracker.stats(),
    queryFn: () => TrackerService.getStats(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH SUMMARY
  // ==========================================================================
  const summaryQuery = useQuery({
    queryKey: queryKeys.tracker.summary(),
    queryFn: () => TrackerService.getSummary(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH HEATMAP DATA
  // ==========================================================================
  const heatmapQuery = useQuery({
    queryKey: queryKeys.tracker.heatmap(filters.year || new Date().getFullYear()),
    queryFn: () => TrackerService.getHeatmap(filters.year || new Date().getFullYear()),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // CREATE ENTRY
  // ==========================================================================
  const createMutation = useMutation({
    mutationKey: ['tracker', 'create'],
    mutationFn: (data: TrackerEntryInput) => TrackerService.createEntry(data),
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
    mutationFn: ({
      id,
      data
    }: {
      id: string;
      data: Partial<TrackerEntryInput>
    }) => TrackerService.updateEntry(id, data),
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
    mutationFn: (id: string) => TrackerService.deleteEntry(id),
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
    mutationFn: (entries: TrackerEntryInput[]) => TrackerService.bulkCreate(entries),
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
    mutationFn: (ids: string[]) => TrackerService.bulkDelete(ids),
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
  // DERIVED STATISTICS (MEMOIZED)
  // ==========================================================================
  const computedStats = useMemo(() => {
    // Safety check for entries
    const safeEntries = Array.isArray(entries) ? entries : [];
    if (!safeEntries.length) return null;

    const total = safeEntries.length;
    const avgDifficulty = safeEntries.reduce((acc: number, curr: any) => acc + (curr?.averageDifficulty || 0), 0) / total;
    const verifiedCount = safeEntries.filter((e: any) => e?.isVerified).length;
    const verificationRate = (verifiedCount / total) * 100;

    // Category distribution
    const categories: Record<string, number> = {};
    safeEntries.forEach((e: any) => {
      if (e?.category) {
        categories[e.category] = (categories[e.category] || 0) + 1;
      }
    });

    return {
      total,
      avgDifficulty,
      verificationRate,
      categories,
      lastEntry: safeEntries[0] || null
    };
  }, [entries]);

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
    computedStats, // New memoized computed data

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
    summaryError: summaryQuery.error, // Added summaryError


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
    summaryQuery.error, // Added to deps
    heatmapQuery.data,
    heatmapQuery.isLoading,
    computedStats, // Added to deps
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
    queryFn: () => TrackerService.getEntry(id),
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
    queryFn: () => TrackerService.getDailyEntry(date),
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