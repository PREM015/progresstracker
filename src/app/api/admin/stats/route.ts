// src/app/api/admin/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncStatus, GoalStatus, SubscriptionTier } from '@prisma/client';

// =============================================================================
// HELPER
// =============================================================================

async function checkAdminAccess(session: { user?: { id?: string } } | null) {
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
// GET - Get comprehensive admin stats
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const access = await checkAdminAccess(session);

    if (!access.authorized) {
      logger.warn('Unauthorized admin stats access');
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const periodDays = parseInt(period);

    logger.debug('Fetching admin stats', { adminId: access.adminId, periodDays });

    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // ===================
    // USER STATS
    // ===================
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      newUsersThisPeriod,
      newUsersPreviousPeriod,
      verifiedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true, isBanned: false } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.user.count({ 
        where: { createdAt: { gte: previousPeriodStart, lt: periodStart } } 
      }),
      prisma.user.count({ where: { isVerified: true } }),
    ]);

    const userGrowthRate = newUsersPreviousPeriod > 0 
      ? ((newUsersThisPeriod - newUsersPreviousPeriod) / newUsersPreviousPeriod) * 100 
      : 100;

    // ===================
    // PLATFORM STATS
    // ===================
    const [
      totalPlatforms,
      activePlatforms,
      totalConnections,
      newConnectionsThisPeriod,
    ] = await Promise.all([
      prisma.platform.count(),
      prisma.platform.count({ where: { isActive: true } }),
      prisma.userPlatform.count({ where: { isActive: true } }),
      prisma.userPlatform.count({ where: { createdAt: { gte: periodStart } } }),
    ]);

    // ===================
    // SYNC STATS - ✅ FIXED: Use SyncStatus enum
    // ===================
    const [totalSyncs, successfulSyncs, failedSyncs, pendingSyncs] = await Promise.all([
      prisma.syncLog.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.syncLog.count({ 
        where: { createdAt: { gte: periodStart }, status: SyncStatus.SUCCESS } 
      }),
      prisma.syncLog.count({ 
        where: { createdAt: { gte: periodStart }, status: SyncStatus.FAILED } 
      }),
      prisma.syncLog.count({ 
        where: { status: { in: [SyncStatus.PENDING, SyncStatus.IN_PROGRESS] } } 
      }),
    ]);

    const syncSuccessRate = totalSyncs > 0 
      ? Math.round((successfulSyncs / totalSyncs) * 100) 
      : 0;

    // ===================
    // TRACKER STATS
    // ===================
    const [totalEntries, entriesThisPeriod, entriesPreviousPeriod] = await Promise.all([
      prisma.trackerEntry.count(),
      prisma.trackerEntry.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.trackerEntry.count({ 
        where: { createdAt: { gte: previousPeriodStart, lt: periodStart } } 
      }),
    ]);

    // ===================
    // GOALS STATS
    // ===================
    const goalsByStatus = await prisma.goal.groupBy({
      by: ['status'],
      _count: true,
    });

    const goalsMap = goalsByStatus.reduce((acc, g) => {
      acc[g.status] = g._count;
      return acc;
    }, {} as Record<GoalStatus, number>);

    // ===================
    // SUBSCRIPTION STATS
    // ===================
    const subscriptionsByTier = await prisma.subscription.groupBy({
      by: ['tier'],
      _count: true,
      where: { status: 'ACTIVE' },
    });

    const subscriptionsMap = subscriptionsByTier.reduce((acc, s) => {
      acc[s.tier] = s._count;
      return acc;
    }, {} as Record<SubscriptionTier, number>);

    // ===================
    // RECENT ACTIVITY
    // ===================
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

    // ===================
    // ACHIEVEMENT STATS
    // ===================
    const totalAchievementsUnlocked = await prisma.userAchievement.count();

    logger.info('Admin stats fetched', {
      adminId: access.adminId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        period: { days: periodDays, start: periodStart, end: now },
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          verified: verifiedUsers,
          newThisPeriod: newUsersThisPeriod,
          growthRate: Math.round(userGrowthRate * 100) / 100,
        },
        platforms: {
          total: totalPlatforms,
          active: activePlatforms,
          totalConnections,
          newConnectionsThisPeriod,
          avgConnectionsPerUser: activeUsers > 0 
            ? Math.round((totalConnections / activeUsers) * 100) / 100 
            : 0,
        },
        syncs: {
          total: totalSyncs,
          successful: successfulSyncs,
          failed: failedSyncs,
          pending: pendingSyncs,
          successRate: syncSuccessRate,
        },
        tracker: {
          totalEntries,
          entriesThisPeriod,
          entriesGrowth: entriesPreviousPeriod > 0
            ? Math.round(((entriesThisPeriod - entriesPreviousPeriod) / entriesPreviousPeriod) * 100)
            : 100,
        },
        goals: {
          total: Object.values(goalsMap).reduce((a, b) => a + b, 0),
          active: goalsMap[GoalStatus.ACTIVE] || 0,
          completed: goalsMap[GoalStatus.COMPLETED] || 0,
          failed: goalsMap[GoalStatus.FAILED] || 0,
        },
        subscriptions: {
          free: subscriptionsMap[SubscriptionTier.FREE] || 0,
          starter: subscriptionsMap[SubscriptionTier.STARTER] || 0,
          pro: subscriptionsMap[SubscriptionTier.PRO] || 0,
          team: subscriptionsMap[SubscriptionTier.TEAM] || 0,
          enterprise: subscriptionsMap[SubscriptionTier.ENTERPRISE] || 0,
        },
        achievements: { totalUnlocked: totalAchievementsUnlocked },
        recentUsers,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error fetching admin stats', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}