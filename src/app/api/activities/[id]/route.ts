
// =============================================================================
// src/app/api/activities/[id]/route.ts
// =============================================================================
// Description: Manage individual activity entries
// Methods: GET, PUT, DELETE, OPTIONS, HEAD
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
import { updateActivitySchema, idSchema } from '@/lib/validations/activity';
import { auditLogService } from '@/services/auditLogService';
import { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface RouteContext {
    params: Promise<{ id: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS, HEAD',
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

async function validateRequest(request: NextRequest, requestId: string, context: RouteContext) {
    const ip = getClientIp(request);
    const rateLimitKey = `activities:${ip}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
        return {
            error: apiResponse.rateLimited(60, requestId),
            session: null,
            id: null,
            rateLimitResult,
        };
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return {
            error: apiResponse.unauthorized('Authentication required', requestId),
            session: null,
            id: null,
            rateLimitResult,
        };
    }

    const { id } = await context.params;
    const idValidation = idSchema.safeParse(id);

    if (!idValidation.success) {
        return {
            error: apiResponse.validationError('Invalid activity ID', idValidation.error.errors, requestId),
            session,
            id: null,
            rateLimitResult,
        };
    }

    return { error: null, session, id, rateLimitResult };
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
// PUT - Update Activity
// =============================================================================

export async function PUT(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, id, rateLimitResult } = await validateRequest(request, requestId, context);
        if (error) return addHeaders(error, requestId, rateLimitResult);

        const userId = session!.user.id;
        const body = await request.json();

        // Validate request body
        const validation = updateActivitySchema.safeParse(body);
        if (!validation.success) {
            const response = apiResponse.validationError(
                'Invalid update data',
                validation.error.errors,
                requestId
            );
            return addHeaders(response, requestId, rateLimitResult);
        }

        const data = validation.data;

        // Check ownership
        const existingActivity = await prisma.trackerEntry.findFirst({
            where: { id: id!, userId },
        });

        if (!existingActivity) {
            const response = apiResponse.notFound('Activity', requestId);
            return addHeaders(response, requestId, rateLimitResult);
        }

        // Build update data
        const updateData: Prisma.TrackerEntryUpdateInput = {
            updatedAt: new Date(),
        };

        if (data.date) updateData.date = new Date(data.date);
        if (data.category) updateData.category = data.category;
        if (data.description !== undefined) updateData.notes = data.description;
        if (data.timeSpent !== undefined) updateData.timeSpent = data.timeSpent;
        if (data.problemsSolved !== undefined) updateData.problemsSolved = data.problemsSolved;
        if (data.linesOfCode !== undefined) updateData.linesOfCode = data.linesOfCode;
        if (data.pagesRead !== undefined) {
            updateData.articlesRead = data.pagesRead;
            updateData.customFields = { ...((existingActivity.customFields as object) || {}), pagesRead: data.pagesRead };
        }
        if (data.tags) updateData.tags = data.tags;
        if (data.mood !== undefined) updateData.mood = data.mood;
        if (data.productivityRating !== undefined) updateData.productivityRating = data.productivityRating;


        // Update activity
        const updatedActivity = await prisma.trackerEntry.update({
            where: { id: id! },
            data: updateData,
        });

        // Create audit log
        await auditLogService.create({
            userId,
            action: 'UPDATE',
            category: 'activity',
            entityType: 'trackerEntry',
            entityId: id!,
            description: `Updated activity: ${existingActivity.category}`,
            oldValue: existingActivity as any,
            newValue: updatedActivity as any,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || undefined,
            requestId,
        });

        const response = apiResponse.success(updatedActivity, { meta: { requestId } });
        return addHeaders(response, requestId, rateLimitResult);
    } catch (error) {
        logger.error('PUT /api/activities/[id] failed', { requestId }, error);
        const response = apiResponse.internalError('Failed to update activity', requestId);
        return addHeaders(response, requestId);
    }
}

// =============================================================================
// DELETE - Delete Activity
// =============================================================================

export async function DELETE(
    request: NextRequest,
    context: RouteContext
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, id, rateLimitResult } = await validateRequest(request, requestId, context);
        if (error) return addHeaders(error, requestId, rateLimitResult);

        const userId = session!.user.id;

        // Check ownership
        const existingActivity = await prisma.trackerEntry.findFirst({
            where: { id: id!, userId },
        });

        if (!existingActivity) {
            const response = apiResponse.notFound('Activity', requestId);
            return addHeaders(response, requestId, rateLimitResult);
        }

        // Soft delete or hard delete? Schema has deletedAt, let's use soft delete.
        const deletedActivity = await prisma.trackerEntry.update({
            where: { id: id! },
            data: { deletedAt: new Date() }
        });

        // Create audit log
        await auditLogService.create({
            userId,
            action: 'DELETE',
            category: 'activity',
            entityType: 'trackerEntry',
            entityId: id!,
            description: `Deleted activity: ${existingActivity.category}`,
            oldValue: existingActivity as any,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || undefined,
            requestId,
        });

        const response = apiResponse.success({ success: true, id }, { meta: { requestId } });
        return addHeaders(response, requestId, rateLimitResult);
    } catch (error) {
        logger.error('DELETE /api/activities/[id] failed', { requestId }, error);
        const response = apiResponse.internalError('Failed to delete activity', requestId);
        return addHeaders(response, requestId);
    }
}
