// ============================================================================
// FILE: src/hooks/useSync.ts
// PURPOSE: Sync operations hook - trigger sync, status, history
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo, useState } from 'react';
import { SyncService } from '@/services/api/sync.service';
import { queryKeys } from './keys';
import type { SyncStatus } from '@/types/platform';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SyncStatusData {
  isRunning: boolean;
  currentPlatform: string | null;
  progress: number;
  message: string | null;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  queuedPlatforms: string[];
}

interface SyncLogEntry {
  id: string;
  platformId: string;
  platformName: string;
  platformIcon: string | null;
  status: SyncStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  hasError: boolean;
  errorMessage: string | null;
  triggeredBy: string;
}

interface SyncResult {
  platformId: string;
  success: boolean;
  status: SyncStatus;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  duration: number;
  error?: string;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSync() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  const [syncProgress, setSyncProgress] = useState<SyncStatusData | null>(null);

  // ==========================================================================
  // FETCH SYNC STATUS
  // ==========================================================================
  const statusQuery = useQuery({
    queryKey: queryKeys.sync.status(),
    queryFn: () => SyncService.getStatus(),
    enabled: isAuthenticated,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      return query.state.data?.isRunning ? 2000 : 30000;
    },
  });

  // Removed useEffect that set syncProgress from statusQuery.data to avoid cascading renders

  // ==========================================================================
  // FETCH SYNC HISTORY
  // ==========================================================================
  const historyQuery = useQuery({
    queryKey: queryKeys.sync.history(20),
    queryFn: () => SyncService.getHistory(20),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  // ==========================================================================
  // FETCH SYNC QUEUE
  // ==========================================================================
  const queueQuery = useQuery({
    queryKey: queryKeys.sync.queue(),
    queryFn: () => SyncService.getQueue(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  // ==========================================================================
  // TRIGGER SYNC FOR PLATFORM
  // ==========================================================================
  const syncPlatformMutation = useMutation({
    mutationKey: ['sync', 'platform'],
    mutationFn: (platformId: string) => SyncService.syncPlatform(platformId),
    onMutate: () => {
      setSyncProgress(prev => prev ? { ...prev, isRunning: true } : null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
    },
    onSettled: () => {
      statusQuery.refetch();
    },
  });

  const syncPlatform = useCallback(
    async (platformId: string) => {
      return syncPlatformMutation.mutateAsync(platformId);
    },
    [syncPlatformMutation]
  );

  // ==========================================================================
  // TRIGGER SYNC ALL
  // ==========================================================================
  const syncAllMutation = useMutation({
    mutationKey: ['sync', 'all'],
    mutationFn: () => SyncService.syncAll(),
    onMutate: () => {
      setSyncProgress(prev => prev ? { ...prev, isRunning: true } : null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
    },
    onSettled: () => {
      statusQuery.refetch();
    },
  });

  const syncAll = useCallback(async () => {
    return syncAllMutation.mutateAsync();
  }, [syncAllMutation]);

  // ==========================================================================
  // CANCEL SYNC
  // ==========================================================================
  const cancelMutation = useMutation({
    mutationKey: ['sync', 'cancel'],
    mutationFn: (syncId?: string) => SyncService.cancel(syncId),
    onSuccess: () => {
      setSyncProgress(prev => prev ? { ...prev, isRunning: false } : null);
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.status() });
    },
  });

  const cancelSync = useCallback(
    async (syncId?: string) => {
      return cancelMutation.mutateAsync(syncId);
    },
    [cancelMutation]
  );

  // ==========================================================================
  // RETRY FAILED SYNC
  // ==========================================================================
  const retryMutation = useMutation({
    mutationKey: ['sync', 'retry'],
    mutationFn: (syncLogId: string) => SyncService.retry(syncLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
    },
  });

  const retrySync = useCallback(
    async (syncLogId: string) => {
      return retryMutation.mutateAsync(syncLogId);
    },
    [retryMutation]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    status: syncProgress ?? statusQuery.data ?? null,
    history: historyQuery.data ?? [],
    queue: queueQuery.data ?? [],

    // Computed
    isRunning: syncProgress?.isRunning ?? statusQuery.data?.isRunning ?? false,
    currentPlatform: syncProgress?.currentPlatform ?? null,
    progress: syncProgress?.progress ?? 0,
    lastSyncAt: statusQuery.data?.lastSyncAt ?? null,
    nextSyncAt: statusQuery.data?.nextSyncAt ?? null,

    // Loading states
    isLoading: statusQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    isLoadingQueue: queueQuery.isLoading,

    // Error states
    error: statusQuery.error,
    historyError: historyQuery.error,

    // Actions
    syncPlatform,
    syncAll,
    cancelSync,
    retrySync,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
    },

    // Mutation states
    isSyncing: syncPlatformMutation.isPending,
    isSyncingAll: syncAllMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isRetrying: retryMutation.isPending,

    // Mutation errors
    syncError: syncPlatformMutation.error,
    syncAllError: syncAllMutation.error,

    // Convenience
    hasPendingSync: (queueQuery.data?.length ?? 0) > 0,
    recentFailures: historyQuery.data?.filter(l => l.hasError).slice(0, 5) ?? [],
  }), [
    syncProgress,
    statusQuery.data,
    statusQuery.isLoading,
    statusQuery.error,
    historyQuery.data,
    historyQuery.isLoading,
    historyQuery.error,
    queueQuery.data,
    queueQuery.isLoading,
    syncPlatform,
    syncAll,
    cancelSync,
    retrySync,
    syncPlatformMutation.isPending,
    syncPlatformMutation.error,
    syncAllMutation.isPending,
    syncAllMutation.error,
    cancelMutation.isPending,
    retryMutation.isPending,
    queryClient,
  ]);
}

export default useSync;