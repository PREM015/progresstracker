// src/app/api/sse/sync/route.ts
/**
 * SSE Sync Status Stream
 * 
 * GET /api/sse/sync - Subscribe to real-time sync status updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  createSSEStream,
  getSSEHeaders,
  SSEEventTypes,
  generateEventId,
  SSESyncProgressPayload,
} from '@/lib/sse';
import { sseConnectionManager } from '@/services/sseConnectionManager';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/sync' });

const CHANNEL = 'sync';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RETRY_INTERVAL = 5000; // 5 seconds

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
    lastEventId: req.headers.get('Last-Event-ID'),
  };
}

/**
 * Get current sync status for all user platforms
 */
async function getCurrentSyncStatus(userId: string): Promise<SSESyncProgressPayload[]> {
  const userPlatforms = await prisma.userPlatform.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      platformId: true,
      syncStatus: true,
      lastSyncedAt: true,
      lastSyncError: true,
      consecutiveFailures: true,
      platform: {
        select: {
          name: true,
          displayName: true,
        },
      },
    },
  });

  // Get any in-progress sync logs
  const inProgressSyncs = await prisma.syncLog.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    select: {
      id: true,
      platformId: true,
      status: true,
      startedAt: true,
      itemsFound: true,
      itemsCreated: true,
      itemsUpdated: true,
    },
  });

  const inProgressMap = new Map(
    inProgressSyncs.map(s => [s.platformId, s])
  );

  return userPlatforms.map(up => {
    const inProgress = inProgressMap.get(up.platformId);
    const platformName = up.platform.displayName || up.platform.name;

    if (inProgress) {
      const totalItems = inProgress.itemsFound || 0;
      const processedItems = (inProgress.itemsCreated || 0) + (inProgress.itemsUpdated || 0);
      const progress = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;

      return {
        syncId: inProgress.id,
        platformId: up.platformId,
        platformName,
        status: inProgress.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
        progress,
        itemsProcessed: processedItems,
        totalItems,
        startedAt: inProgress.startedAt.toISOString(),
      } as SSESyncProgressPayload;
    }

    // No active sync
    return {
      syncId: '',
      platformId: up.platformId,
      platformName,
      status: 'completed',
      progress: 100,
      itemsProcessed: 0,
      totalItems: 0,
      message: up.lastSyncedAt
        ? `Last synced: ${up.lastSyncedAt.toISOString()}`
        : 'Never synced',
      startedAt: up.lastSyncedAt?.toISOString() || '',
    } as SSESyncProgressPayload;
  });
}

/**
 * Get recent sync activity
 */
async function getRecentSyncActivity(userId: string, limit: number = 10) {
  const recentSyncs = await prisma.syncLog.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      platformId: true,
      status: true,
      startedAt: true,
      completedAt: true,
      duration: true,
      itemsCreated: true,
      itemsUpdated: true,
      itemsSkipped: true,
      itemsFailed: true,
      hasError: true,
      errorMessage: true,
      platform: {
        select: {
          name: true,
          displayName: true,
        },
      },
    },
  });

  return recentSyncs.map(s => ({
    syncId: s.id,
    platformId: s.platformId,
    platformName: s.platform?.displayName || s.platform?.name || 'Unknown',
    status: s.status.toLowerCase(),
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString(),
    duration: s.duration,
    itemsCreated: s.itemsCreated,
    itemsUpdated: s.itemsUpdated,
    itemsSkipped: s.itemsSkipped,
    itemsFailed: s.itemsFailed,
    hasError: s.hasError,
    errorMessage: s.errorMessage,
  }));
}

// =============================================================================
// GET - SSE Stream for Sync Status
// =============================================================================

export async function GET(req: NextRequest) {
  const { requestId, lastEventId, userAgent, ip } = getRequestContext(req);

  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
        }
      );
    }

    const userId = session.user.id;
    const clientId = crypto.randomUUID();

    log.info('SSE sync connection requested', {
      userId,
      clientId,
      lastEventId,
      ip,
    });

    // 2. Create SSE stream
    const { stream, controller, send, close, getStats } = createSSEStream({
      heartbeatInterval: HEARTBEAT_INTERVAL,
      retryInterval: RETRY_INTERVAL,
      onClose: () => {
        sseConnectionManager.removeConnection(clientId);
        log.info('SSE sync connection closed', { userId, clientId });
      },
      onError: (error) => {
        log.error('SSE sync error', { userId, clientId }, error);
        sseConnectionManager.removeConnection(clientId);
      },
    });

    // 3. Register connection
    sseConnectionManager.addConnection({
      id: clientId,
      userId,
      controller,
      createdAt: new Date(),
      lastPing: new Date(),
      channel: CHANNEL,
      metadata: { userAgent, ip },
      ...getStats(),
    });

    // 4. Send initial sync status
    setTimeout(async () => {
      try {
        // Send current sync status for all platforms
        const syncStatuses = await getCurrentSyncStatus(userId);
        for (const status of syncStatuses) {
          if (status.status === 'in_progress' || status.status === 'pending') {
            send({
              id: generateEventId(),
              event: SSEEventTypes.SYNC_PROGRESS,
              data: status,
            });
          }
        }

        // Send recent sync activity
        const recentActivity = await getRecentSyncActivity(userId, 5);
        send({
          id: generateEventId(),
          event: 'sync:history',
          data: {
            recentSyncs: recentActivity,
            timestamp: new Date().toISOString(),
          },
        });

      } catch (error) {
        log.error('Failed to send initial sync status', { userId, clientId }, error);
      }
    }, 100);

    // 5. Return SSE response
    return new Response(stream, {
      status: 200,
      headers: getSSEHeaders({
        'X-Request-ID': requestId,
        'X-Client-ID': clientId,
      }),
    });

  } catch (error) {
    log.error('SSE sync connection failed', {}, error);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to establish SSE connection',
        code: 'INTERNAL_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      }
    );
  }
}

// =============================================================================
// OPTIONS - CORS preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}