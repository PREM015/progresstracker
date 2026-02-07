import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

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
        const session = await getServerSession(authOptions);
        if (!session) {
            return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:dashboard:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        // specific stats
        const [
            totalPlatforms,
            totalChallenges,
            completedChallenges,
            upcomingDesires,
            recentActivity
        ] = await Promise.all([
            prisma.userPlatform.count({ where: { userId: session.user.id } }),
            prisma.goal.count({ where: { userId: session.user.id } }),
            prisma.goal.count({ where: { userId: session.user.id, status: 'COMPLETED' } }),
            prisma.goal.count({ where: { userId: session.user.id, status: 'ACTIVE' } }),
            prisma.auditLog.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);

        // Calculate completion rate
        const completionRate = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

        const stats = {
            platforms: {
                total: totalPlatforms
            },
            challenges: {
                total: totalChallenges,
                completed: completedChallenges,
                completionRate
            },
            goals: {
                active: upcomingDesires
            },
            recentActivity: recentActivity.map(a => ({
                id: a.id,
                action: a.action,
                entity: a.entityType,
                description: a.description || a.action,
                date: a.createdAt
            }))
        };

        logger.info('GET stats dashboard completed', { userId: session.user.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(stats, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET stats dashboard failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
