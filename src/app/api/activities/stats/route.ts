
// =============================================================================
// src/app/api/activities/stats/route.ts
// =============================================================================
// Description: Get aggregated activity statistics
// Methods: GET, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
    response: NextResponse,
    requestId: string,
    rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    response.headers.set('X-Request-ID', requestId);

    if (rateLimitResult) {
        response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    }

    return response;
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
    const requestId = generateRequestId();
    const response = new NextResponse(null, { status: 204 });
    return addHeaders(response, requestId);
}

// =============================================================================
// GET - Activity Stats
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitKey = `activities-stats:${ip}`;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId, rateLimitResult);
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);

        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Get heatmap data (counts by date)
        const entries = await prisma.trackerEntry.groupBy({
            by: ['date'],
            where: {
                userId,
                deletedAt: null,
                date: {
                    gte: yearStart
                }
            },
            _count: {
                id: true
            },
            _sum: {
                timeSpent: true
            }
        });

        // Format for heatmap: { "2024-01-01": { count: 5, time: 120 } }
        const heatmap: Record<string, { count: number; time: number }> = {};
        entries.forEach(entry => {
            const dateStr = entry.date.toISOString().split('T')[0];
            heatmap[dateStr] = {
                count: entry._count.id,
                time: entry._sum.timeSpent || 0
            };
        });

        // Get basic stats
        const totalActivities = await prisma.trackerEntry.count({
            where: { userId, deletedAt: null }
        });

        const totalTime = await prisma.trackerEntry.aggregate({
            where: { userId, deletedAt: null },
            _sum: { timeSpent: true }
        });

        // Simple Streak Calculation (Can be moved to a Service for reusability if needed in User updates)
        // For now, we fetch distinct dates descending
        const distinctDates = await prisma.trackerEntry.findMany({
            where: { userId, deletedAt: null },
            select: { date: true },
            orderBy: { date: 'desc' },
            distinct: ['date']
        });

        let currentStreak = 0;

        if (distinctDates.length > 0) {
            const todayStr = now.toISOString().split('T')[0];
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const lastActive = distinctDates[0].date.toISOString().split('T')[0];

            // If active today or yesterday, streak is alive
            if (lastActive === todayStr || lastActive === yesterdayStr) {
                currentStreak = 1;
                let checkDate = new Date(distinctDates[0].date);

                for (let i = 1; i < distinctDates.length; i++) {
                    checkDate.setDate(checkDate.getDate() - 1); // Expected previous day
                    const checkStr = checkDate.toISOString().split('T')[0];
                    const actualStr = distinctDates[i].date.toISOString().split('T')[0];

                    if (checkStr === actualStr) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }

        const stats = {
            heatmap,
            totalActivities,
            totalTime: totalTime._sum.timeSpent || 0,
            currentStreak
        };

        const response = apiResponse.success(stats, { meta: { requestId } });
        return addHeaders(response, requestId, rateLimitResult);
    } catch (error) {
        logger.error('GET /api/activities/stats failed', { requestId }, error);
        const response = apiResponse.internalError('Failed to fetch stats', requestId);
        return addHeaders(response, requestId);
    }
}
