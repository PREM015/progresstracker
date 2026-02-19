import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { StatsService } from '@/services/statsService';
import { startOfDay, subDays, endOfDay } from 'date-fns';
import { logger } from '@/lib/logger';

const RATE_LIMIT = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
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

        // Fetch all required data in parallel
        const [
            overall,
            problemsTrend,
            commitsTrend,
            timeTrend,
            pointsTrend
        ] = await Promise.all([
            StatsService.getOverallStats(userId, days),
            StatsService.getTrendData(userId, startDate, endDate, 'problems'),
            StatsService.getTrendData(userId, startDate, endDate, 'commits'),
            StatsService.getTrendData(userId, startDate, endDate, 'time'),
            StatsService.getTrendData(userId, startDate, endDate, 'points')
        ]);

        const stats = {
            period: `${days} days`,
            problems: {
                total: overall.totalProblems,
                easy: overall.difficultyBreakdown.easy,
                medium: overall.difficultyBreakdown.medium,
                hard: overall.difficultyBreakdown.hard,
                byDay: problemsTrend.map(p => ({ date: p.date, count: p.value }))
            },
            commits: {
                total: overall.totalCommits,
                byDay: commitsTrend.map(p => ({ date: p.date, count: p.value }))
            },
            time: {
                total: overall.totalTimeSpent,
                average: overall.avgTimePerDay,
                byDay: timeTrend.map(p => ({ date: p.date, minutes: p.value }))
            },
            points: {
                total: overall.totalPoints,
                byDay: pointsTrend.map(p => ({ date: p.date, points: p.value }))
            },
            platforms: overall.platformStats.map(p => ({
                id: p.platformId,
                name: p.platformName || 'Unknown Platform',
                icon: p.icon || '',
                problems: p.problems,
                commits: p.commits,
                time: p.time
            }))
        };

        logger.info('GET stats overview completed', { userId, requestId, duration: Date.now() - startTime });

        return apiResponse.success(stats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats overview failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: { 'Allow': 'GET, OPTIONS' } });
}
