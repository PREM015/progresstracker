import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/sync-status - Get sync status for tracker entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");

    // Get user platforms with sync status
    const whereClause: any = {
      userId: session.user.id,
      isActive: true,
    };

    if (platformId) {
      whereClause.platformId = platformId;
    }

    const userPlatforms = await prisma.userPlatform.findMany({
      where: whereClause,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            supportsAutoSync: true,
          },
        },
      },
    });

    // Get latest sync logs for each platform
    const syncLogs = await prisma.syncLog.findMany({
      where: {
        userId: session.user.id,
        platformId: { not: null },
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 50,
    });

    // Group sync logs by platform
    const syncLogsByPlatform: Record<string, any[]> = {};
    syncLogs.forEach((log) => {
      if (log.platformId) {
        if (!syncLogsByPlatform[log.platformId]) {
          syncLogsByPlatform[log.platformId] = [];
        }
        syncLogsByPlatform[log.platformId].push(log);
      }
    });

    // Build sync status for each platform
    const syncStatus = userPlatforms.map((up) => {
      const platformLogs = syncLogsByPlatform[up.platformId] || [];
      const lastLog = platformLogs[0];
      
      return {
        platformId: up.platformId,
        platform: up.platform,
        status: up.syncStatus,
        lastSyncedAt: up.lastSyncedAt,
        lastSyncError: up.lastSyncError,
        lastSyncDuration: up.lastSyncDuration,
        nextSyncAt: up.nextSyncAt,
        autoSync: up.autoSync,
        syncAttempts: up.syncAttempts,
        consecutiveFailures: up.consecutiveFailures,
        lastLog,
        recentLogs: platformLogs.slice(0, 5),
      };
    });

    // Get overall sync stats
    const overallStats = {
      totalPlatforms: userPlatforms.length,
      syncingPlatforms: userPlatforms.filter((p) => p.syncStatus === "IN_PROGRESS").length,
      failedPlatforms: userPlatforms.filter((p) => p.syncStatus === "FAILED").length,
      successPlatforms: userPlatforms.filter((p) => p.syncStatus === "SUCCESS").length,
      pendingPlatforms: userPlatforms.filter((p) => p.syncStatus === "PENDING").length,
    };

    // Get entries synced today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entriesToday = await prisma.trackerEntry.count({
      where: {
        userId: session.user.id,
        source: "sync",
        createdAt: { gte: today },
      },
    });

    // Get unsynced entries (manual entries)
    const unsyncedCount = await prisma.trackerEntry.count({
      where: {
        userId: session.user.id,
        source: "manual",
        isVerified: false,
      },
    });

    return apiResponse({
      syncStatus,
      overallStats,
      entriesToday,
      unsyncedCount,
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return apiError("Failed to fetch sync status", 500);
  }
}
