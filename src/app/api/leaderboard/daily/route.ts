import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: any): NextResponse {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
    response.headers.set('X-Request-ID', requestId);
    if (rateLimitResult) {
        response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    }
    return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `leaderboard:daily:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const { searchParams } = request.nextUrl;
        const Validation = querySchema.safeParse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
        });

        if (!Validation.success) {
            return addHeaders(apiResponse.validationError('Invalid parameters', Validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { page, limit } = Validation.data;
        const skip = (page - 1) * limit;

        // Get today's date at midnight UTC
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Fetch daily stats directly since they are unique per user per day
        const [stats, total] = await Promise.all([
            prisma.dailyStats.findMany({
                where: {
                    date: today,
                    user: {
                        isActive: true,
                        isPublic: true,
                    }
                },
                select: {
                    totalPoints: true,
                    totalProblems: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            image: true,
                            rank: true,
                        }
                    }
                },
                orderBy: {
                    totalPoints: 'desc',
                },
                skip,
                take: limit,
            }),
            prisma.dailyStats.count({
                where: {
                    date: today,
                    user: {
                        isActive: true,
                        isPublic: true,
                    }
                }
            })
        ]);

        const data = stats.map((stat, index) => ({
            ...stat.user,
            points: stat.totalPoints,
            problemsSolved: stat.totalProblems,
            // Rank is just the index + skip because we are ordering by points
            displayRank: skip + index + 1,
        }));

        logger.info('GET daily leaderboard completed', { page, total, requestId, duration: Date.now() - startTime });

        return addHeaders(
            apiResponse.paginated(data, {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPreviousPage: page > 1,
            }, { meta: { requestId } }),
            requestId,
            rateLimitResult
        );

    } catch (error) {
        logger.error('GET daily leaderboard failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
