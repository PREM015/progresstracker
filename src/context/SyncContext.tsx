// src/context/SyncContext.tsx

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<SyncJob | null>(null);
  const { toast } = useToast();

  // Fetch sync status
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync');
      if (!response.ok) throw new Error('Failed to fetch sync status');
      
      const data = await response.json();
      setSyncState(data);
      setCurrentJob(data.currentJob || null);
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }, []);

  // Poll for job status when syncing
  useEffect(() => {
    if (!currentJob || currentJob.status !== 'running') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sync?jobId=${currentJob.id}`);
        if (response.ok) {
          const job = await response.json();
          setCurrentJob(job);

          if (job.status !== 'running') {
            clearInterval(pollInterval);
            await refreshStatus();

            // Show toast based on status
            if (job.status === 'success') {
              toast({
                title: 'Sync Complete',
                description: `Successfully synced ${job.completedPlatforms} platform(s)`,
                variant: 'success',
              });
            } else if (job.status === 'partial') {
              toast({
                title: 'Sync Partially Complete',
                description: `${job.completedPlatforms} succeeded, ${job.failedPlatforms} failed`,
                variant: 'warning',
              });
            } else if (job.status === 'failed') {
              toast({
                title: 'Sync Failed',
                description: job.error || 'Failed to sync platforms',
                variant: 'error',
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentJob, refreshStatus, toast]);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Trigger sync for all or specific platforms
  const triggerSync = useCallback(async (platforms?: string[]): Promise<SyncTriggerResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger sync');
      }

      // Set current job for polling
      if (data.jobId) {
        setCurrentJob({
          id: data.jobId,
          userId: '',
          status: 'running',
          progress: 0,
          totalPlatforms: data.platformCount || 0,
          completedPlatforms: 0,
          failedPlatforms: 0,
          startedAt: new Date(),
        });
      }

      toast({
        title: 'Sync Started',
        description: data.message,
        variant: 'default',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'error',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Trigger sync for single platform
  const triggerPlatformSync = useCallback(async (platformId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sync/${platformId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync platform');
      }

      toast({
        title: 'Sync Complete',
        description: `${data.platform}: ${data.entriesAdded} new entries`,
        variant: 'success',
      });

      await refreshStatus();
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'error',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, refreshStatus]);

  // Cancel sync job
  const cancelSync = useCallback(async (jobId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/sync?jobId=${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel sync');
      }

      setCurrentJob(null);
      await refreshStatus();

      toast({
        title: 'Sync Cancelled',
        description: 'The sync job has been cancelled',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Cancel Failed',
        description: error.message,
        variant: 'error',
      });
    }
  }, [toast, refreshStatus]);

  const isSyncing = currentJob?.status === 'running' || syncState?.isRunning || false;

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
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

export default SyncContext;