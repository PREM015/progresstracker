// src/hooks/useSync.ts

import { useState, useCallback } from 'react';
import { SyncState, SyncJob, SyncLog } from '@/types/sync';

interface UseSyncOptions {
  onSyncComplete?: (job: SyncJob) => void;
  onSyncError?: (error: Error) => void;
}

interface UseSyncReturn {
  syncState: SyncState | null;
  currentJob: SyncJob | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  syncAll: () => Promise<void>;
  syncPlatform: (platformId: string) => Promise<void>;
  cancelSync: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  getSyncHistory: (platformId?: string) => Promise<SyncLog[]>;
}

export function useSync(options?: UseSyncOptions): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [currentJob, setCurrentJob] = useState<SyncJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/sync');
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }

      const data = await response.json();
      setSyncState(data);
      setCurrentJob(data.currentJob || null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger sync');
      }

      const data = await response.json();
      
      // Start polling for job status
      if (data.jobId) {
        pollJobStatus(data.jobId);
      }
    } catch (err: any) {
      setError(err);
      options?.onSyncError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const syncPlatform = useCallback(async (platformId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/sync/${platformId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sync platform');
      }

      await refreshStatus();
    } catch (err: any) {
      setError(err);
      options?.onSyncError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus, options]);

  const cancelSync = useCallback(async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(`/api/sync?jobId=${currentJob.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel sync');
      }

      setCurrentJob(null);
      await refreshStatus();
    } catch (err: any) {
      setError(err);
    }
  }, [currentJob, refreshStatus]);

  const getSyncHistory = useCallback(async (platformId?: string): Promise<SyncLog[]> => {
    try {
      const url = platformId 
        ? `/api/sync/${platformId}` 
        : '/api/sync';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch sync history');
      }

      const data = await response.json();
      return data.recentLogs || [];
    } catch (err: any) {
      setError(err);
      return [];
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/sync?jobId=${jobId}`);
        if (!response.ok) return;

        const job = await response.json();
        setCurrentJob(job);

        if (job.status === 'running') {
          setTimeout(poll, 2000);
        } else {
          await refreshStatus();
          options?.onSyncComplete?.(job);
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
      }
    };

    poll();
  }, [refreshStatus, options]);

  const isSyncing = currentJob?.status === 'running' || syncState?.isRunning || false;

  return {
    syncState,
    currentJob,
    isLoading,
    isSyncing,
    error,
    syncAll,
    syncPlatform,
    cancelSync,
    refreshStatus,
    getSyncHistory,
  };
}

export default useSync;