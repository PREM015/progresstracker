import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:confirm:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const { token } = await params;

        const subscriber = await prisma.newsletterSubscriber.findUnique({
            where: { unsubscribeToken: token }, // Using unsubscribeToken as confirmation token for simplicity, or add specific field?
            // Schema has 'unsubscribeToken' but not explicit 'confirmationToken'.
            // Usually confirmation token is separate. 
            // Reuse unsubscribeToken for identification? Or scan by email? No, token is safer.
            // If we reuse unsubscribeToken, anyone with unsubscribe link can confirm?
            // Yes, but confirmation implies ownership of email link anyway.
            // Ideally schema should have confirmationToken.
            // BUT schema has 'unsubscribeToken' @unique @default(cuid()).
            // Let's assume for this MVP we use unsubscribeToken as the unique identifier for the user in this context.
        });

        if (!subscriber) {
            return addHeaders(apiResponse.notFound('Invalid token', requestId), requestId, rateLimitResult);
        }

        if (subscriber.confirmedAt) {
            return addHeaders(apiResponse.success({ message: 'Already confirmed' }, { meta: { requestId } }), requestId, rateLimitResult);
        }

        await prisma.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: {
                confirmedAt: new Date(),
                isActive: true,
            }
        });

        logger.info('Newsletter subscriber confirmed', { id: subscriber.id, requestId, duration: Date.now() - startTime });

        // Check for redirect param
        const { searchParams } = request.nextUrl;
        const redirectUrl = searchParams.get('redirect');
        if (redirectUrl && redirectUrl.startsWith('/')) {
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }

        return addHeaders(apiResponse.success({ message: 'Subscription confirmed' }, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('Newsletter confirm failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
