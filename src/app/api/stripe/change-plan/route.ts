import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { stripe, getPlanByPriceId } from '@/lib/stripe';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 5;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const changePlanSchema = z.object({
    priceId: z.string(),
    coupon: z.string().optional(),
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

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:change-plan:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = changePlanSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { priceId, coupon } = validation.data;

        // Validate price
        const newPlan = getPlanByPriceId(priceId);
        if (!newPlan) {
            return addHeaders(apiResponse.validationError('Invalid price ID', [], requestId), requestId, rateLimitResult);
        }

        const subscription = await prisma.subscription.findUnique({
            where: { userId: session.user.id }
        });

        if (!subscription?.stripeSubscriptionId) {
            return addHeaders(apiResponse.notFound('No active subscription found to change. Please subscribe first.', requestId), requestId, rateLimitResult);
        }

        // Retrieve current subscription to get item ID
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const itemId = stripeSub.items.data[0].id;

        // Update subscription
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [{
                id: itemId,
                price: priceId,
            }],
            discounts: coupon ? [{ coupon }] : undefined,
            proration_behavior: 'always_invoice',
        });

        // Update local DB
        // Webhook will usually handle this, but we can do optimistic update or partial update
        await prisma.subscription.update({
            where: { userId: session.user.id },
            data: {
                stripePriceId: priceId,
                tier: newPlan.tier,
                // Update limits based on new plan
                platformLimit: newPlan.limits.platformLimit,
                syncFrequencyMinutes: newPlan.limits.syncFrequencyMinutes,
                exportLimitMonthly: newPlan.limits.exportLimitMonthly,
                apiRequestsDaily: newPlan.limits.apiRequestsDaily,
                features: newPlan.features,
            }
        });

        logger.info('POST stripe change plan completed', { userId: session.user.id, newPriceId: priceId, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success({ success: true, plan: newPlan }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST stripe change plan failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
