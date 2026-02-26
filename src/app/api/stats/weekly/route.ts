import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { StatsService } from '@/services/statsService';
import { CacheService } from '@/services/cacheService';
import { startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { logger } from '@/lib/logger';

const RATE_LIMIT = 20;
const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return apiResponse.unauthorized('Unauthorized', requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:weekly:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        // Check cache first
        const cacheKey = `stats:weekly:data:${userId}`;
        const cachedStats = await CacheService.get(cacheKey);
        if (cachedStats) {
            logger.info('GET stats weekly cache hit', { userId, requestId, duration: Date.now() - startTime });
            return apiResponse.success(cachedStats, { meta: { requestId, cached: true } });
        }

        // Current week (Monday start)
        const now = new Date();
        const startDate = startOfWeek(now, { weekStartsOn: 1 });
        const endDate = endOfWeek(now, { weekStartsOn: 1 });
        const days = differenceInDays(endDate, startDate) + 1; // Should be 7

        // Fetch only needed fields for the week in one query
        const entries = await prisma.trackerEntry.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                date: true,
                platformId: true,
                problemsSolved: true,
                commits: true,
                timeSpent: true,
                points: true,
                platform: {
                    select: { id: true, name: true, icon: true },
                },
            },
            orderBy: { date: 'asc' },
        });

        // Initialize daily buckets
        const dailyStats = new Map<string, { problems: number; commits: number; time: number; points: number }>();
        // Pre-fill all days
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dailyStats.set(key, { problems: 0, commits: 0, time: 0, points: 0 });
        }

        // Initialize totals and breakdowns
        let totalProblems = 0;
        let totalCommits = 0;
        let totalTime = 0;
        let totalPoints = 0;
        const platformMap = new Map<string, { id: string; name: string; icon: string; problems: number; commits: number; time: number }>();

        // Process entries
        for (const entry of entries) {
            const dayKey = entry.date.toISOString().split('T')[0];
            const dayStat = dailyStats.get(dayKey);

            if (dayStat) {
                dayStat.problems += entry.problemsSolved;
                dayStat.commits += entry.commits;
                dayStat.time += entry.timeSpent;
                dayStat.points += (entry.points || 0);
            }

            totalProblems += entry.problemsSolved;
            totalCommits += entry.commits;
            totalTime += entry.timeSpent;
            totalPoints += (entry.points || 0);

            // Platform stats
            if (entry.platformId) {
                if (!platformMap.has(entry.platformId)) {
                    platformMap.set(entry.platformId, {
                        id: entry.platformId,
                        name: entry.platform?.name || 'Unknown',
                        icon: entry.platform?.icon || '',
                        problems: 0,
                        commits: 0,
                        time: 0
                    });
                }
                const pStat = platformMap.get(entry.platformId)!;
                pStat.problems += entry.problemsSolved;
                pStat.commits += entry.commits;
                pStat.time += entry.timeSpent;
            }
        }

        // Format trends
        const dates = Array.from(dailyStats.keys()).sort();
        const problemsTrend = dates.map(date => ({ date, count: dailyStats.get(date)!.problems }));
        const commitsTrend = dates.map(date => ({ date, count: dailyStats.get(date)!.commits }));
        const timeTrend = dates.map(date => ({ date, minutes: dailyStats.get(date)!.time }));
        const pointsTrend = dates.map(date => ({ date, points: dailyStats.get(date)!.points }));

        const stats = {
            period: 'Current Week',
            problems: {
                total: totalProblems,
                easy: 0, // Simplified as per original
                medium: 0,
                hard: 0,
                byDay: problemsTrend
            },
            commits: {
                total: totalCommits,
                byDay: commitsTrend
            },
            time: {
                total: totalTime,
                average: Math.round(totalTime / days),
                byDay: timeTrend
            },
            points: {
                total: totalPoints,
                byDay: pointsTrend
            },
            platforms: Array.from(platformMap.values())
        };

        logger.info('GET stats weekly completed', { userId, requestId, duration: Date.now() - startTime });

        // Cache for 5 minutes
        await CacheService.set(cacheKey, stats, CACHE_TTL_SECONDS);

        return apiResponse.success(stats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats weekly failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: { 'Allow': 'GET, OPTIONS' } });
}
