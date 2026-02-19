
// =============================================================================
// src/app/api/activities/route.ts
// =============================================================================
// Description: Manage user activities
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: Yes
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { createActivitySchema, queryActivitySchema } from '@/lib/validations/activity';
import { auditLogService } from '@/services/auditLogService';
import { PlatformCategory, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
    response: NextResponse,
    requestId: string,
    rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    response.headers.set('X-Request-ID', requestId);

    if (rateLimitResult) {
        response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    }

    return response;
}

async function validateRequest(request: NextRequest, requestId: string) {
    const ip = getClientIp(request);
    const rateLimitKey = `activities:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
        return {
            error: apiResponse.rateLimited(60, requestId),
            session: null,
            rateLimitResult,
        };
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return {
            error: apiResponse.unauthorized('Authentication required', requestId),
            session: null,
            rateLimitResult,
        };
    }

    return { error: null, session, rateLimitResult };
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
    const requestId = generateRequestId();
    const response = new NextResponse(null, { status: 204 });
    return addHeaders(response, requestId);
}

// =============================================================================
// GET - List Activities
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, rateLimitResult } = await validateRequest(request, requestId);
        if (error) return addHeaders(error, requestId, rateLimitResult);

        const userId = session!.user.id;
        const { searchParams } = new URL(request.url);
        const query = Object.fromEntries(searchParams.entries());

        // Validate query params
        const validation = queryActivitySchema.safeParse(query);
        if (!validation.success) {
            const response = apiResponse.validationError('Invalid query parameters', validation.error.errors, requestId);
            return addHeaders(response, requestId, rateLimitResult);
        }

        const { page, limit, category, startDate, endDate, search, sortBy, sortOrder } = validation.data;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.TrackerEntryWhereInput = {
            userId,
            deletedAt: null,
        };

        if (category) where.category = category as PlatformCategory;

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        if (search) {
            where.OR = [
                { notes: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } }, // Approximate search for tags
            ];
        }

        // Execute query
        const [activities, total] = await Promise.all([
            prisma.trackerEntry.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
                include: {
                    platform: { select: { name: true, slug: true, icon: true } },
                    customPlatform: { select: { name: true, icon: true } }
                }
            }),
            prisma.trackerEntry.count({ where }),
        ]);

        const response = apiResponse.success(
            activities,
            {
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    requestId
                }
            }
        );

        return addHeaders(response, requestId, rateLimitResult);
    } catch (error) {
        logger.error('GET /api/activities failed', { requestId }, error);
        const response = apiResponse.internalError('Failed to fetch activities', requestId);
        return addHeaders(response, requestId);
    }
}

// =============================================================================
// POST - Create Activity
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, rateLimitResult } = await validateRequest(request, requestId);
        if (error) return addHeaders(error, requestId, rateLimitResult);

        const userId = session!.user.id;
        const body = await request.json();

        // Validate request body
        const validation = createActivitySchema.safeParse(body);
        if (!validation.success) {
            const response = apiResponse.validationError('Invalid activity data', validation.error.errors, requestId);
            return addHeaders(response, requestId, rateLimitResult);
        }

        const data = validation.data;

        // Create activity
        const activity = await prisma.trackerEntry.create({
            data: {
                userId,
                date: new Date(data.date),
                category: data.category,
                notes: data.description,
                timeSpent: data.timeSpent,
                source: 'manual',
                platformId: data.platformId,
                customPlatformId: data.customPlatformId,

                // Map specific metrics
                problemsSolved: data.problemsSolved || 0,
                linesOfCode: data.linesOfCode || 0,
                articlesRead: data.pagesRead || 0, // Mapping pagesRead to articlesRead for now as closest match, or could use customFields

                tags: data.tags || [],
                mood: data.mood,
                productivityRating: data.productivityRating,

                customFields: data.pagesRead ? { pagesRead: data.pagesRead } : Prisma.JsonNull,
            },
        });

        // Create audit log
        await auditLogService.create({
            userId,
            action: 'CREATE',
            category: 'activity',
            entityType: 'trackerEntry',
            entityId: activity.id,
            description: `Created manual activity: ${data.category}`,
            newValue: activity as any,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || undefined,
            requestId,
        });

        const response = apiResponse.success(activity, { meta: { requestId } });
        return addHeaders(response, requestId, rateLimitResult);
    } catch (error) {
        logger.error('POST /api/activities failed', { requestId }, error);
        const response = apiResponse.internalError('Failed to create activity', requestId);
        return addHeaders(response, requestId);
    }
}
