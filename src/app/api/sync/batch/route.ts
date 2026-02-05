/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// src/app/api/sync/batch/route.ts
// =============================================================================
// Description: Batch sync operations
// Methods: GET, POST, DELETE, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: GET: 60/min, POST: 10/min, DELETE: 10/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncService } from '@/services/syncService';

import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, syncRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

import { nanoid } from 'nanoid';
import { PlatformCategory } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/batch' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const batchSyncSchema = z.object({
  platformIds: z.array(z.string().cuid()).min(1).max(20).optional(),
  categories: z.array(z.nativeEnum(PlatformCategory)).optional(),
  excludePlatformIds: z.array(z.string().cuid()).optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  force: z.boolean().default(false),
  sequential: z.boolean().default(false),
  delayBetweenMs: z.number().min(0).max(10000).default(500),
});

const batchCancelSchema = z.object({
  batchId: z.string().optional(),
  platformIds: z.array(z.string().cuid()).optional(),
  cancelAll: z.boolean().default(false),
  reason: z.string().max(500).optional(),
}).refine(
  data => data.batchId || data.platformIds || data.cancelAll,
  { message: 'Must specify batchId, platformIds, or cancelAll' }
);

const querySchema = z.object({
  batchId: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// =============================================================================
// TYPES
// =============================================================================

interface BatchJob {
  id: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  platformIds: string[];
  completedPlatformIds: string[];
  failedPlatformIds: string[];
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// In-memory batch job storage (use Redis in production)
const batchJobs = new Map<string, BatchJob>();

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return addHeaders(new NextResponse(null, { status: 204 }), generateRequestId());
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const userBatches = Array.from(batchJobs.values())
      .filter(b => b.userId === session.user.id);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Batches', String(userBatches.length));
    response.headers.set('X-Running-Batches', String(userBatches.filter(b => b.status === 'running').length));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Get Batch Jobs
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:batch:${ip}`);
    
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const userId = session.user.id;

    // Parse query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      batchId: searchParams.get('batchId'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { batchId, status, page, limit } = queryValidation.data;

    // If specific batch requested
    if (batchId) {
      const batch = batchJobs.get(batchId);
      
      if (!batch || batch.userId !== userId) {
        return addHeaders(
          apiResponse.notFound('Batch job', requestId),
          requestId,
          rateLimitResult
        );
      }

      // Get platform details
      const platforms = await prisma.platform.findMany({
        where: { id: { in: batch.platformIds } },
        select: { id: true, name: true, slug: true, icon: true },
      });
      const platformMap = new Map(platforms.map(p => [p.id, p]));

      const duration = Date.now() - startTime;

      return addHeaders(
        apiResponse.success(
          {
            ...batch,
            platforms: batch.platformIds.map(id => ({
              ...platformMap.get(id),
              completed: batch.completedPlatformIds.includes(id),
              failed: batch.failedPlatformIds.includes(id),
            })),
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Get all user batches
    let batches = Array.from(batchJobs.values())
      .filter(b => b.userId === userId);

    if (status) {
      batches = batches.filter(b => b.status === status);
    }

    // Sort by creation date
    batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = batches.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedBatches = batches.slice((page - 1) * limit, page * limit);

    const duration = Date.now() - startTime;

    const response = apiResponse.paginated(
      paginatedBatches.map(b => ({
        id: b.id,
        status: b.status,
        platformCount: b.platformIds.length,
        completedCount: b.completedPlatformIds.length,
        failedCount: b.failedPlatformIds.length,
        progress: b.progress,
        createdAt: b.createdAt,
        startedAt: b.startedAt,
        completedAt: b.completedAt,
        error: b.error,
      })),
      {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET batch failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get batch jobs', requestId), requestId);
  }
}

// =============================================================================
// POST - Create Batch Sync Job
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(syncRateLimiter, 10, `sync:batch:post:${ip}`);
    
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(300, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const userId = session.user.id;
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validation = batchSyncSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { platformIds, categories, excludePlatformIds, priority, force, sequential, delayBetweenMs } = validation.data;

    // Build platform filter
    const platformWhere: Record<string, unknown> = {
      userId,
      isActive: true,
    };

    if (platformIds && platformIds.length > 0) {
      platformWhere.platformId = { in: platformIds };
    }

    if (categories && categories.length > 0) {
      platformWhere.platform = { category: { in: categories } };
    }

    if (excludePlatformIds && excludePlatformIds.length > 0) {
      platformWhere.platformId = { 
        ...(platformWhere.platformId as object || {}),
        notIn: excludePlatformIds,
      };
    }

    // Get platforms to sync
    const userPlatforms = await prisma.userPlatform.findMany({
      where: platformWhere,
      include: { platform: { select: { id: true, name: true, slug: true } } },
    });

    if (userPlatforms.length === 0) {
      return addHeaders(
        apiResponse.success(
          { message: 'No platforms to sync', batchId: null, platformCount: 0 },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Check for running syncs
    if (!force) {
      const runningBatches = Array.from(batchJobs.values())
        .filter(b => b.userId === userId && b.status === 'running');

      if (runningBatches.length > 0) {
        return addHeaders(
          apiResponse.error(
            {
              message: 'A batch sync is already running',
              statusCode: 409,
              code: 'BATCH_IN_PROGRESS',
            },
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }
    }

    // Create batch job
    const batchId = `batch_${nanoid()}`;
    const platformIdsToSync = userPlatforms.map(p => p.platformId);

    const batchJob: BatchJob = {
      id: batchId,
      userId,
      status: 'pending',
      platformIds: platformIdsToSync,
      completedPlatformIds: [],
      failedPlatformIds: [],
      progress: 0,
      createdAt: new Date(),
    };

    batchJobs.set(batchId, batchJob);

    // Start batch sync in background
    processBatchSync(batchId, userId, userPlatforms, {
      priority,
      force,
      sequential,
      delayBetweenMs,
    }).catch(error => {
      log.error('Batch sync failed', { batchId }, error);
      const job = batchJobs.get(batchId);
      if (job) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
      }
    });

    const duration = Date.now() - startTime;
    log.info('Batch sync started', { userId, batchId, platformCount: platformIdsToSync.length, duration });

    return addHeaders(
      apiResponse.success(
        {
          batchId,
          status: 'pending',
          platformCount: platformIdsToSync.length,
          platforms: userPlatforms.map(p => ({
            id: p.platformId,
            name: p.platform.name,
            slug: p.platform.slug,
          })),
          message: `Batch sync started for ${platformIdsToSync.length} platforms`,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('POST batch failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to start batch sync', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Cancel Batch Sync
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, `sync:batch:delete:${ip}`);
    
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(
        apiResponse.unauthorized('Authentication required', requestId),
        requestId,
        rateLimitResult
      );
    }

    const userId = session.user.id;
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = batchCancelSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { batchId, platformIds, cancelAll, reason } = validation.data;
    let cancelledCount = 0;

    if (cancelAll) {
      // Cancel all running batches for user
      for (const [id, batch] of batchJobs) {
        if (batch.userId === userId && (batch.status === 'pending' || batch.status === 'running')) {
          batch.status = 'cancelled';
          batch.completedAt = new Date();
          batch.error = reason || 'Cancelled by user';
          cancelledCount++;
        }
      }

      // Also cancel individual syncs
      await SyncService.cancelSync(userId);
    } else if (batchId) {
      const batch = batchJobs.get(batchId);
      
      if (!batch || batch.userId !== userId) {
        return addHeaders(
          apiResponse.notFound('Batch job', requestId),
          requestId,
          rateLimitResult
        );
      }

      if (batch.status !== 'pending' && batch.status !== 'running') {
        return addHeaders(
          apiResponse.error(
            { message: 'Batch is not running', statusCode: 409, code: 'NOT_RUNNING' },
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }

      batch.status = 'cancelled';
      batch.completedAt = new Date();
      batch.error = reason || 'Cancelled by user';
      cancelledCount = 1;

      // Cancel underlying syncs
      for (const platformId of batch.platformIds) {
        if (!batch.completedPlatformIds.includes(platformId)) {
          await SyncService.cancelSync(userId, platformId);
        }
      }
    } else if (platformIds && platformIds.length > 0) {
      // Cancel specific platforms from running batches
      for (const [, batch] of batchJobs) {
        if (batch.userId === userId && batch.status === 'running') {
          for (const platformId of platformIds) {
            if (batch.platformIds.includes(platformId) && !batch.completedPlatformIds.includes(platformId)) {
              await SyncService.cancelSync(userId, platformId);
              batch.failedPlatformIds.push(platformId);
              cancelledCount++;
            }
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    log.info('Batch cancelled', { userId, cancelledCount, duration });

    return addHeaders(
      apiResponse.success(
        {
          cancelled: cancelledCount,
          message: `Cancelled ${cancelledCount} batch(es)/platform(s)`,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('DELETE batch failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to cancel batch', requestId), requestId);
  }
}

// =============================================================================
// BACKGROUND BATCH PROCESSING
// =============================================================================

async function processBatchSync(
  batchId: string,
  userId: string,
  platforms: Array<{ platformId: string; platform: { id: string; name: string; slug: string } }>,
  options: {
    priority: string;
    force: boolean;
    sequential: boolean;
    delayBetweenMs: number;
  }
): Promise<void> {
  const batch = batchJobs.get(batchId);
  if (!batch) return;

  batch.status = 'running';
  batch.startedAt = new Date();

  // Send SSE notification
  sseSyncService.sendSyncStarted(userId, batchId, 'batch', 'Batch Sync');

  try {
    if (options.sequential) {
      // Process one at a time
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        
        // Check if cancelled
        if (batch.status === 'running') break;

        try {
          const result = await SyncService.syncPlatform(userId, platform.platformId, {
            triggeredBy: 'manual',
          });

          if (result.success) {
            batch.completedPlatformIds.push(platform.platformId);
          } else {
            batch.failedPlatformIds.push(platform.platformId);
          }

          // Update progress
          batch.progress = Math.round(((i + 1) / platforms.length) * 100);

          // Send progress update
          sseSyncService.sendPlatformSynced(
            userId,
            platform.platformId,
            platform.platform.name,
            result.success,
            {
              itemsCreated: result.entriesAdded,
              itemsUpdated: result.entriesUpdated,
              itemsFailed: 0,
              duration: result.duration,
            },
            result.error
          );

          // Delay between syncs
          if (i < platforms.length - 1 && options.delayBetweenMs > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delayBetweenMs));
          }
        } catch (error) {
          batch.failedPlatformIds.push(platform.platformId);
          log.error('Platform sync failed in batch', { batchId, platformId: platform.platformId }, error);
        }
      }
    } else {
      // Process in parallel (with concurrency limit)
      const CONCURRENCY = 3;
      for (let i = 0; i < platforms.length; i += CONCURRENCY) {
        if (batch.status === 'running') break;

        const chunk = platforms.slice(i, i + CONCURRENCY);
        
        const results = await Promise.allSettled(
          chunk.map(async (platform) => {
            const result = await SyncService.syncPlatform(userId, platform.platformId, {
              triggeredBy: 'manual',
            });
            return { platform, result };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { platform, result: syncResult } = result.value;
            if (syncResult.success) {
              batch.completedPlatformIds.push(platform.platformId);
            } else {
              batch.failedPlatformIds.push(platform.platformId);
            }
          } else {
            // Find which platform failed
            const failedPlatform = chunk.find(p => 
              !batch.completedPlatformIds.includes(p.platformId) &&
              !batch.failedPlatformIds.includes(p.platformId)
            );
            if (failedPlatform) {
              batch.failedPlatformIds.push(failedPlatform.platformId);
            }
          }
        }

        batch.progress = Math.round(
          ((batch.completedPlatformIds.length + batch.failedPlatformIds.length) / platforms.length) * 100
        );
      }
    }

    batch.status = batch.failedPlatformIds.length === platforms.length ? 'failed' : 'completed';
    batch.completedAt = new Date();

    // Send completion notification
    sseSyncService.sendSyncCompleted(userId, {
      syncId: batchId,
      platformName: 'Batch Sync',
      status: batch.failedPlatformIds.length === 0 ? 'success' : batch.completedPlatformIds.length > 0 ? 'partial' : 'failed',
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsFailed: batch.failedPlatformIds.length,
      duration: Date.now() - batch.startedAt!.getTime(),
      completedAt: new Date().toISOString(),
      stats: {
        totalPlatforms: platforms.length,
        completedPlatforms: batch.completedPlatformIds.length,
        failedPlatforms: batch.failedPlatformIds.length,
      },
    });

    log.info('Batch sync completed', {
      batchId,
      userId,
      completed: batch.completedPlatformIds.length,
      failed: batch.failedPlatformIds.length,
    });
  } catch (error) {
    batch.status = 'failed';
    batch.completedAt = new Date();
    batch.error = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;