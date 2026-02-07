import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 5; // Very strict limit
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const resendSchema = z.object({
    email: z.string().email('Invalid email address'),
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
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:resend:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(300, requestId), requestId, rateLimitResult); // 5 min blocking
        }

        const body = await request.json();
        const validation = resendSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { email } = validation.data;

        const subscriber = await prisma.newsletterSubscriber.findUnique({
            where: { email },
        });

        if (!subscriber) {
            // Security: Don't reveal if email exists. Return success.
            logger.info('Resend confirmation for unknown user', { email, requestId });
            return addHeaders(apiResponse.success({ message: 'Confirmation email sent if subscribed' }, { meta: { requestId } }), requestId, rateLimitResult);
        }

        if (subscriber.isActive && subscriber.confirmedAt) {
            // Already confirmed
            // Should we tell them? "Already confirmed". This reveals existence.
            // "Confirmation email sent if subscribed" is safest.
            logger.info('Resend confirmation for already confirmed user', { email, requestId });
            return addHeaders(apiResponse.success({ message: 'Confirmation email sent if subscribed' }, { meta: { requestId } }), requestId, rateLimitResult);
        }

        // Send confirmation email (stub)
        // await emailService.sendConfirmation(subscriber.email, subscriber.unsubscribeToken);

        logger.info('Resend confirmation initiated', { email, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success({ message: 'Confirmation email sent if subscribed' }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('Resend confirmation failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
