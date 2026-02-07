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

        const { searchParams } = request.nextUrl;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:activity:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const [activity, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: skip,
            }),
            prisma.auditLog.count({ where: { userId: session.user.id } })
        ]);

        const formattedActivity = activity.map(a => ({
            id: a.id,
            action: a.action,
            category: a.category,
            entityType: a.entityType,
            entityId: a.entityId,
            description: a.description,
            createdAt: a.createdAt,
            status: a.status
        }));

        logger.info('GET stats activity completed', { userId: session.user.id, count: activity.length, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(formattedActivity, { meta: { requestId, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 } } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET stats activity failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
