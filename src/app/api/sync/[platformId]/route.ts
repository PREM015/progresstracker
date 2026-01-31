// src/app/api/sync/[platformId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { SyncService } from "@/services/syncService";
import { prisma } from "@/lib/prisma";
import { SyncStatus } from "@prisma/client";

interface RouteContext {
  params: Promise<{
    platformId: string;
  }>;
}

/**
 * ✅ GET – Get sync status for specific platform
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { platformId } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized sync status access');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.debug('Getting sync status', { 
      userId: session.user.id, 
      platformId 
    });

    // Get platform sync history
    const logs = await SyncService.getSyncHistory(session.user.id, {
      platformId,
      limit: 10,
    });

    // ✅ FIXED: Use correct enum value (uppercase)
    const lastSuccess = logs.find(
      (log: { status: SyncStatus }) => log.status === SyncStatus.SUCCESS
    );

    // Get platform
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    // ✅ FIXED: Use platformId instead of platform name string
    const entriesCount = platform
      ? await prisma.trackerEntry.count({
          where: {
            userId: session.user.id,
            platformId: platform.id,  // ✅ FIXED: was platform.name (wrong field)
          },
        })
      : 0;

    logger.info('Sync status retrieved', { 
      userId: session.user.id, 
      platformId,
      entriesCount 
    });

    return NextResponse.json({
      success: true,
      data: {
        platformId,
        platformName: platform?.name ?? null,
        lastSync: lastSuccess?.completedAt ?? lastSuccess?.startedAt ?? null,
        entriesCount,
        recentLogs: logs.map((log: { 
          id: string; 
          status: SyncStatus; 
          startedAt: Date; 
          completedAt: Date | null; 
          itemsCreated: number; 
          hasError: boolean; 
          errorMessage: string | null; 
        }) => ({
          id: log.id,
          status: log.status,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          itemsCreated: log.itemsCreated,
          hasError: log.hasError,
          errorMessage: log.errorMessage,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to get platform sync status', { }, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get platform sync status",
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ POST – Trigger sync for specific platform
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { platformId } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized sync trigger attempt');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.info('Triggering platform sync', { 
      userId: session.user.id, 
      platformId 
    });

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
      logger.warn('Platform not connected', { 
        userId: session.user.id, 
        platformId 
      });
      return NextResponse.json(
        { error: "Platform not connected" },
        { status: 404 }
      );
    }

    // Check if already syncing
    if (userPlatform.syncStatus === SyncStatus.IN_PROGRESS) {
      logger.info('Sync already in progress', { 
        userId: session.user.id, 
        platformId 
      });
      return NextResponse.json(
        { error: "Sync already in progress" },
        { status: 409 }
      );
    }

    // Trigger sync
    const result = await SyncService.syncPlatform(
      session.user.id,
      platformId
    );

    logger.info('Platform sync completed', { 
      userId: session.user.id, 
      platformId,
      entriesAdded: result.entriesAdded 
    });

    return NextResponse.json({
      success: true,
      data: {
        platform: userPlatform.platform.name,
        platformId: userPlatform.platformId,
        entriesAdded: result.entriesAdded,
        message: `Synced ${result.entriesAdded} new entries`,
      },
    });
  } catch (error) {
    logger.error('Platform sync error', { }, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync platform",
      },
      { status: 500 }
    );
  }
}