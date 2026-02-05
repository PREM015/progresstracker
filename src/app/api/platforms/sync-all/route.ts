// src/app/api/platforms/sync-all/route.ts
/**
 * Sync All Platforms API
 * 
 * Handles synchronized data fetching for all connected platforms.
 * Supports selective sync, progress tracking, cancellation, and status monitoring.
 * 
 * @route GET    /api/platforms/sync-all - Get sync status and history
 * @route POST   /api/platforms/sync-all - Trigger sync for all/selected platforms
 * @route DELETE /api/platforms/sync-all - Cancel running sync operations
 * @route HEAD   /api/platforms/sync-all - Quick sync status check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '@/lib/apiError';
import SyncService from '@/services/syncService';
import { auditLogService } from '@/services/auditLogService';
import { AuditAction, SyncStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,           // 60 requests per minute for status checks
  POST: 3,           // 3 sync operations per hour (strict)
  DELETE: 10,        // 10 cancel operations per minute
} as const;

const SYNC_LIMITS = {
  MAX_CONCURRENT_SYNCS: 5,
  MAX_PLATFORMS_PER_SYNC: 50,
  MIN_SYNC_INTERVAL_MINUTES: 15,
} as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Priority',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// TYPES
// =============================================================================

interface SyncJobStatus {
  jobId: string;
  userId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    percentage: number;
  };
  currentPlatform?: {
    id: string;
    name: string;
    slug: string;
  };
  startedAt: Date;
  estimatedCompletion?: Date;
  completedAt?: Date;
  duration?: number;
  results?: Array<{
    platformId: string;
    platformName: string;
    status: SyncStatus;
    entriesAdded: number;
    duration: number;
    error?: string;
  }>;
}

interface SyncHistoryEntry {
  id: string;
  jobId: string;
  status: string;
  platformCount: number;
  successCount: number;
  failCount: number;
  duration: number;
  triggeredBy: string;
  createdAt: Date;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const SyncAllSchema = z.object({
  platformIds: z
    .array(z.string().cuid())
    .max(SYNC_LIMITS.MAX_PLATFORMS_PER_SYNC, 
      `Maximum ${SYNC_LIMITS.MAX_PLATFORMS_PER_SYNC} platforms allowed`)
    .optional(),
  
  force: z.boolean().default(false),
  
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  
  skipRecent: z.boolean().default(true),
  
  recentThresholdMinutes: z.number().int().min(1).max(1440).default(60),
  
  categories: z.array(z.enum([
    'DSA', 'JOB', 'GIT', 'LEARNING', 'HACKATHON', 
    'OPENSOURCE', 'COMPANY', 'DESIGN', 'DATA_SCIENCE', 'OTHER'
  ])).optional(),
  
  waitForCompletion: z.boolean().default(false),
  
  notifyOnComplete: z.boolean().default(true),
  
  retryFailed: z.boolean().default(false),
});

const CancelSyncSchema = z.object({
  jobId: z.string().optional(),
  cancelAll: z.boolean().default(false),
});

const SyncHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['completed', 'failed', 'cancelled']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    jobId?: string;
    syncStatus?: 'running' | 'completed' | 'failed';
  }
): NextResponse {
  // Security and CORS headers
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.jobId) {
    response.headers.set('X-Sync-Job-ID', options.jobId);
  }

  if (options?.syncStatus) {
    response.headers.set('X-Sync-Status', options.syncStatus);
  }

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  return response;
}

/**
 * Check if user has a sync currently running
 */
async function checkRunningSyncs(userId: string): Promise<{
  hasRunning: boolean;
  count: number;
  jobs: Array<{ jobId: string; startedAt: Date }>;
}> {
  const runningSyncs = await prisma.userPlatform.findMany({
    where: {
      userId,
      syncStatus: SyncStatus.IN_PROGRESS,
    },
    select: {
      platformId: true,
      platform: {
        select: { name: true },
      },
    },
  });

  // Get recent sync logs that are in progress
  const recentJobs = await prisma.syncLog.findMany({
    where: {
      userId,
      status: SyncStatus.IN_PROGRESS,
      startedAt: {
        gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
      },
    },
    select: {
      id: true,
      startedAt: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  return {
    hasRunning: runningSyncs.length > 0,
    count: runningSyncs.length,
    jobs: recentJobs.map(job => ({
      jobId: job.id,
      startedAt: job.startedAt,
    })),
  };
}

/**
 * Check subscription sync limits
 */
async function checkSyncLimits(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  resetAt?: Date;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      tier: true,
      syncFrequencyMinutes: true,
    },
  });

  // Get last sync
  const lastSync = await prisma.syncLog.findFirst({
    where: {
      userId,
      status: SyncStatus.SUCCESS,
    },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  });

  if (!lastSync?.completedAt) {
    return { allowed: true };
  }

  const syncFrequency = subscription?.syncFrequencyMinutes || 60; // Default 1 hour
  const minInterval = Math.max(syncFrequency, SYNC_LIMITS.MIN_SYNC_INTERVAL_MINUTES);
  const nextAllowedSync = new Date(lastSync.completedAt.getTime() + minInterval * 60 * 1000);

  if (new Date() < nextAllowedSync) {
    return {
      allowed: false,
      reason: `Please wait ${minInterval} minutes between syncs. Upgrade for faster sync.`,
      resetAt: nextAllowedSync,
    };
  }

  return { allowed: true };
}

/**
 * Estimate sync completion time
 */
function estimateCompletion(
  platformCount: number,
  avgDurationPerPlatform: number = 3000
): Date {
  const estimatedMs = platformCount * avgDurationPerPlatform;
  return new Date(Date.now() + estimatedMs);
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Quick sync status check
 * 
 * Returns headers indicating current sync status without response body
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const userId = session.user.id;

    const running = await checkRunningSyncs(userId);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Sync-Running', String(running.hasRunning));
    response.headers.set('X-Sync-Count', String(running.count));

    if (running.jobs.length > 0) {
      response.headers.set('X-Latest-Job-ID', running.jobs[0].jobId);
    }

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD /api/platforms/sync-all failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/sync-all
 * 
 * Get sync status, history, and current job information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:sync-all:get:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = SyncHistoryQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters',
          queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const { page, limit, status, startDate, endDate } = queryValidation.data;

    // Get current sync status
    const syncStatus = await SyncService.getSyncStatus(userId);

    // Get sync history
    const history = await SyncService.getSyncHistory(userId, {
      limit,
      offset: (page - 1) * limit,
    });

    logger.info('Sync status retrieved', {
      userId,
      requestId,
      isRunning: syncStatus.isRunning,
      historyCount: history.logs.length,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          current: {
            isRunning: syncStatus.isRunning,
            activeSyncs: syncStatus.activeSyncs,
            lastSync: syncStatus.lastSync,
            platforms: syncStatus.platforms,
            health: syncStatus.health,
          },
          history: {
            logs: history.logs,
            total: history.total,
            hasMore: history.hasMore,
            pagination: {
              page,
              limit,
              total: history.total,
              totalPages: Math.ceil(history.total / limit),
            },
          },
          limits: {
            maxConcurrent: SYNC_LIMITS.MAX_CONCURRENT_SYNCS,
            minInterval: SYNC_LIMITS.MIN_SYNC_INTERVAL_MINUTES,
          },
        },
        {
          meta: { requestId, duration: Date.now() - startTime },
        }
      ),
      requestId,
      {
        rateLimitResult,
        syncStatus: syncStatus.isRunning ? 'running' : 'completed',
      }
    );
  } catch (error) {
    logger.error('GET /api/platforms/sync-all failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * POST /api/platforms/sync-all
 * 
 * Trigger sync for all or selected platforms
 * 
 * Features:
 * - Selective sync (specific platforms or categories)
 * - Force sync (ignore recent sync check)
 * - Priority levels (high/normal/low)
 * - Skip recently synced platforms
 * - Retry failed syncs
 * - Background job execution
 * - Progress notifications
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const jobId = nanoid();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Rate limiting (strict - only 3 per hour)
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:sync-all:post:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId), // 1 hour
        requestId,
        { rateLimitResult, jobId }
      );
    }

    // Check for concurrent syncs
    const runningSyncs = await checkRunningSyncs(userId);
    if (runningSyncs.hasRunning && runningSyncs.count >= SYNC_LIMITS.MAX_CONCURRENT_SYNCS) {
      throw new ConflictError(
        `Maximum ${SYNC_LIMITS.MAX_CONCURRENT_SYNCS} concurrent syncs allowed. ` +
        `Please wait for current syncs to complete.`
      );
    }

    // Parse and validate request body
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional, use defaults
    }

    const validation = SyncAllSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Validation failed',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult, jobId }
      );
    }

    const {
      platformIds,
      force,
      priority,
      skipRecent,
      recentThresholdMinutes,
      categories,
      waitForCompletion,
      notifyOnComplete,
      retryFailed,
    } = validation.data;

    // Check subscription limits (unless force)
    if (!force) {
      const limitsCheck = await checkSyncLimits(userId);
      if (!limitsCheck.allowed) {
        throw new ForbiddenError(limitsCheck.reason!);
      }
    }

    // If retryFailed is true, get failed platforms
    let platformsToSync = platformIds;
    if (retryFailed && !platformIds) {
      const failedPlatforms = await prisma.userPlatform.findMany({
        where: {
          userId,
          isActive: true,
          syncStatus: SyncStatus.FAILED,
          consecutiveFailures: { lt: 5 },
        },
        select: { platformId: true },
      });
      platformsToSync = failedPlatforms.map(p => p.platformId);
    }

    // Filter by categories if specified
    if (categories && categories.length > 0 && !platformsToSync) {
      const categoryPlatforms = await prisma.userPlatform.findMany({
        where: {
          userId,
          isActive: true,
          platform: {
            category: { in: categories },
          },
        },
        select: { platformId: true },
      });
      platformsToSync = categoryPlatforms.map(p => p.platformId);
    }

    // Start sync operation
    logger.info('Starting sync-all job', {
      userId,
      userEmail,
      jobId,
      platformIds: platformsToSync,
      force,
      priority,
      retryFailed,
    });

    // Execute sync (in background if not waiting)
    const syncPromise = SyncService.syncAllPlatforms(userId, {
      platformIds: platformsToSync,
      force,
      priority,
      triggeredBy: 'manual',
    });

    let syncResult;

    if (waitForCompletion) {
      // Wait for completion (max 5 minutes timeout)
      syncResult = await Promise.race([
        syncPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout')), 5 * 60 * 1000)
        ),
      ]) as Awaited<typeof syncPromise>;
    } else {
      // Return immediately, sync continues in background
      syncPromise
        .then(async (result) => {
          logger.info('Background sync completed', {
            userId,
            jobId,
            successCount: result.successCount,
            failCount: result.failCount,
            duration: result.duration,
          });

          // Send notification if requested
          if (notifyOnComplete) {
            await prisma.notification.create({
              data: {
                userId,
                type: 'SYNC_COMPLETE',
                title: 'Platform Sync Completed',
                message: `Synced ${result.successCount}/${result.platformCount} platforms successfully`,
                priority: 'NORMAL',
                metadata: {
                  jobId,
                  platformCount: result.platformCount,
                  successCount: result.successCount,
                  failCount: result.failCount,
                },
              },
            }).catch(err => {
              logger.error('Failed to create notification', { userId }, err);
            });
          }
        })
        .catch(err => {
          logger.error('Background sync failed', { userId, jobId }, err);
        });

      // Estimate completion
      const platformCount = platformsToSync?.length || 
        (await prisma.userPlatform.count({ where: { userId, isActive: true } }));

      syncResult = {
        jobId,
        platformCount,
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        results: [],
        duration: 0,
        status: 'running' as const,
        estimatedCompletion: estimateCompletion(platformCount),
      };
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.CREATE,
      category: 'platform',
      entityType: 'sync_all',
      description: `Triggered sync for ${syncResult.platformCount} platforms`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      newValue: {
        jobId,
        platformCount: syncResult.platformCount,
        force,
        priority,
      },
    });

    logger.info('Sync-all job initiated', {
      userId,
      jobId,
      platformCount: syncResult.platformCount,
      waitForCompletion,
      duration: Date.now() - startTime,
    });

    const statusCode = waitForCompletion ? 200 : 202; // 202 Accepted for async

    return addHeaders(
      apiResponse.success(
        {
          jobId,
          status: waitForCompletion ? 'completed' : 'running',
          platforms: {
            total: syncResult.platformCount,
            successful: syncResult.successCount,
            failed: syncResult.failCount,
            skipped: syncResult.skippedCount,
          },
          ...(waitForCompletion && { results: syncResult.results }),
          ...(!waitForCompletion && { 
         estimatedCompletion: 'estimatedCompletion' in syncResult
            ? syncResult.estimatedCompletion : undefined,

            statusUrl: `/api/platforms/sync-all?jobId=${jobId}`,
          }),
          duration: syncResult.duration || Date.now() - startTime,
        },
        {
          status: statusCode,
          meta: {
            requestId,
            jobId,
            message: waitForCompletion
              ? `Synced ${syncResult.successCount}/${syncResult.platformCount} platforms`
              : `Sync started for ${syncResult.platformCount} platforms`,
          },
        }
      ),
      requestId,
      {
        rateLimitResult,
        jobId,
        syncStatus: waitForCompletion ? 'completed' : 'running',
      }
    );
  } catch (error) {
    logger.error('POST /api/platforms/sync-all failed', { requestId, jobId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId, { jobId });
  }
}

/**
 * DELETE /api/platforms/sync-all
 * 
 * Cancel running sync operations
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:sync-all:delete:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.DELETE, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse request body
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Use defaults
    }

    const validation = CancelSyncSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Validation failed',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const { jobId, cancelAll } = validation.data;

    // Cancel syncs
    if (cancelAll) {
      await SyncService.cancelSync(userId);
    } else if (jobId) {
      await SyncService.cancelSync(userId, jobId);
    } else {
      throw new ValidationError('Either jobId or cancelAll must be specified');
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.DELETE,
      category: 'platform',
      entityType: 'sync_cancel',
      description: cancelAll 
        ? 'Cancelled all running syncs' 
        : `Cancelled sync job ${jobId}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
    });

    logger.info('Sync cancelled', {
      userId,
      jobId,
      cancelAll,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          cancelled: true,
          jobId: cancelAll ? null : jobId,
          message: cancelAll
            ? 'All running syncs cancelled'
            : `Sync job ${jobId} cancelled`,
        },
        { meta: { requestId } }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('DELETE /api/platforms/sync-all failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';