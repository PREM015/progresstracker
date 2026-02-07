import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiResponse } from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return addHeaders(apiResponse.unauthorized(requestId), requestId);
        }

        const userId = session.user.id;

        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `leaderboard:rank:${userId}`);
        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                totalPoints: true,
                rank: true,
                currentStreak: true,
                totalAchievements: true,
            }
        });

        if (!user) {
            return addHeaders(apiResponse.notFound('User not found', requestId), requestId, rateLimitResult);
        }

        // If rank is null (not calculated yet), we might calculate it on the fly?
        // Calculating rank on the fly is expensive (counting users with more points).
        // Let's calculate it if strictly needed, or just return null/0.
        // For now, simple count query:
        let calculatedRank = user.rank;
        if (!calculatedRank && user.totalPoints > 0) {
            calculatedRank = await prisma.user.count({
                where: {
                    isActive: true,
                    totalPoints: { gt: user.totalPoints }
                }
            }) + 1;
        }

        const data = {
            ...user,
            rank: calculatedRank ?? 0,
        };

        logger.info('GET user rank completed', { userId, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(data, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET user rank failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
