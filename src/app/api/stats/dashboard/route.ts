
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { withCache } from '@/lib/withCache';
import {
    startOfDay, endOfDay,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    format
} from 'date-fns';

const RATE_LIMIT = 20;

// Helper for formatting duration
function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
}

const handler = async (request: NextRequest): Promise<NextResponse> => {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return apiResponse.unauthorized('Unauthorized', requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:dashboard:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        // -----------------------------------------------------------------------
        // Fallback Logic: Calculate dashboard stats on-the-fly (cache MISS)
        // This exactly matches the logic in statsWorker.ts to ensure consistency.
        // -----------------------------------------------------------------------
        const now = new Date();

        const periodAgg = (gte: Date, lte: Date) =>
            prisma.trackerEntry.aggregate({
                where: { userId, date: { gte, lte } },
                _sum: { problemsSolved: true, commits: true, timeSpent: true },
                _count: true,
            });

        // Execute all queries in parallel
        const [
            user,
            todayAgg,
            weekAgg,
            monthAgg,
            connectedPlatforms,
            activeGoals,
            totalPoints // Use user.totalPoints usually, but let's grab it from user query
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    currentStreak: true,
                    longestStreak: true,
                    totalProblems: true,
                    totalPoints: true,
                    rank: true,
                    lastActivityDate: true,
                }
            }),
            periodAgg(startOfDay(now), endOfDay(now)),
            periodAgg(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })),
            periodAgg(startOfMonth(now), endOfMonth(now)),
            prisma.userPlatform.count({ where: { userId, isActive: true } }),
            prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
            null // Placeholder to match structure if needed, but user.totalPoints covers it
        ]);

        const emptyAgg = { _sum: { problemsSolved: 0, commits: 0, timeSpent: 0 }, _count: 0 };
        const today = todayAgg || emptyAgg;
        const week = weekAgg || emptyAgg;
        const month = monthAgg || emptyAgg;

        // Construct the dashboard response object
        const summary = {
            cards: {
                totalProblems: { value: user?.totalProblems ?? 0 },
                currentStreak: { value: user?.currentStreak ?? 0 },
                todayProblems: { value: today._sum.problemsSolved ?? 0 },
                weeklyProblems: { value: week._sum.problemsSolved ?? 0 },
                monthlyProblems: { value: month._sum.problemsSolved ?? 0 },
                totalTime: {
                    value: week._sum.timeSpent ?? 0,
                    displayValue: formatDuration(week._sum.timeSpent ?? 0)
                },
            },
            quickStats: {
                connectedPlatforms,
                activeGoals,
                totalPoints: user?.totalPoints ?? 0,
            },
            streakInfo: {
                current: user?.currentStreak ?? 0,
                longest: user?.longestStreak ?? 0,
                isAtRisk: (user?.currentStreak ?? 0) > 0 && today._count === 0,
                lastActivityDate: user?.lastActivityDate?.toISOString() ?? null,
            },
            todayProgress: {
                problems: today._sum.problemsSolved ?? 0,
                commits: today._sum.commits ?? 0,
                timeSpent: today._sum.timeSpent ?? 0,
                hasActivity: today._count > 0,
            },
            lastUpdated: now.toISOString(),
        };

        // Note: withCache will automatically wrap this response in a CacheEnvelope
        // and store it in stats:dashboard:data:{userId}
        return apiResponse.success(summary, { meta: { requestId } });

    } catch (error) {
        logger.error('Error fetching dashboard stats', { error, requestId });
        return apiResponse.internalError('Failed to fetch dashboard stats', requestId);
    }
};

export const GET = withCache(handler, {
    // Key MUST match statsWorker's key to share the precomputed cache
    keyGenerator: async (req) => {
        const session = await getServerSession(authOptions);
        return session ? `stats:dashboard:data:${session.user.id}` : null;
    },
    ttl: 300,       // 5 min fresh
    staleTtl: 300,  // 5 min stale
    timingLabel: 'GET /api/stats/dashboard',
});

export const dynamic = 'force-dynamic';
