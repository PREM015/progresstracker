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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stats:usage:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const subscription = await prisma.subscription.findUnique({
            where: { userId: session.user.id }
        });

        const apiKey = await prisma.apiKey.findFirst({
            where: { userId: session.user.id, isActive: true }
        });

        const usage = {
            platforms: {
                current: subscription?.currentPlatformCount || 0,
                limit: subscription?.platformLimit || 5, // Default from schema
            },
            exports: {
                current: subscription?.currentExportCount || 0,
                limit: subscription?.exportLimitMonthly || 3,
                resetDate: subscription?.usageResetAt,
            },
            api: {
                current: apiKey?.usageCountDaily || 0,
                limit: subscription?.apiRequestsDaily || 100,
            },
            storage: {
                used: 0, // Not implemented yet
                limit: 100 * 1024 * 1024 // 100MB dummy limit
            }
        };

        logger.info('GET stats usage completed', { userId: session.user.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(usage, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET stats usage failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
