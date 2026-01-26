// src/app/api/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { syncOrchestrator } from '@/services/sync/syncOrchestrator';

// GET - Get sync status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job status
      const job = syncOrchestrator.getJobStatus(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    // Get overall queue state
    const queueStatus = syncOrchestrator.getQueueStatus();
    return NextResponse.json(queueStatus);
  } catch (error: unknown) {
    logger.error('Sync status error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : 'Failed to get sync status') || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

// POST - Trigger sync for all platforms
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { platformIds, force, priority } = body;

    const jobId = await syncOrchestrator.enqueue({
      userId: session.user.id,
      platformIds,
      force,
      priority: priority || 'normal',
    });

    const job = syncOrchestrator.getJobStatus(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      message: `Syncing ${job?.totalPlatforms || 0} platform(s)`,
      platformCount: job?.totalPlatforms || 0,
    });
  } catch (error: unknown) {
    logger.error('Sync trigger error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : 'Failed to trigger sync') || 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel sync job
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const cancelled = syncOrchestrator.cancelJob(jobId);
    
    return NextResponse.json({
      success: cancelled,
      message: cancelled ? 'Sync cancelled' : 'Could not cancel sync',
    });
  } catch (error: unknown) {
    logger.error('Sync cancel error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : 'Failed to cancel sync') || 'Failed to cancel sync' },
      { status: 500 }
    );
  }
}