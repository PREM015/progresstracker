// src/app/api/sync/trigger-all/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SyncService } from '@/services/syncService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if sync is already running
    const state = await SyncService.getSyncState(session.user.id);
    if (state.isRunning) {
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          jobId: state.currentJob?.id,
        },
        { status: 409 }
      );
    }

    // Trigger sync for all connected platforms
    const job = await SyncService.syncAllPlatforms(session.user.id, {
      force: true,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Started syncing ${job.totalPlatforms} platform(s)`,
      totalPlatforms: job.totalPlatforms,
    });
  } catch (error: any) {
    console.error('Trigger all sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}