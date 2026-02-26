
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { withCache } from '@/lib/withCache';
import { startOfDay, subDays, endOfDay, differenceInDays } from 'date-fns';
import { logger } from '@/lib/logger';

const RATE_LIMIT = 20;

const handler = async (request: NextRequest): Promise<NextResponse> => {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return apiResponse.unauthorized('Unauthorized', requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:overview:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        const searchParams = request.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '30', 10);

        const endDate = endOfDay(new Date());
        const startDate = startOfDay(subDays(endDate, days));

        // Fetch only needed fields in one query
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
                easyProblems: true,
                mediumProblems: true,
                hardProblems: true,
                platform: {
                    select: { id: true, name: true, icon: true },
                },
            },
            orderBy: { date: 'asc' },
        });

        // Initialize daily buckets
        const dailyStats = new Map<string, { problems: number; commits: number; time: number; points: number }>();
        // Pre-fill
        const allDays = differenceInDays(endDate, startDate) + 1;
        for (let i = 0; i < allDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dailyStats.set(key, { problems: 0, commits: 0, time: 0, points: 0 });
        }

        // Initialize aggregations
        let totalProblems = 0;
        let totalCommits = 0;
        let totalTime = 0;
        let totalPoints = 0;
        let easyProblems = 0;
        let mediumProblems = 0;
        let hardProblems = 0;
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

            easyProblems += entry.easyProblems || 0;
            mediumProblems += entry.mediumProblems || 0;
            hardProblems += entry.hardProblems || 0;

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

        // Aggregate trends (compute average time from totals maybe? No, return total time)
        const dates = Array.from(dailyStats.keys()).sort();
        const problemsTrend = dates.map(date => ({ date, count: dailyStats.get(date)!.problems }));
        const commitsTrend = dates.map(date => ({ date, count: dailyStats.get(date)!.commits }));
        const timeTrend = dates.map(date => ({ date, minutes: dailyStats.get(date)!.time }));
        const pointsTrend = dates.map(date => ({ date, points: dailyStats.get(date)!.points }));

        const stats = {
            period: `${days} days`,
            problems: {
                total: totalProblems,
                easy: easyProblems,
                medium: mediumProblems,
                hard: hardProblems,
                byDay: problemsTrend
            },
            commits: {
                total: totalCommits,
                byDay: commitsTrend
            },
            time: {
                total: totalTime,
                average: allDays > 0 ? Math.round(totalTime / allDays) : 0,
                byDay: timeTrend
            },
            points: {
                total: totalPoints,
                byDay: pointsTrend
            },
            platforms: Array.from(platformMap.values())
        };

        logger.info('GET stats overview completed', { userId, requestId, duration: Date.now() - startTime });

        return apiResponse.success(stats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats overview failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
};

export const GET = withCache(handler, {
    keyGenerator: async (req) => {
        const session = await getServerSession(authOptions);
        if (!session) return null;
        const days = req.nextUrl.searchParams.get('days') || '30';
        return `stats:overview:${session.user.id}:${days}`;
    },
    ttl: 300,       // 5 min fresh
    staleTtl: 300,  // 5 min stale
    timingLabel: 'GET /api/stats/overview',
});

export const options = async () => {
    return new NextResponse(null, { status: 204, headers: { 'Allow': 'GET, OPTIONS' } });
};
