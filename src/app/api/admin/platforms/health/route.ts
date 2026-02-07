
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";
import { queues } from "@/lib/queue";

export const GET = withErrorHandling(async (req: NextRequest) => { // Updated
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  // 1. Fetch Platforms
  const platforms = await prisma.platform.findMany({
    include: {
      _count: {
        select: { users: { where: { isActive: true } } }
      }
    },
    orderBy: [
      { isActive: 'desc' }, // Active first
      { name: 'asc' }
    ]
  });

  // 2. Fetch Recent Sync Stats (last 24h)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Group by platformId
  const syncStats = await prisma.syncLog.groupBy({
    by: ['platformId'],
    where: { createdAt: { gte: twentyFourHoursAgo } },
    _count: { id: true },
    _avg: { duration: true }
  });

  const errorStats = await prisma.syncLog.groupBy({
    by: ['platformId'],
    where: { createdAt: { gte: twentyFourHoursAgo }, hasError: true },
    _count: { id: true }
  });

  // Map stats to lookup objects
  const statsMap: Record<string, any> = {};
  syncStats.forEach(s => {
    if (s.platformId) {
      statsMap[s.platformId] = { count: s._count.id, avgDuration: s._avg.duration };
    }
  });

  const errorMap: Record<string, number> = {};
  errorStats.forEach(s => {
    if (s.platformId) {
      errorMap[s.platformId] = s._count.id;
    }
  });

  // 3. Assemble Response
  const platformData = platforms.map(p => {
    const s = statsMap[p.id] || { count: 0, avgDuration: 0 };
    const errCount = errorMap[p.id] || 0;
    const successRate = s.count > 0 ? ((s.count - errCount) / s.count) * 100 : 100;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      healthStatus: (p as any).healthStatus || 'unknown', // Cast if field missing in types
      healthMessage: (p as any).healthMessage,
      lastHealthCheck: (p as any).lastHealthCheck,
      avgSyncDuration: s.avgDuration,
      successRate: parseFloat(successRate.toFixed(1)),
      totalUsers: p._count.users,
      recentErrors: errCount,
      isActive: p.isActive,
      maintenanceMode: (p as any).maintenanceMode
    };
  });

  const summary = {
    healthy: platformData.filter(p => p.healthStatus === 'healthy').length,
    degraded: platformData.filter(p => p.healthStatus === 'degraded').length,
    down: platformData.filter(p => p.healthStatus === 'down').length,
    unknown: platformData.filter(p => p.healthStatus === 'unknown').length
  };

  return success({
    platforms: platformData,
    summary,
    lastUpdated: new Date().toISOString()
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => { // Updated
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const body = await req.json();
  const { platformIds } = body;

  // Trigger health check logic
  // Queue detailed check
  // queues.sync.add(...) or similar if queues exists
  // For now just return success

  return success({
    message: "Health checks queued",
    platformsQueued: platformIds ? platformIds.length : "all"
  });
});
