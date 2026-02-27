import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { StatsService } from '@/services/statsService';
import { startOfDay, subDays, endOfDay, format, eachDayOfInterval } from 'date-fns';
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

        // Fetch entries directly
        const entries = await prisma.trackerEntry.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
            },
            select: {
                date: true,
                problemsSolved: true,
                commits: true,
                timeSpent: true,
            },
        });

        // Group by date
        const grouped = new Map<string, { problems: number; commits: number; time: number }>();

        entries.forEach(entry => {
            const dateKey = format(entry.date, 'yyyy-MM-dd');
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, { problems: 0, commits: 0, time: 0 });
            }
            const current = grouped.get(dateKey)!;
            current.problems += entry.problemsSolved;
            current.commits += entry.commits;
            current.time += entry.timeSpent;
        });

        // Fill in all days
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyStats = allDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const data = grouped.get(dateKey) || { problems: 0, commits: 0, time: 0 };
            return {
                date: dateKey,
                problems: data.problems,
                commits: data.commits,
                time: data.time,
            };
        });

        return apiResponse.success(dailyStats, { meta: { requestId } });

    } catch (error) {
        logger.error('GET stats daily failed', { requestId }, error);
        return apiResponse.internalError('Operation failed', requestId);
    }
}
