// src/app/api/admin/sync-health/route.ts
// Sync health check endpoint — returns queue + Redis + sync status
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/middleware/auth';
import { logger } from '@/lib/logger';

export const GET = withAdminAuth(async (_req) => {
    const startTime = Date.now();

    try {
        // 1. Redis health
        let redisConnected = false;
        try {
            const { cache } = await import('@/lib/redis');
            const testKey = `sync_health_${Date.now()}`;
            await cache.set(testKey, 'ok', 5);
            const val = await cache.get<string>(testKey);
            await cache.del(testKey);
            redisConnected = val === 'ok';
        } catch { redisConnected = false; }

        // 2. Queue health (BullMQ)
        let queueActive = false;
        let failedJobs = 0;
        let waitingJobs = 0;
        let activeJobs = 0;
        try {
            const { scraperQueues } = await import('@/lib/bullmq');
            const counts = await scraperQueues.priority.getJobCounts('active', 'waiting', 'failed');
            activeJobs = counts.active ?? 0;
            waitingJobs = counts.waiting ?? 0;
            failedJobs = counts.failed ?? 0;
            queueActive = true;
        } catch { queueActive = false; }

        // 3. Last sync time from DB
        let lastSyncTime: string | null = null;
        try {
            const { prisma } = await import('@/lib/prisma');
            const lastSync = await prisma.syncLog.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });
            lastSyncTime = lastSync?.createdAt?.toISOString() ?? null;
        } catch { lastSyncTime = null; }

        return NextResponse.json({
            success: true,
            data: {
                redisConnected,
                queueActive,
                activeJobs,
                waitingJobs,
                failedJobs,
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
