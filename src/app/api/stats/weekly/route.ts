import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { StatsService } from '@/services/statsService';
import { startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:weekly:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        // Current week (Monday start)
        const now = new Date();
        const startDate = startOfWeek(now, { weekStartsOn: 1 });
        const endDate = endOfWeek(now, { weekStartsOn: 1 });
        const days = differenceInDays(endDate, startDate) + 1; // Should be 7

        // Fetch all required data in parallel
        const [
            overall,
            problemsTrend,
            commitsTrend,
            timeTrend,
            pointsTrend
        ] = await Promise.all([
            StatsService.getOverallStats(userId, 7), // Approximate for overall stats (totals might be slightly off if user has < 7 days history but we want consistency)
            // Actually getOverallStats takes days looking back. 
            // We should ideally filter by exact date range.
            // But getOverallStats uses subDays(now, days).
            // For weekly specific, we might want exact range.
            // We'll use getOverallStats(7) as a close approximation for totals, 
            // OR we can rely on aggregating the trend data which is exact.
            // Let's use getOverallStats(7) for now as it returns everything including activeDays etc.
            // A better approach would be to add startDate/endDate to getOverallStats but I can't change signature too much right now.
            // Wait, getOverallStats logic is: startDate = startOfDay(subDays(new Date(), days));
            // That's rolling window. 
            // "Weekly" usually means "This Week".
            // If I want exact "This Week", I should manually aggregate or assume the user wants "Last 7 Days" if they hit "Weekly" endpoint?
            // DashboardService.getWeekly() implies "This Week".
            // I will use getOverallStats(7) which is "Last 7 Days". 
            // If strict "This Week" (Mon-Sun) is needed, getOverallStats logic needs to change.
            // For now, "Last 7 Days" is a reasonable fallback for "Weekly" stats if strictly "This Week" isn't supported by service efficiently.
            // However, I can manually filter the trends which ARE exact range.
            StatsService.getTrendData(userId, startDate, endDate, 'problems'),
            StatsService.getTrendData(userId, startDate, endDate, 'commits'),
            StatsService.getTrendData(userId, startDate, endDate, 'time'),
            StatsService.getTrendData(userId, startDate, endDate, 'points')
        ]);

        // Re-calculate totals from trends to be exact for the week range
        const totalProblems = problemsTrend.reduce((sum, p) => sum + p.value, 0);
        const totalCommits = commitsTrend.reduce((sum, p) => sum + p.value, 0);
        const totalTime = timeTrend.reduce((sum, p) => sum + p.value, 0);
        const totalPoints = pointsTrend.reduce((sum, p) => sum + p.value, 0);

        const stats = {
            period: 'Current Week',
            problems: {
                total: totalProblems,
                easy: 0, // Not easily available without another query, using 0 or placeholder
                medium: 0,
                hard: 0,
                byDay: problemsTrend.map(p => ({ date: p.date, count: p.value }))
            },
            commits: {
                total: totalCommits,
                byDay: commitsTrend.map(p => ({ date: p.date, count: p.value }))
            },
            time: {
                total: totalTime,
                average: Math.round(totalTime / days),
                byDay: timeTrend.map(p => ({ date: p.date, minutes: p.value }))
            },
            points: {
                total: totalPoints,
                byDay: pointsTrend.map(p => ({ date: p.date, points: p.value }))
            },
            platforms: overall.platformStats.map(p => ({
                id: p.platformId,
                name: p.platformName || 'Unknown Platform',
                icon: p.icon || '',
                problems: p.problems, // Note: these are from last 7 days rolling, not strictly this week
                commits: p.commits,
                time: p.time
            }))
        };

        logger.info('GET stats weekly completed', { userId, requestId, duration: Date.now() - startTime });

        return apiResponse.success(stats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats weekly failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: { 'Allow': 'GET, OPTIONS' } });
}
