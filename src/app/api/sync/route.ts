// src/app/api/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { SyncService } from '@/services/syncService';

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
      const job = SyncService.getJobStatus(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    // Get overall sync state
    const state = await SyncService.getSyncState(session.user.id);
    return NextResponse.json(state);
  } catch (error: any) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
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
    const { platforms, force } = body;

    const job = await SyncService.syncAllPlatforms(session.user.id, {
      platforms,
      force,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Syncing ${job.totalPlatforms} platform(s)`,
      platformCount: job.totalPlatforms,
    });
  } catch (error: any) {
    console.error('Sync trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger sync' },
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

    const cancelled = SyncService.cancelJob(jobId);
    
    return NextResponse.json({
      success: cancelled,
      message: cancelled ? 'Sync cancelled' : 'Could not cancel sync',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel sync' },
      { status: 500 }
    );
  }
}