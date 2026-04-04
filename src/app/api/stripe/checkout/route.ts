import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createCustomer, createCheckoutSession, getPlanByPriceId } from '@/lib/stripe';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 10;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const checkoutSchema = z.object({
    priceId: z.string(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    idempotencyKey: z.string().max(100).optional(),
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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `stripe:checkout:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = checkoutSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { priceId, successUrl, cancelUrl, idempotencyKey } = validation.data;

        // Validate priceId belongs to a valid plan
        const plan = getPlanByPriceId(priceId);
        if (!plan) {
            return addHeaders(apiResponse.validationError('Invalid price ID', [], requestId), requestId, rateLimitResult);
        }

        // Get or create customer
        let subscription = await prisma.subscription.findUnique({
            where: { userId: session.user.id }
        });

        let customerId = subscription?.stripeCustomerId;

        if (!customerId) {
            const customer = await createCustomer(session.user.email!, session.user.name || undefined, {
                userId: session.user.id,
            });
            customerId = customer.id;

            // Update subscription record with customer ID if it exists, or create it
            if (subscription) {
                await prisma.subscription.update({
                    where: { userId: session.user.id },
                    data: { stripeCustomerId: customerId }
                });
            } else {
                await prisma.subscription.create({
                    data: {
                        userId: session.user.id,
                        stripeCustomerId: customerId,
                        status: 'INCOMPLETE', // Placeholder until webhook confirms
                    }
                });
            }
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const sUrl = successUrl || `${domain}/billing?success=true`;
        const cUrl = cancelUrl || `${domain}/billing?canceled=true`;

        const checkoutSession = await createCheckoutSession({
            customerId,
            priceId,
            successUrl: sUrl,
            cancelUrl: cUrl,
            metadata: {
                userId: session.user.id,
            },
            idempotencyKey
        });

        logger.info('POST stripe checkout completed', { userId: session.user.id, sessionId: checkoutSession.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success({ url: checkoutSession.url }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST stripe checkout failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
