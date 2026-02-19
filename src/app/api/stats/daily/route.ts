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

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return apiResponse.unauthorized('Unauthorized', requestId);
        }

        const userId = session.user.id;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:daily:${userId}`);

        if (!rateLimitResult.success) {
            return apiResponse.rateLimited(60, requestId);
        }

        const searchParams = request.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '30', 10);

        const endDate = endOfDay(new Date());
        const startDate = startOfDay(subDays(endDate, days));

        // Fetch all trends in parallel
        const [problemsTrend, commitsTrend, timeTrend] = await Promise.all([
            StatsService.getTrendData(userId, startDate, endDate, 'problems'),
            StatsService.getTrendData(userId, startDate, endDate, 'commits'),
            StatsService.getTrendData(userId, startDate, endDate, 'time'),
        ]);

        // Merge data by date
        const dailyStats = problemsTrend.map((item, index) => ({
            date: item.date,
            problems: item.value,
            commits: commitsTrend[index]?.value || 0,
            time: timeTrend[index]?.value || 0,
        }));

        return apiResponse.success(dailyStats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats daily failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}
