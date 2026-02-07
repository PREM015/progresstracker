
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, error } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import auditLogService from "@/services/auditLogService";
import { CacheService } from "@/services/cacheService"; // Assuming existence as per notes

export const GET = withErrorHandling(async (req: NextRequest) => {
  // 1. Admin Auth
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "7d";

  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  const prevPeriodStart = new Date();

  if (period === "30d") {
    startDate.setDate(now.getDate() - 30);
    prevPeriodStart.setDate(now.getDate() - 60);
  } else if (period === "90d") {
    startDate.setDate(now.getDate() - 90);
    prevPeriodStart.setDate(now.getDate() - 180);
  } else {
    startDate.setDate(now.getDate() - 7);
    prevPeriodStart.setDate(now.getDate() - 14);
  }

  // 3. Parallel Queries
  const [
    totalUsers,
    activeUsers,
    newUsers,
    prevNewUsers,
    platformsTotal,
    activeConnections,
    recentEvents,
    subscriptionStats,
    syncStats,
    syncSuccessRateRes,
    activityStats,
    ticketStats
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, lastActiveAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: startDate }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: prevPeriodStart, lt: startDate }, deletedAt: null } }),
    prisma.platform.count(),
    prisma.userPlatform.count({ where: { isActive: true } }),
    auditLogService.getLogs({ limit: 10 }),
    prisma.subscription.groupBy({
      by: ['tier'],
      _count: true,
      _sum: { priceAmount: true },
      where: { status: 'ACTIVE' }
    }),
    prisma.syncLog.aggregate({
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
      _avg: { duration: true }
    }),
    prisma.syncLog.count({
      where: { createdAt: { gte: startDate }, hasError: false }
    }),
    prisma.trackerEntry.count({
      where: { createdAt: { gte: startDate } }
    }),
    prisma.supportTicket.aggregate({
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
      _avg: { satisfactionRating: true }
    })
  ]);

  // Open tickets count (total, not just period)
  const openTickets = await prisma.supportTicket.count({
    where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } }
  });

  // 4. Calculations
  const growthPercent = prevNewUsers > 0
    ? ((newUsers - prevNewUsers) / prevNewUsers) * 100
    : 0;

  const syncCount = syncStats._count.id;
  const syncSuccessRate = syncCount > 0
    ? (syncSuccessRateRes / syncCount) * 100
    : 100;

  const subMap: Record<string, number> = {};
  let totalMrr = 0;
  subscriptionStats.forEach(s => {
    subMap[s.tier.toLowerCase()] = s._count;
    totalMrr += (s._sum.priceAmount || 0);
  });

  return success({
    users: {
      total: totalUsers,
      active: activeUsers,
      newInPeriod: newUsers,
      growthPercent: parseFloat(growthPercent.toFixed(1))
    },
    platforms: {
      total: platformsTotal,
      activeConnections: activeConnections,
      syncSuccessRate: parseFloat(syncSuccessRate.toFixed(1))
    },
    subscriptions: {
      free: subMap['free'] || 0,
      starter: subMap['starter'] || 0,
      pro: subMap['pro'] || 0,
      enterprise: subMap['enterprise'] || 0,
      mrr: totalMrr / 100, // Cents to Dollars
      arr: (totalMrr / 100) * 12
    },
    activity: {
      totalEntriesInPeriod: activityStats,
      avgDailyActiveUsers: 0, // Requires more complex per-day grouping
      topPlatforms: []
    },
    syncs: {
      totalInPeriod: syncCount,
      successCount: syncSuccessRateRes,
      failedCount: syncCount - syncSuccessRateRes,
      avgDurationMs: Math.round(syncStats._avg.duration || 0)
    },
    support: {
      openTickets: openTickets,
      avgResponseTimeHours: 0, // Placeholder
      satisfactionRate: parseFloat((ticketStats._avg.satisfactionRating || 0).toFixed(1))
    },
    system: {
      uptime: 100,
      dbSizeMB: 0, // Handled in database/stats for depth
      cacheHitRate: 0,
      errorRate: syncCount > 0 ? parseFloat(((1 - (syncSuccessRateRes / syncCount)) * 100).toFixed(1)) : 0
    },
    recentEvents: recentEvents.logs.map(log => ({
      id: log.id,
      type: log.action,
      message: log.description || log.action,
      timestamp: log.createdAt.toISOString()
    }))
  });
});

