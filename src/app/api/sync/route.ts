// src/app/api/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { syncOrchestrator } from '@/services/sync/syncOrchestrator';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for sync request
const syncRequestSchema = z.object({
  platformIds: z.array(z.string()).optional(),
  force: z.boolean().default(false),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

/**
 * GET /api/sync
 * Get sync status for user
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'GET /api/sync' });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized sync status request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    log.debug('Checking sync status', { userId: session.user.id, jobId });

    if (jobId) {
      // Get specific job status
      const job = syncOrchestrator.getJobStatus(jobId);
      if (!job) {
        log.warn('Sync job not found', { jobId });
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      log.info('Job status retrieved', {
        jobId,
        status: job.status,
        duration: Date.now() - startTime,
      });

      return NextResponse.json({ success: true, job });
    }

    // Get overall queue state and recent syncs
    const [queueStatus, recentSyncs, platformStatuses] = await Promise.all([
      Promise.resolve(syncOrchestrator.getQueueStatus()),
      prisma.syncLog.findMany({
        where: { userId: session.user.id },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          platform: {
            select: { name: true, slug: true, icon: true },
          },
        },
      }),
      prisma.userPlatform.findMany({
        where: { userId: session.user.id, isActive: true },
        select: {
          id: true,
          platformId: true,
          syncStatus: true,
          lastSyncedAt: true,
          nextSyncAt: true,
          consecutiveFailures: true,
          platform: {
            select: { name: true, slug: true },
          },
        },
      }),
    ]);

    // Get user's active jobs
    const userJobs = syncOrchestrator.getUserJobs(session.user.id);

    log.info('Sync status retrieved', {
      userId: session.user.id,
      queueLength: queueStatus.queueLength,
      activeJobs: queueStatus.activeJobs,
      recentSyncsCount: recentSyncs.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      queue: queueStatus,
      userJobs,
      recentSyncs,
      platformStatuses,
    });
  } catch (error) {
    log.error(
      'Failed to get sync status',
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync
 * Trigger sync for platforms
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'POST /api/sync' });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized sync trigger attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = syncRequestSchema.parse(body);

    log.info('Sync requested', {
      userId: session.user.id,
      platformIds: validated.platformIds,
      force: validated.force,
      priority: validated.priority,
    });

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      log.warn('No subscription found for user', { userId: session.user.id });
      // Create default free subscription
      await prisma.subscription.create({
        data: {
          userId: session.user.id,
          tier: 'FREE',
          status: 'ACTIVE',
          billingInterval: 'MONTHLY',
          platformLimit: 5,
          syncFrequencyMinutes: 1440,
          exportLimitMonthly: 3,
          apiRequestsDaily: 100,
        },
      });
    }

    const activeSub = subscription || { syncFrequencyMinutes: 1440 };

    // Check if user has exceeded sync frequency limit (unless force)
    if (!validated.force) {
      const lastSync = await prisma.syncLog.findFirst({
        where: {
          userId: session.user.id,
          status: { in: ['SUCCESS', 'PARTIAL'] },
        },
        orderBy: { completedAt: 'desc' },
      });

      if (lastSync?.completedAt) {
        const minInterval = activeSub.syncFrequencyMinutes * 60 * 1000;
        const timeSinceLastSync = Date.now() - lastSync.completedAt.getTime();

        if (timeSinceLastSync < minInterval) {
          const waitTime = Math.ceil((minInterval - timeSinceLastSync) / 60000);
          log.warn('Sync rate limited', {
            userId: session.user.id,
            waitMinutes: waitTime,
          });
          return NextResponse.json(
            {
              success: false,
              error: `Please wait ${waitTime} minutes before syncing again`,
              code: 'RATE_LIMITED',
              retryAfter: waitTime,
            },
            { status: 429 }
          );
        }
      }
    }

    // Enqueue sync job
    const jobId = await syncOrchestrator.enqueue({
      userId: session.user.id,
      platformIds: validated.platformIds,
      force: validated.force,
      priority: validated.priority,
    });

    const job = syncOrchestrator.getJobStatus(jobId);

    log.info('Sync job enqueued', {
      userId: session.user.id,
      jobId,
      platformCount: job?.totalPlatforms || 0,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: `Syncing ${job?.totalPlatforms || 0} platform(s)`,
      platformCount: job?.totalPlatforms || 0,
      job,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Invalid sync request', { errors: error.errors });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    log.error(
      'Failed to trigger sync',
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger sync',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sync
 * Cancel sync job
 */
export async function DELETE(req: NextRequest) {
  const startTime = Date.now();
  const log = logger.child({ route: 'DELETE /api/sync' });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('Unauthorized sync cancel attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      log.warn('Cancel requested without job ID');
      return NextResponse.json(
        { success: false, error: 'Job ID required' },
        { status: 400 }
      );
    }

    // Verify job belongs to user
    const job = syncOrchestrator.getJobStatus(jobId);
    if (job && job.userId !== session.user.id) {
      log.warn('Attempt to cancel another user\'s job', { 
        jobId, 
        jobUserId: job.userId, 
        requestUserId: session.user.id 
      });
      return NextResponse.json(
        { success: false, error: 'Not authorized to cancel this job' },
        { status: 403 }
      );
    }

    log.info('Cancelling sync job', { userId: session.user.id, jobId });

    const cancelled = syncOrchestrator.cancelJob(jobId);

    if (cancelled) {
      log.info('Sync job cancelled', {
        jobId,
        duration: Date.now() - startTime,
      });
    } else {
      log.warn('Could not cancel sync job', { jobId });
    }

    return NextResponse.json({
      success: cancelled,
      message: cancelled ? 'Sync cancelled' : 'Could not cancel sync (may already be complete)',
    });
  } catch (error) {
    log.error(
      'Failed to cancel sync',
      { duration: Date.now() - startTime },
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel sync',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}