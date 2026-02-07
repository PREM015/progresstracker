import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 10;
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

const maintenanceSchema = z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    isActive: z.boolean().default(true),
    affectedServices: z.array(z.string()).default([]),
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
        // Public endpoint to check maintenance status
        const maintenance = await prisma.maintenanceWindow.findFirst({
            where: {
                isActive: true,
                // Check if current time is within window or upcoming
                endTime: { gt: new Date() }
            },
            orderBy: { startTime: 'asc' }
        });

        logger.info('GET system maintenance completed', { requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(maintenance || { isActive: false }, { meta: { requestId } }), requestId);

    } catch (error) {
        logger.error('GET system maintenance failed', { requestId }, error);
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
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `system:maintenance:post:${session.user.id}`);

        if (!rateLimitResult.success) {
            return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
        }

        const body = await request.json();
        const validation = maintenanceSchema.safeParse(body);

        if (!validation.success) {
            return addHeaders(apiResponse.validationError('Invalid input', validation.error.errors, requestId), requestId, rateLimitResult);
        }

        const { title, message, startTime: start, endTime: end, isActive, affectedServices } = validation.data;

        // Create or update? Let's just create new usually, or we can look for ongoing. 
        // We'll just create new maintenance window.

        const window = await prisma.maintenanceWindow.create({
            data: {
                title,
                message,
                startTime: new Date(start),
                endTime: new Date(end),
                isActive,
                affectedServices,
                createdBy: session.user.id
            }
        });

        logger.info('POST system maintenance completed', { userId: session.user.id, windowId: window.id, requestId, duration: Date.now() - startTime });

        return addHeaders(apiResponse.success(window, { meta: { requestId } }), requestId, rateLimitResult);

    } catch (error) {
        logger.error('POST system maintenance failed', { requestId }, error);
        return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
