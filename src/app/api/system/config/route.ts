import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 20;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const configSchema = z.object({
    key: z.string().min(1),
    value: z.any(),
    description: z.string().optional(),
    category: z.string().optional(),
    isPublic: z.boolean().optional(),
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
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `system:config:get:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const settings = await prisma.systemSettings.findMany({
            orderBy: { key: 'asc' }
        });

        logger.info('GET system config completed', { userId: session.user.id, count: settings.length, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(settings, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('GET system config failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return addHeaders(apiResponse.forbidden('Access denied', requestId), requestId);
        }

        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `system:config:post:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = configSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { key, value, description, category, isPublic } = validation.data;

        const setting = await prisma.systemSettings.upsert({
            where: { key },
            update: {
                value,
                description,
                category,
                isPublic,
                updatedBy: session.user.id
            },
            create: {
                key,
                value,
                description,
                category,
                isPublic,
                updatedBy: session.user.id
            }
        });

        logger.info('POST system config completed', { userId: session.user.id, key, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(setting, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST system config failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
