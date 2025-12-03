// src/app/api/sync/[platformId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SyncService } from '@/services/syncService';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: { platformId: string };
}

// GET - Get sync status for specific platform
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platformId } = params;

    // Get platform sync history
    const logs = await SyncService.getSyncHistory(session.user.id, {
      platformId,
      limit: 10,
    });

    // Get last successful sync
    const lastSuccess = logs.find(log => log.status === 'success');

    // Get entry count
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    const entriesCount = platform 
      ? await prisma.trackerEntry.count({
          where: { 
            userId: session.user.id,
            platform: platform.name,
          },
        })
      : 0;

    return NextResponse.json({
      platformId,
      lastSync: lastSuccess?.createdAt || null,
      entriesCount,
      recentLogs: logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get platform sync status' },
      { status: 500 }
    );
  }
}

// POST - Trigger sync for specific platform
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platformId } = params;

    // Check if platform is connected
    const userPlatform = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId: session.user.id,
          platformId,
        },
      },
      include: { platform: true },
    });

    if (!userPlatform) {
      return NextResponse.json(
        { error: 'Platform not connected' },
        { status: 404 }
      );
    }

    // Trigger sync
    const result = await SyncService.syncSinglePlatform(
      session.user.id,
      platformId
    );

    return NextResponse.json({
      success: true,
      platform: userPlatform.platform.name,
      entriesAdded: result.entriesAdded,
      entriesUpdated: result.entriesUpdated || 0,
      message: `Synced ${result.entriesAdded} new entries`,
    });
  } catch (error: any) {
    console.error('Platform sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync platform' },
      { status: 500 }
    );
  }
}