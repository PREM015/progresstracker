// =============================================================================
// src/app/api/sync/queue/route.ts
// =============================================================================
// Description: Sync queue management
// Methods: GET, POST, DELETE, HEAD, OPTIONS
// Auth Required: Yes
// Rate Limit: GET: 60/min, POST: 20/min, DELETE: 10/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { SyncQueue } from '@/services/sync/syncQueue';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/queue' });

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

const enqueueSchema = z.object({
  platformId: z.string().cuid(),
  priority: z.number().min(0).max(10).default(5),
  force: z.boolean().default(false),
});

const bulkEnqueueSchema = z.object({
  platformIds: z.array(z.string().cuid()).min(1).max(20),
  priority: z.number().min(0).max(10).default(5),
});

const dequeueSchema = z.object({
  jobIds: z.array(z.string().cuid()).min(1).max(50),
  reason: z.string().max(200).optional(),
});

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

    const stats = await SyncQueue.getStats();
    const userJobs = await SyncQueue.getUserJobs(session.user.id);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Queue-Pending', String(stats.pending));
    response.headers.set('X-Queue-InProgress', String(stats.inProgress));
    response.headers.set('X-User-Jobs', String(userJobs.length));
    
    return addHeaders(response, requestId);
  } catch (error) {
    log.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

// =============================================================================
// GET - Queue Status & Jobs
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, `sync:queue:${ip}`);
    
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

    // Get queue stats and user's jobs
    const [stats, userJobs] = await Promise.all([
      SyncQueue.getStats(),
      SyncQueue.getUserJobs(userId),
    ]);

    // Get platform details for jobs
    const platformIds = [...new Set(userJobs.map(j => j.platformId))];
    const platforms = await prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true, slug: true, icon: true },
    });
    const platformMap = new Map(platforms.map(p => [p.id, p]));

    const duration = Date.now() - startTime;

    const response = apiResponse.success(
      {
        stats: {
          pending: stats.pending,
          inProgress: stats.inProgress,
          total: stats.total,
          avgWaitTime: stats.avgWaitTime,
          avgWaitTimeFormatted: stats.avgWaitTime > 0 
            ? `${Math.round(stats.avgWaitTime / 1000)}s` 
            : 'N/A',
        },
        userJobs: userJobs.map(j => ({
          id: j.id,
          platform: platformMap.get(j.platformId),
          status: j.status,
          priority: j.priority,
          createdAt: j.createdAt,
          attemptNumber: j.attemptNumber,
          maxAttempts: j.maxAttempts,
          position: null, // Would need additional query to calculate
        })),
        summary: {
          totalUserJobs: userJobs.length,
          pendingJobs: userJobs.filter(j => j.status === SyncStatus.PENDING).length,
          inProgressJobs: userJobs.filter(j => j.status === SyncStatus.IN_PROGRESS).length,
        },
      },
      { meta: { requestId, duration } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    log.error('GET queue failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to get queue status', requestId), requestId);
  }
}

// =============================================================================
// POST - Add to Queue
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, `sync:queue:post:${ip}`);
    
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

    // Check if it's a bulk enqueue or single
    const isBulk = Array.isArray((body as Record<string, unknown>).platformIds);
    
    if (isBulk) {
      const validation = bulkEnqueueSchema.safeParse(body);
      if (!validation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
          requestId,
          rateLimitResult
        );
      }

      const { platformIds, priority } = validation.data;
      const results: Array<{ platformId: string; jobId?: string; error?: string }> = [];

      for (const platformId of platformIds) {
        try {
          const userPlatform = await prisma.userPlatform.findUnique({
            where: { userId_platformId: { userId, platformId } },
          });

          if (!userPlatform) {
            results.push({ platformId, error: 'Platform not connected' });
            continue;
          }

          const jobId = await SyncQueue.enqueue({
            userId,
            platformId,
            userPlatformId: userPlatform.id,
            priority,
            triggeredBy: 'manual',
            triggerSource: 'api',
          });

          results.push({ platformId, jobId });
        } catch (error) {
          results.push({ 
            platformId, 
            error: error instanceof Error ? error.message : 'Failed to enqueue' 
          });
        }
      }

      const duration = Date.now() - startTime;
      log.info('Bulk enqueue completed', { userId, requestId, results, duration });

      return addHeaders(
        apiResponse.success(
          {
            queued: results.filter(r => r.jobId).length,
            failed: results.filter(r => r.error).length,
            results,
          },
          { meta: { requestId, duration } }
        ),
        requestId,
        rateLimitResult
      );
    } else {
      const validation = enqueueSchema.safeParse(body);
      if (!validation.success) {
        return addHeaders(
          apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
          requestId,
          rateLimitResult
        );
      }

      const { platformId, priority, force } = validation.data;

      // Verify platform connection
      const userPlatform = await prisma.userPlatform.findUnique({
        where: { userId_platformId: { userId, platformId } },
        include: { platform: { select: { name: true, slug: true } } },
      });

      if (!userPlatform) {
        return addHeaders(
          apiResponse.notFound('Platform connection', requestId),
          requestId,
          rateLimitResult
        );
      }

      // Check for existing job
      if (!force) {
        const existingJob = await prisma.syncLog.findFirst({
          where: {
            userId,
            platformId,
            status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] },
          },
        });

        if (existingJob) {
          return addHeaders(
            apiResponse.error(
              {
                message: 'A sync job is already queued for this platform',
                statusCode: 409,
                code: 'JOB_EXISTS',
              },
              requestId
            ),
            requestId,
            rateLimitResult
          );
        }
      }

      const jobId = await SyncQueue.enqueue({
        userId,
        platformId,
        userPlatformId: userPlatform.id,
        priority,
        triggeredBy: 'manual',
        triggerSource: 'api',
      });

      const duration = Date.now() - startTime;
      log.info('Job enqueued', { userId, requestId, platformId, jobId, duration });

      return addHeaders(
        apiResponse.created(
          {
            jobId,
            platformId,
            platformName: userPlatform.platform.name,
            status: 'PENDING',
            priority,
            queuedAt: new Date().toISOString(),
          },
          { requestId }
        ),
        requestId,
        rateLimitResult
      );
    }
  } catch (error) {
    log.error('POST queue failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to enqueue job', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Remove from Queue
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, `sync:queue:delete:${ip}`);
    
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

    const validation = dequeueSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid request body', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { jobIds, reason } = validation.data;
    const results: Array<{ jobId: string; cancelled: boolean; error?: string }> = [];

    for (const jobId of jobIds) {
      try {
        // Verify job belongs to user
        const job = await prisma.syncLog.findFirst({
          where: { id: jobId, userId },
        });

        if (!job) {
          results.push({ jobId, cancelled: false, error: 'Job not found' });
          continue;
        }

        if (job.status !== SyncStatus.PENDING) {
          results.push({ jobId, cancelled: false, error: 'Job is not pending' });
          continue;
        }

        await SyncQueue.cancel(jobId, reason || 'Cancelled by user');
        results.push({ jobId, cancelled: true });
      } catch (error) {
        results.push({
          jobId,
          cancelled: false,
          error: error instanceof Error ? error.message : 'Failed to cancel',
        });
      }
    }

    const duration = Date.now() - startTime;
    log.info('Queue jobs cancelled', { userId, requestId, results, duration });

    return addHeaders(
      apiResponse.success(
        {
          cancelled: results.filter(r => r.cancelled).length,
          failed: results.filter(r => !r.cancelled).length,
          results,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('DELETE queue failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to cancel jobs', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';