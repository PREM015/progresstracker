import { httpClient } from '@/lib/http-client';
import type { SyncStatus } from '@/types/platform';

// =============================================================================
// TYPES
// =============================================================================

export interface SyncStatusData {
    isRunning: boolean;
    currentPlatform: string | null;
    progress: number;
    message: string | null;
    lastSyncAt: Date | null;
    nextSyncAt: Date | null;
    queuedPlatforms: string[];
}

export interface SyncLogEntry {
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

export interface SyncResult {
    platformId: string;
    success: boolean;
    status: SyncStatus;
    itemsFound: number;
    itemsCreated: number;
    itemsUpdated: number;
    duration: number;
    error?: string;
}

export interface SyncQueueItem {
    platform: string;
    scheduledAt: Date;
}

// =============================================================================
// SERVICE
// =============================================================================

export const SyncService = {
    /**
     * Get current sync status
     */
    getStatus: async (): Promise<SyncStatusData> => {
        const response = await httpClient.get<{ status: SyncStatusData }>('/api/sync/status');
        return response.status;
    },

    /**
     * Get sync history
     */
    getHistory: async (limit: number = 20): Promise<SyncLogEntry[]> => {
        const response = await httpClient.get<{ logs: SyncLogEntry[] }>(
            '/api/sync/history',
            { params: { limit: String(limit) } }
        );
        return response.logs;
    },

    /**
     * Get sync queue
     */
    getQueue: async (): Promise<SyncQueueItem[]> => {
        const response = await httpClient.get<{ queue: SyncQueueItem[] }>('/api/sync/queue');
        return response.queue;
    },

    /**
     * Trigger sync for a specific platform
     */
    syncPlatform: async (platformId: string): Promise<SyncResult> => {
        const response = await httpClient.post<{ result: SyncResult }>(`/api/sync/${platformId}`);
        return response.result;
    },

    /**
     * Trigger sync for all platforms
     */
    syncAll: async (): Promise<SyncResult[]> => {
        const response = await httpClient.post<{ results: SyncResult[] }>('/api/sync/trigger-all');
        return response.results;
    },

    /**
     * Cancel running sync
     */
    cancel: async (syncId?: string): Promise<void> => {
        await httpClient.post('/api/sync/cancel', syncId ? { syncId } : undefined);
    },

    /**
     * Retry a failed sync
     */
    retry: async (syncLogId: string): Promise<SyncResult> => {
        const response = await httpClient.post<{ result: SyncResult }>(`/api/sync/retry/${syncLogId}`);
        return response.result;
    },
};
