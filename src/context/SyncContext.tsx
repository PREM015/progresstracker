'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { SyncState, SyncJob, SyncTriggerResponse } from '@/types/sync';
import { useToast } from '@/hooks/useToast';

interface SyncContextType {
  syncState: SyncState | null;
  isLoading: boolean;
  isSyncing: boolean;
  currentJob: SyncJob | null;
  triggerSync: (platforms?: string[]) => Promise<SyncTriggerResponse>;
  triggerPlatformSync: (platformId: string) => Promise<void>;
  cancelSync: (jobId: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [currentJob, setCurrentJob] = useState<SyncJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * SAFE STATUS FETCH
   * - no throw
   * - no SSR
   * - correct endpoint
   */
  const refreshStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const res = await fetch('/api/sync/status', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        setSyncState(null);
        setCurrentJob(null);
        return;
      }

      const data = await res.json();
      setSyncState(data ?? null);
      setCurrentJob(data?.currentJob ?? null);
    } catch {
      setSyncState(null);
      setCurrentJob(null);
    }
  }, []);

  /**
   * INITIAL LOAD
   */
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  /**
   * JOB POLLING (ONLY WHEN RUNNING)
   */
  useEffect(() => {
    if (!currentJob || currentJob.status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/status?jobId=${currentJob.id}`, {
          cache: 'no-store',
        });

        if (!res.ok) return;

        const data = await res.json();
        const job = data.job ?? data;

        setCurrentJob(job);

        if (job.status !== 'running') {
          clearInterval(interval);
          await refreshStatus();

          if (job.status === 'success') {
            toast({
              title: 'Sync Complete',
              description: 'All platforms synced successfully',
              variant: 'success',
            });
          } else if (job.status === 'partial') {
            toast({
              title: 'Partial Sync',
              description: 'Some platforms failed to sync',
              variant: 'warning',
            });
          } else {
            toast({
              title: 'Sync Failed',
              description: job.error || 'Sync failed',
              variant: 'error',
            });
          }
        }
      } catch {
        // silent
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJob, refreshStatus, toast]);

  /**
   * TRIGGER FULL SYNC
   */
  const triggerSync = useCallback(
    async (platforms?: string[]): Promise<SyncTriggerResponse> => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platforms }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to start sync');
        }

        if (data.jobId) {
          setCurrentJob({
            id: data.jobId,
            userId: '',
            status: 'running',
            progress: 0,
            totalPlatforms: data.platformCount ?? 0,
            completedPlatforms: 0,
            failedPlatforms: 0,
            startedAt: new Date(),
          });
        }

        toast({
          title: 'Sync Started',
          description: data.message || 'Sync started',
          variant: 'default',
        });

        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * TRIGGER SINGLE PLATFORM SYNC
   */
  const triggerPlatformSync = useCallback(
    async (platformId: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sync/${platformId}`, {
          method: 'POST',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Platform sync failed');
        }

        toast({
          title: 'Sync Complete',
          description: `${data.platform || 'Platform'} synced`,
          variant: 'success',
        });

        await refreshStatus();
      } finally {
        setIsLoading(false);
      }
    },
    [toast, refreshStatus]
  );

  /**
   * CANCEL SYNC
   */
  const cancelSync = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/sync?jobId=${jobId}`, {
          method: 'DELETE',
        });

        if (!res.ok) return;

        setCurrentJob(null);
        await refreshStatus();

        toast({
          title: 'Sync Cancelled',
          description: 'Sync job cancelled',
          variant: 'default',
        });
      } catch {
        // silent
      }
    },
    [toast, refreshStatus]
  );

  const isSyncing =
    currentJob?.status === 'running' || syncState?.isRunning || false;

  return (
    <SyncContext.Provider
      value={{
        syncState,
        isLoading,
        isSyncing,
        currentJob,
        triggerSync,
        triggerPlatformSync,
        cancelSync,
        refreshStatus,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return ctx;
}
