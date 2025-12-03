// src/app/api/sync/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SyncService } from '@/services/syncService';
import { syncOrchestrator } from '@/services/sync/syncOrchestrator';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    // Get specific job status
    if (jobId) {
      const job = syncOrchestrator.getJobStatus(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    // Get overall sync state
    const syncState = await SyncService.getSyncState(session.user.id);
    const queueStatus = syncOrchestrator.getQueueStatus();

    return NextResponse.json({
      ...syncState,
      queue: queueStatus,
    });
  } catch (error: any) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}