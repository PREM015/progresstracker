import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

// Hardcoded for now, could move to DB or Config
const AVAILABLE_TOPICS = [
    { id: 'product_updates', name: 'Product Updates', description: 'New features and improvements' },
    { id: 'weekly_digest', name: 'Weekly Digest', description: 'Summary of your activity and community highlights' },
    { id: 'marketing', name: 'Promotions', description: 'Special offers and partner deals' },
    { id: 'tips', name: 'Tips & Tricks', description: 'How to get the most out of Progress Tracker' },
];

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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `newsletter:topics:${ip}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        logger.info('GET newsletter topics completed', { requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(AVAILABLE_TOPICS, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET newsletter topics failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
