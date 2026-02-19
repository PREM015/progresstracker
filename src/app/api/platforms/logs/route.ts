
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError } from '@/lib/apiError';
import { SyncStatus } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
    GET: 60, // 60 requests per minute
} as const;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const LogsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    status: z.nativeEnum(SyncStatus).optional(),
    hasError: z.coerce.boolean().optional(),
    platformId: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function addHeaders(
    response: NextResponse,
    requestId: string,
    options?: {
        rateLimitResult?: { limit: number; remaining: number };
    }
): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    response.headers.set('X-Request-ID', requestId);

    if (options?.rateLimitResult) {
        response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
        response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
    }

    return response;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
    const requestId = generateRequestId();
    return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            throw new UnauthorizedError('Authentication required');
        }

        const userId = session.user.id;

        // Rate limiting
        const rateLimitKey = `platforms:logs:get:${userId}`;
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

        if (!rateLimitResult.success) {
            return addHeaders(
                apiResponse.rateLimited(60, requestId),
                requestId,
                { rateLimitResult }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const queryValidation = LogsQuerySchema.safeParse({
            limit: searchParams.get('limit') || undefined,
            offset: searchParams.get('offset') || undefined,
            status: searchParams.get('status') || undefined,
            hasError: searchParams.get('hasError') || undefined,
            platformId: searchParams.get('platformId') || undefined,
        });

        if (!queryValidation.success) {
            return addHeaders(
                apiResponse.validationError(
                    'Invalid query parameters',
                    queryValidation.error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                    requestId
                ),
                requestId,
                { rateLimitResult }
            );
        }

        const query = queryValidation.data;

        // Build filter
        const where: any = {
            userId,
        };

        if (query.status) {
            where.status = query.status;
        }

        if (query.hasError !== undefined) {
            where.hasError = query.hasError;
        }

        if (query.platformId) {
            where.platformId = query.platformId;
        }

        // Fetch logs
        const [logs, total] = await Promise.all([
            prisma.syncLog.findMany({
                where,
                take: query.limit,
                skip: query.offset,
                orderBy: { createdAt: 'desc' },
                include: {
                    platform: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            }),
            prisma.syncLog.count({ where }),
        ]);

        logger.info('Sync logs fetched', {
            requestId,
            userId,
            count: logs.length,
            duration: Date.now() - startTime,
        });

        return addHeaders(
            apiResponse.success(
                {
                    logs,
                    pagination: {
                        total,
                        limit: query.limit,
                        offset: query.offset,
                    },
                },
                {
                    meta: {
                        requestId,
                        duration: Date.now() - startTime,
                    },
                }
            ),
            requestId,
            { rateLimitResult }
        );
    } catch (error) {
        logger.error('GET /api/platforms/logs failed', { requestId }, error);
        return addHeaders(apiResponse.error(error, requestId), requestId);
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
