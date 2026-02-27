// src/app/api/admin/sync-health/route.ts
// Sync health check endpoint — returns Redis + sync status (no more BullMQ queues)
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/middleware/auth';
import { logger } from '@/lib/logger';

export const GET = withAdminAuth(async (_req) => {
    const startTime = Date.now();

    try {
        // 1. Redis health (Upstash)
        let redisConnected = false;
        try {
            const { cache } = await import('@/lib/redis');
            const testKey = `sync_health_${Date.now()}`;
            await cache.set(testKey, 'ok', 5);
            const val = await cache.get<string>(testKey);
            await cache.del(testKey);
            redisConnected = val === 'ok';
        } catch { redisConnected = false; }

        // 2. Last sync time from DB
        let lastSyncTime: string | null = null;
        let recentSyncStats = { total: 0, success: 0, failed: 0, pending: 0 };
        try {
            const { prisma } = await import('@/lib/prisma');
            const lastSync = await prisma.syncLog.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });
            lastSyncTime = lastSync?.createdAt?.toISOString() ?? null;

            // Get recent sync stats (last 24h)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const [total, success, failed, pending] = await Promise.all([
                prisma.syncLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
                prisma.syncLog.count({ where: { createdAt: { gte: oneDayAgo }, status: 'SUCCESS' } }),
                prisma.syncLog.count({ where: { createdAt: { gte: oneDayAgo }, status: 'FAILED' } }),
                prisma.syncLog.count({ where: { createdAt: { gte: oneDayAgo }, status: 'PENDING' } }),
            ]);
            recentSyncStats = { total, success, failed, pending };
        } catch { lastSyncTime = null; }

        return NextResponse.json({
            success: true,
            data: {
                redisConnected,
                // Jobs are now managed by Trigger.dev (check dashboard for queue status)
                jobEngine: 'trigger.dev',
                recentSyncStats,
                lastSyncTime,
                latency: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Sync health check failed', { error });
        return NextResponse.json({ success: false, error: 'Health check failed' }, { status: 500 });
    }
});
