/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/admin/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// HELPER
// =============================================================================

async function checkAdminAccess(session: { user?: { id?: string; email?: string | null } } | null) {
  if (!session?.user?.id) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, role: true },
  });

  if (!user?.isAdmin && user?.role !== 'admin') {
    return { authorized: false, error: 'Admin access required', status: 403 };
  }

  return { authorized: true, adminId: session.user.id };
}

// =============================================================================
// GET - Admin dashboard overview
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      logger.warn('Unauthorized admin access');
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    logger.debug('Fetching admin dashboard', { adminId: access.adminId });

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // User statistics
    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      activeUsers,
      bannedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.user.count({ where: { isActive: true, isBanned: false } }),
      prisma.user.count({ where: { isBanned: true } }),
    ]);

    const userGrowthPercent = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : 100;

    // Platform statistics
    const [activePlatforms, totalConnections] = await Promise.all([
      prisma.platform.count({ where: { isActive: true } }),
      prisma.userPlatform.count({ where: { isActive: true } }),
    ]);

    // Sync statistics - ✅ FIXED: Use SyncStatus enum
    const [totalSyncs, successfulSyncs, failedSyncs, pendingSyncs] = await Promise.all([
      prisma.syncLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.syncLog.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: SyncStatus.SUCCESS },
      }),
      prisma.syncLog.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: SyncStatus.FAILED },
      }),
      prisma.syncLog.count({
        where: { status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] } },
      }),
    ]);

    const syncSuccessRate = totalSyncs > 0
      ? Math.round((successfulSyncs / totalSyncs) * 100)
      : 0;

    // Tracker entries
    const [totalTrackerEntries, entriesThisMonth] = await Promise.all([
      prisma.trackerEntry.count(),
      prisma.trackerEntry.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // Recent users
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    // System health
    const failedSyncsLast24h = await prisma.syncLog.count({
      where: {
        status: SyncStatus.FAILED,
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    logger.info('Admin dashboard fetched', {
      adminId: access.adminId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          new: newUsersThisMonth,
          growthPercent: userGrowthPercent,
        },
        platforms: {
          active: activePlatforms,
          totalConnections,
        },
        syncs: {
          total: totalSyncs,
          successful: successfulSyncs,
          failed: failedSyncs,
          pending: pendingSyncs,
          successRate: syncSuccessRate,
        },
        entries: {
          total: totalTrackerEntries,
          thisMonth: entriesThisMonth,
        },
        recentUsers,
        systemHealth: {
          status: failedSyncsLast24h > 10 ? 'degraded' : 'healthy',
          pendingSyncs,
          failedSyncsLast24h,
        },
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Admin dashboard error', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin dashboard' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Admin actions
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const { action } = body;

    logger.info('Admin action requested', { adminId: access.adminId, action });

    switch (action) {
      case 'clear_old_logs': {
        const daysOld = body.days || 30;
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        const result = await prisma.syncLog.deleteMany({
          where: { createdAt: { lt: cutoff } },
        });

        logger.info('Cleared old sync logs', { adminId: access.adminId, deleted: result.count });

        return NextResponse.json({
          success: true,
          message: `Deleted ${result.count} sync logs older than ${daysOld} days`,
        });
      }

      case 'clear_expired_sessions': {
        const result = await prisma.activeSession.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { isValid: false },
            ],
          },
        });

        logger.info('Cleared expired sessions', { adminId: access.adminId, deleted: result.count });

        return NextResponse.json({
          success: true,
          message: `Deleted ${result.count} expired sessions`,
        });
      }

      case 'recalculate_stats': {
        // Recalculate user stats
        const users = await prisma.user.findMany({
          select: { id: true },
        });

        for (const user of users) {
          const [totalProblems, totalCommits, totalAchievements] = await Promise.all([
            prisma.trackerEntry.aggregate({
              where: { userId: user.id },
              _sum: { problemsSolved: true },
            }),
            prisma.trackerEntry.aggregate({
              where: { userId: user.id },
              _sum: { commits: true },
            }),
            prisma.userAchievement.count({ where: { userId: user.id } }),
          ]);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              totalProblems: totalProblems._sum.problemsSolved || 0,
              totalCommits: totalCommits._sum.commits || 0,
              totalAchievements,
            },
          });
        }

        logger.info('Stats recalculated', { adminId: access.adminId, userCount: users.length });

        return NextResponse.json({
          success: true,
          message: `Recalculated stats for ${users.length} users`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Admin action error', {}, error);
    return NextResponse.json(
      { success: false, error: 'Action failed' },
      { status: 500 }
    );
  }
}