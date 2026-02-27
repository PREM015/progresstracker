import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe'; // Need to add pauseSubscription logic or raw call
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 5;
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

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:pause:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const subscription = await prisma.subscription.findUnique({
            where: { userId: session.user.id }
        });

        if (!subscription?.stripeSubscriptionId) {
            return addHeaders(apiResponse.notFound('No active subscription found', requestId), requestId, rateLimitResult);
        }

        if (subscription.status === 'PAUSED') {
            return addHeaders(apiResponse.success({ message: 'Already paused' }, { meta: { requestId } }), requestId, rateLimitResult);
        }

        // Pause subscription (void invoice)
        // Note: Stripe pausing logic can be complex (mark uncollectible vs void).
        // Using simple pause collection behavior.

        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            pause_collection: {
                behavior: 'void',
            },
        });

        await prisma.subscription.update({
            where: { userId: session.user.id },
            data: {
                status: 'PAUSED',
                pausedAt: new Date(),
            }
        });

        logger.info('POST stripe pause completed', { userId: session.user.id, subscriptionId: subscription.stripeSubscriptionId, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success({ success: true }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST stripe pause failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
