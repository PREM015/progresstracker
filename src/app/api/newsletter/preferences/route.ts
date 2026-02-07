import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const querySchema = z.object({
    token: z.string().optional(),
    email: z.string().email().optional(),
}).refine(data => data.email || data.token, {
    message: "Either email or token must be provided",
});

const updateSchema = z.object({
    token: z.string().optional(),
    email: z.string().email().optional(),
    topics: z.array(z.string()).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
}).refine(data => data.email || data.token, {
    message: "Either email or token must be provided",
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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:preferences:get:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const { searchParams } = request.nextUrl;
        const query = {
            token: searchParams.get('token') || undefined,
            email: searchParams.get('email') || undefined,
        };

        const validation = querySchema.safeParse(query);
        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid parameters', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { token, email } = validation.data;
        const where: any = {};
        if (token) where.unsubscribeToken = token;
        else if (email) where.email = email;

        const subscriber = await prisma.newsletterSubscriber.findUnique({
            where,
            select: {
                email: true,
                topics: true,
                frequency: true,
                isActive: true,
            }
        });

        if (!subscriber) {
            return addHeaders(apiResponse.notFound('Subscriber not found', requestId), requestId, rateLimitResult);
        }

        logger.info('GET newsletter preferences completed', { requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(subscriber, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET newsletter preferences failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:preferences:put:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = updateSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { token, email, topics, frequency } = validation.data;
        const where: any = {};
        if (token) where.unsubscribeToken = token;
        else if (email) where.email = email;

        const subscriber = await prisma.newsletterSubscriber.findUnique({ where });

        if (!subscriber) {
            return addHeaders(apiResponse.notFound('Subscriber not found', requestId), requestId, rateLimitResult);
        }

        const updatedSubscriber = await prisma.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: {
                topics: topics ?? subscriber.topics,
                frequency: frequency ?? subscriber.frequency,
                isActive: true, // Re-enable if correcting preferences? Maybe.
            }
        });

        logger.info('PUT newsletter preferences completed', { id: subscriber.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(updatedSubscriber, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('PUT newsletter preferences failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
