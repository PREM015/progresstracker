// src/services/sseSyncService.ts
/**
 * SSE Sync Service
 * Helper service for sending sync updates via SSE
 */

import { logger } from '@/lib/logger';
import { sseConnectionManager } from './sseConnectionManager';
import {
  SSEEventTypes,
  generateEventId,
  SSESyncProgressPayload,
  SSESyncCompletedPayload,
} from '@/lib/sse';

const log = logger.child({ service: 'SSESyncService' });

class SSESyncService {
  /**
   * Send sync queued notification
   */
  sendSyncQueued(
    userId: string,
    syncId: string,
    platformId: string,
    platformName: string,
    position?: number
  ): { sent: number; failed: number } {
    log.debug('Sync queued SSE', { userId, syncId, platformId });

    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.SYNC_QUEUED,
      data: {
        syncId,
        platformId,
        platformName,
        status: 'queued',
        position,
        queuedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Send sync started notification
   */
  sendSyncStarted(
    userId: string,
    syncId: string,
    platformId: string,
    platformName: string
  ): { sent: number; failed: number } {
    log.debug('Sync started SSE', { userId, syncId, platformId });

    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.SYNC_STARTED,
      data: {
        syncId,
        platformId,
        platformName,
        status: 'in_progress',
        progress: 0,
        itemsProcessed: 0,
        totalItems: 0,
        startedAt: new Date().toISOString(),
      } as SSESyncProgressPayload,
    });
  }

  /**
   * Send sync progress update
   */
  sendSyncProgress(userId: string, progress: SSESyncProgressPayload): { sent: number; failed: number } {
    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.SYNC_PROGRESS,
      data: progress,
    });
  }

  /**
   * Send sync completed notification
   */
  sendSyncCompleted(userId: string, result: SSESyncCompletedPayload): { sent: number; failed: number } {
    const event =
      result.status === 'failed'
        ? SSEEventTypes.SYNC_FAILED
        : result.status === 'partial'
        ? SSEEventTypes.SYNC_PARTIAL
        : SSEEventTypes.SYNC_COMPLETED;

    log.info('Sync completed SSE', {
      userId,
      syncId: result.syncId,
      platformId: result.platformId,
      status: result.status,
    });

    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event,
      data: result,
    });
  }

  /**
   * Send sync cancelled notification
   */
  sendSyncCancelled(
    userId: string,
    syncId: string,
    platformId: string,
    platformName: string,
    reason?: string
  ): { sent: number; failed: number } {
    log.info('Sync cancelled SSE', { userId, syncId, platformId, reason });

    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.SYNC_CANCELLED,
      data: {
        syncId,
        platformId,
        platformName,
        reason,
        cancelledAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Send platform synced notification (for multi-platform sync)
   */
  sendPlatformSynced(
    userId: string,
    platformId: string,
    platformName: string,
    success: boolean,
    stats: {
      itemsCreated: number;
      itemsUpdated: number;
      itemsFailed: number;
      duration: number;
    },
    error?: string
  ): { sent: number; failed: number } {
    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: success ? SSEEventTypes.PLATFORM_SYNCED : SSEEventTypes.PLATFORM_ERROR,
      data: {
        platformId,
        platformName,
        success,
        ...stats,
        error,
        completedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Send platform connected notification
   */
  sendPlatformConnected(
    userId: string,
    platformId: string,
    platformName: string,
    username?: string
  ): { sent: number; failed: number } {
    log.info('Platform connected SSE', { userId, platformId, platformName });

    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.PLATFORM_CONNECTED,
      data: {
        platformId,
        platformName,
        username,
        connectedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Send platform disconnected notification
   */
  sendPlatformDisconnected(
    userId: string,
    platformId: string,
    platformName: string,
    reason?: string
  ): { sent: number; failed: number } {
    log.info('Platform disconnected SSE', { userId, platformId, platformName, reason });

    return sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.PLATFORM_DISCONNECTED,
      data: {
        platformId,
        platformName,
        reason,
        disconnectedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a progress tracker for sync operations
   */
  createProgressTracker(
    userId: string,
    syncId: string,
    platformId: string,
    platformName: string,
    totalItems: number
  ) {
    let processedItems = 0;
    let lastSentProgress = 0;
    const startTime = Date.now();

    return {
      /**
       * Update progress
       */
      update: (
        itemsProcessed: number,
        options?: { currentItem?: string; message?: string }
      ) => {
        processedItems = itemsProcessed;
        const progress = totalItems > 0
          ? Math.round((processedItems / totalItems) * 100)
          : 0;

        // Only send if progress changed by 5% or at 100%
        if (progress - lastSentProgress >= 5 || progress === 100) {
          lastSentProgress = progress;

          const elapsed = Date.now() - startTime;
          const rate = processedItems / (elapsed / 1000); // items per second
          const remaining = totalItems - processedItems;
          const eta = rate > 0 ? Math.round(remaining / rate) : undefined;

          this.sendSyncProgress(userId, {
            syncId,
            platformId,
            platformName,
            status: 'in_progress',
            progress,
            itemsProcessed,
            totalItems,
            currentItem: options?.currentItem,
            message: options?.message,
            startedAt: new Date(startTime).toISOString(),
            estimatedCompletion: eta
              ? new Date(Date.now() + eta * 1000).toISOString()
              : undefined,
          });
        }
      },

      /**
       * Increment progress by 1
       */
      increment: (options?: { currentItem?: string; message?: string }) => {
        processedItems++;
        const progress = totalItems > 0
          ? Math.round((processedItems / totalItems) * 100)
          : 0;

        if (progress - lastSentProgress >= 5 || progress === 100) {
          lastSentProgress = progress;
          this.sendSyncProgress(userId, {
            syncId,
            platformId,
            platformName,
            status: 'in_progress',
            progress,
            itemsProcessed: processedItems,
            totalItems,
            currentItem: options?.currentItem,
            message: options?.message,
            startedAt: new Date(startTime).toISOString(),
          });
        }
      },

      /**
       * Mark as completed
       */
      complete: (result: {
        itemsCreated: number;
        itemsUpdated: number;
        itemsSkipped: number;
        itemsFailed: number;
        message?: string;
        stats?: Record<string, number>;
      }) => {
        const duration = Date.now() - startTime;

        this.sendSyncCompleted(userId, {
          syncId,
          platformId,
          platformName,
          status: result.itemsFailed > 0 && result.itemsFailed === totalItems
            ? 'failed'
            : result.itemsFailed > 0
            ? 'partial'
            : 'success',
          ...result,
          duration,
          completedAt: new Date().toISOString(),
        });
      },

      /**
       * Mark as failed
       */
      fail: (errorMessage: string) => {
        const duration = Date.now() - startTime;

        this.sendSyncCompleted(userId, {
          syncId,
          platformId,
          platformName,
          status: 'failed',
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          itemsFailed: processedItems,
          duration,
          message: errorMessage,
          completedAt: new Date().toISOString(),
        });
      },

      /**
       * Mark as cancelled
       */
      cancel: (reason?: string) => {
        this.sendSyncCancelled(userId, syncId, platformId, platformName, reason);
      },
    };
  }

  /**
   * Check if user has active sync SSE connections
   */
  hasActiveConnection(userId: string): boolean {
    const connections = sseConnectionManager.getUserConnections(userId);
    return connections.some(c => c.channel === 'sync');
  }

  /**
   * Get user's sync channel connection count
   */
  getSyncConnections(userId: string): number {
    const connections = sseConnectionManager.getUserConnections(userId);
    return connections.filter(c => c.channel === 'sync').length;
  }
}

export const sseSyncService = new SSESyncService();
export default sseSyncService;