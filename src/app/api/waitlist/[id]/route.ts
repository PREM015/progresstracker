// src/app/api/waitlist/[id]/route.ts
// =============================================================================
// INDIVIDUAL WAITLIST ENTRY ROUTES
// Handles: GET, PUT, PATCH, DELETE, OPTIONS, HEAD
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { waitlistService } from '@/services/waitlistService';
import { nanoid } from 'nanoid';

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
    params: Promise<{ id: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateSchema = z.object({
    name: z.string().max(100).optional().nullable(),
    status: z.enum(['waiting', 'invited', 'joined']).optional(),
    position: z.number().int().min(1).optional(),
    source: z.string().max(50).optional().nullable(),
});

const inviteSchema = z.object({
    action: z.literal('invite'),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}

function addSecurityHeaders(response: NextResponse, requestId: string): NextResponse {
    Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    response.headers.set('X-Request-ID', requestId);
    return response;
}

async function validateAdminSession(request: NextRequest, requestId: string) {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
        return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
    }

    if (!session.user.isAdmin && session.user.role !== 'admin') {
        return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
    }

    return { error: null, session, rateLimitResult };
}

async function createAuditLog(
    userId: string,
    action: string,
    description: string,
    request: NextRequest,
    entityId: string,
    metadata?: Record<string, unknown>
) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action: action as any,
                category: 'waitlist',
                entityType: 'waitlist',
                entityId,
                description,
                metadata: metadata as any,
                ipAddress: getClientIp(request),
                userAgent: request.headers.get('user-agent'),
                status: 'success',
            },
        });
    } catch (error) {
        logger.error('Failed to create audit log', { userId, action }, error);
    }
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const requestId = generateRequestId();

    try {
        const { id } = await params;

        const entry = await prisma.waitlist.findUnique({
            where: { id },
            select: { id: true, status: true, updatedAt: true },
        });

        if (!entry) {
            return addSecurityHeaders(new NextResponse(null, { status: 404 }), requestId);
        }

        const response = new NextResponse(null, {
            status: 200,
            headers: {
                'X-Status': entry.status,
                'Last-Modified': entry.updatedAt.toUTCString(),
                'ETag': `"${entry.id}-${entry.updatedAt.getTime()}"`,
            },
        });

        return addSecurityHeaders(response, requestId);
    } catch (error) {
        logger.error('HEAD waitlist/[id] failed', { requestId }, error);
        return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
    }
}

// =============================================================================
// GET - Get single waitlist entry (Admin only)
// =============================================================================

export async function GET(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
        if (error) return addSecurityHeaders(error, requestId);
       


        const { id } = await params;

        const entry = await prisma.waitlist.findUnique({
            where: { id },
        });

        if (!entry) {
            return addSecurityHeaders(apiResponse.notFound('Waitlist entry', requestId), requestId);
        }

        // Get position info
        const aheadCount = entry.position
            ? await prisma.waitlist.count({
                where: {
                    status: 'waiting',
                    position: { lt: entry.position },
                },
            })
            : 0;

        logger.debug('Waitlist entry fetched', {
            id,
            requestId,
            duration: Date.now() - startTime,
        });

        const response = apiResponse.success(
            {
                ...entry,
                aheadCount,
            },
            {
                meta: { requestId },
                headers: {
                    'X-RateLimit-Limit': String(rateLimitResult.limit),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                },
            }
        );

        return addSecurityHeaders(response, requestId);
    } catch (error) {
        logger.error('GET waitlist/[id] failed', { requestId }, error);
        return addSecurityHeaders(
            apiResponse.internalError('Failed to fetch waitlist entry', requestId),
            requestId
        );
    }
}

// =============================================================================
// PUT - Full update of waitlist entry (Admin only)
// =============================================================================

export async function PUT(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
        if (error) return addSecurityHeaders(error, requestId);

        const { id } = await params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return addSecurityHeaders(
                apiResponse.validationError('Invalid JSON body', undefined, requestId),
                requestId
            );
        }

        const validation = updateSchema.safeParse(body);

        if (!validation.success) {
            return addSecurityHeaders(
                apiResponse.validationError('Validation failed', validation.error.errors, requestId),
                requestId
            );
        }

        // Check if exists
        const existing = await prisma.waitlist.findUnique({ where: { id } });

        if (!existing) {
            return addSecurityHeaders(apiResponse.notFound('Waitlist entry', requestId), requestId);
        }

        const data = validation.data;

        // Update entry
        const updated = await prisma.waitlist.update({
            where: { id },
            data: {
                ...data,
                ...(data.status === 'invited' && !existing.invitedAt
                    ? { invitedAt: new Date(), inviteCode: nanoid(16) }
                    : {}),
                ...(data.status === 'joined' && !existing.joinedAt ? { joinedAt: new Date() } : {}),
                updatedAt: new Date(),
            },
        });

        await createAuditLog(
            session!.user.id,
            'UPDATE',
            `Waitlist entry updated: ${existing.email}`,
            request,
            id,
            { changes: data }
        );

        logger.info('Waitlist entry updated', {
            id,
            email: existing.email,
            changes: Object.keys(data),
            requestId,
            duration: Date.now() - startTime,
        });

        const response = apiResponse.success(updated, {
            meta: { requestId },
            message: 'Waitlist entry updated successfully',
            headers: {
                'X-RateLimit-Limit': String(rateLimitResult.limit),
                'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            },
        });

        return addSecurityHeaders(response, requestId);
    } catch (error) {
        logger.error('PUT waitlist/[id] failed', { requestId }, error);
        return addSecurityHeaders(
            apiResponse.internalError('Failed to update waitlist entry', requestId),
            requestId
        );
    }
}

// =============================================================================
// PATCH - Partial update or special actions (Admin only)
// =============================================================================

export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
        if (error) return addSecurityHeaders(error, requestId);

        const { id } = await params;

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return addSecurityHeaders(
                apiResponse.validationError('Invalid JSON body', undefined, requestId),
                requestId
            );
        }

        // Check if exists
        const existing = await prisma.waitlist.findUnique({ where: { id } });

        if (!existing) {
            return addSecurityHeaders(apiResponse.notFound('Waitlist entry', requestId), requestId);
        }

        // Check if this is an action request
        const actionValidation = inviteSchema.safeParse(body);

        if (actionValidation.success) {
            // Handle invite action
            if (existing.status !== 'waiting') {
                return addSecurityHeaders(
                    apiResponse.validationError(`Cannot invite entry with status: ${existing.status}`, undefined, requestId),
                    requestId
                );
            }

            const invited = await waitlistService.invite(existing.email);

            await createAuditLog(
                session!.user.id,
                'UPDATE',
                `Waitlist user invited: ${existing.email}`,
                request,
                id
            );

            // src/app/api/waitlist/[id]/route.ts (continued)
            // =============================================================================

            logger.info('Waitlist user invited', {
                id,
                email: existing.email,
                requestId,
                duration: Date.now() - startTime,
            });

            const response = apiResponse.success(invited, {
                meta: { requestId },
                message: 'User invited successfully',
                headers: {
                    'X-RateLimit-Limit': String(rateLimitResult.limit),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                },
            });

            return addSecurityHeaders(response, requestId);
        }

        // Regular partial update
        const validation = updateSchema.partial().safeParse(body);

        if (!validation.success) {
            return addSecurityHeaders(
                apiResponse.validationError('Validation failed', validation.error.errors, requestId),
                requestId
            );
        }

        const data = validation.data;

        const updated = await prisma.waitlist.update({
            where: { id },
            data: {
                ...data,
                ...(data.status === 'invited' && !existing.invitedAt
                    ? { invitedAt: new Date(), inviteCode: nanoid(16) }
                    : {}),
                ...(data.status === 'joined' && !existing.joinedAt ? { joinedAt: new Date() } : {}),
                updatedAt: new Date(),
            },
        });

        await createAuditLog(
            session!.user.id,
            'UPDATE',
            `Waitlist entry patched: ${existing.email}`,
            request,
            id,
            { changes: data }
        );

        logger.info('Waitlist entry patched', {
            id,
            email: existing.email,
            changes: Object.keys(data),
            requestId,
            duration: Date.now() - startTime,
        });

        const response = apiResponse.success(updated, {
            meta: { requestId },
            headers: {
                'X-RateLimit-Limit': String(rateLimitResult.limit),
                'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            },
        });

        return addSecurityHeaders(response, requestId);
    } catch (error) {
        logger.error('PATCH waitlist/[id] failed', { requestId }, error);
        return addSecurityHeaders(
            apiResponse.internalError('Failed to update waitlist entry', requestId),
            requestId
        );
    }
}

// =============================================================================
// DELETE - Remove waitlist entry (Admin only)
// =============================================================================

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);
        if (error) return addSecurityHeaders(error, requestId);

        const { id } = await params;

        // Check if exists
        const existing = await prisma.waitlist.findUnique({
            where: { id },
            select: { id: true, email: true, status: true },
        });

        if (!existing) {
            return addSecurityHeaders(apiResponse.notFound('Waitlist entry', requestId), requestId);
        }

        // Delete entry
        await prisma.waitlist.delete({ where: { id } });

        await createAuditLog(
            session!.user.id,
            'DELETE',
            `Waitlist entry deleted: ${existing.email}`,
            request,
            id,
            { email: existing.email, status: existing.status }
        );

        logger.info('Waitlist entry deleted', {
            id,
            email: existing.email,
            requestId,
            duration: Date.now() - startTime,
        });

        const response = apiResponse.success(
            {
                message: 'Waitlist entry deleted successfully',
                email: existing.email,
            },
            {
                meta: { requestId },
                headers: {
                    'X-RateLimit-Limit': String(rateLimitResult.limit),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                },
            }
        );

        return addSecurityHeaders(response, requestId);
    } catch (error) {
        logger.error('DELETE waitlist/[id] failed', { requestId }, error);
        return addSecurityHeaders(
            apiResponse.internalError('Failed to delete waitlist entry', requestId),
            requestId
        );
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';