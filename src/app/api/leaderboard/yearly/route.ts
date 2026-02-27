import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

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

function getStartOfYear(date: Date) {
    const d = new Date(date);
    d.setMonth(0);
    d.setDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `leaderboard:yearly:${ip}`);

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

        const end = new Date();
        const start = getStartOfYear(end);

        const groupedStats = await prisma.dailyStats.groupBy({
            by: ['userId'],
            where: {
                date: {
                    gte: start,
                    lte: end,
                },
                user: {
                    isActive: true,
                    isPublic: true
                }
            },
            _sum: {
                totalPoints: true,
                totalProblems: true,
            },
            orderBy: {
                _sum: {
                    totalPoints: 'desc',
                },
            },
            skip,
            take: limit,
        });

        const distinctUsers = await prisma.dailyStats.groupBy({
            by: ['userId'],
            where: {
                date: { gte: start, lte: end },
                user: { isActive: true, isPublic: true }
            },
        });
        const total = distinctUsers.length;

        const userIds = groupedStats.map(s => s.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                rank: true,
            }
        });

        const data = groupedStats.map((stat, index) => {
            const user = users.find(u => u.id === stat.userId);
            return {
                ...user,
                id: stat.userId,
                points: stat._sum.totalPoints ?? 0,
                problemsSolved: stat._sum.totalProblems ?? 0,
                displayRank: skip + index + 1,
            };
        });

        logger.info('GET yearly leaderboard completed', { page, total, requestId, duration: Date.now() - startTime });

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
        logger.error('GET yearly leaderboard failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
