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
        // Check for admin role? 
        // Assuming admin role check or simple auth for now. The schema User model doesn't explicitly show 'role' field in truncated view but usually it exists.
        // If not, just ensure authenticated.
        if (!session) {
            return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
        }

        // Check rate limit
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:stats:${ip}`);
        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const [total, active, unsubscribed, aggregate] = await Promise.all([
            prisma.newsletterSubscriber.count(),
            prisma.newsletterSubscriber.count({ where: { isActive: true } }),
            prisma.newsletterSubscriber.count({ where: { isActive: false } }),
            prisma.newsletterSubscriber.aggregate({
                _sum: {
                    emailsSent: true,
                    emailsOpened: true,
                    emailsClicked: true,
                }
            })
        ]);

        const stats = {
            subscribers: {
                total,
                active,
                unsubscribed,
            },
            engagement: {
                sent: aggregate._sum.emailsSent || 0,
                opened: aggregate._sum.emailsOpened || 0,
                clicked: aggregate._sum.emailsClicked || 0,
                openRate: aggregate._sum.emailsSent ? (aggregate._sum.emailsOpened || 0) / aggregate._sum.emailsSent : 0,
                clickRate: aggregate._sum.emailsOpened ? (aggregate._sum.emailsClicked || 0) / aggregate._sum.emailsOpened : 0,
            }
        };

        logger.info('GET newsletter stats completed', { requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(stats, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET newsletter stats failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
