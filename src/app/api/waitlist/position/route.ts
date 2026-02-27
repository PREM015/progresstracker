// src/app/api/waitlist/position/route.ts
// =============================================================================
// WAITLIST POSITION CHECK ROUTES - Public endpoint to check position
// Handles: GET, POST, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
    'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const checkPositionSchema = z.object({
    email: z.string().email('Invalid email address').transform((val) => val.toLowerCase().trim()),
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

function generateUnsubscribeToken(email: string): string {
    const data = `${email}-${process.env.NEXTAUTH_SECRET || 'secret'}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
    const requestId = generateRequestId();
    return addSecurityHeaders(new NextResponse(null, { status: 204, headers: CORS_HEADERS }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

        if (!rateLimitResult.success) {
            return addSecurityHeaders(new NextResponse(null, { status: 429 }), requestId);
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return addSecurityHeaders(new NextResponse(null, { status: 400 }), requestId);
        }

        const entry = await prisma.waitlist.findUnique({
            where: { email: email.toLowerCase() },
            select: { position: true, status: true },
        });

        if (!entry) {
            return addSecurityHeaders(new NextResponse(null, { status: 404 }), requestId);
        }

        const response = new NextResponse(null, {
            status: 200,
            headers: {
                'X-Position': String(entry.position || 0),
                'X-Status': entry.status,
            },
        });

        return addSecurityHeaders(response, requestId);
    } catch (error) {
        logger.error('HEAD waitlist/position failed', { requestId }, error);
        return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
    }
}

// =============================================================================
// GET - Check position by email (query param)
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

        if (!rateLimitResult.success) {
            logger.warn('Rate limit exceeded for position check', { ip, requestId });
            return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return addSecurityHeaders(
                apiResponse.validationError('Email query parameter is required', undefined, requestId),
                requestId
            );
        }

        const validation = checkPositionSchema.safeParse({ email });

        if (!validation.success) {
            return addSecurityHeaders(
                apiResponse.validationError('Invalid email format', validation.error.errors, requestId),
                requestId
            );
        }

        const entry = await prisma.waitlist.findUnique({
            where: { email: validation.data.email },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                position: true,
                inviteCode: true,
                createdAt: true,
                invitedAt: true,
                joinedAt: true,
            },
        });

        if (!entry) {
            return addSecurityHeaders(
                apiResponse.success(
                    {
                        found: false,
                        message: 'Email not found on waitlist',
                    },
                    { meta: { requestId } }
                ),
                requestId
            );
        }

        // Calculate stats
        const [totalWaiting, aheadCount] = await Promise.all([
            prisma.waitlist.count({ where: { status: 'waiting' } }),
            entry.position
                ? prisma.waitlist.count({
                    where: {
                        status: 'waiting',
                        position: { lt: entry.position },
                    },
                })
                : 0,
        ]);

        // Calculate days waiting
        const daysWaiting = Math.floor(
            (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Generate unsubscribe token
        const unsubscribeToken = generateUnsubscribeToken(entry.email);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        logger.debug('Position checked', {
            email: validation.data.email,
            position: entry.position,
            requestId,
            duration: Date.now() - startTime,
        });

        const response = apiResponse.success(
            {
                found: true,
                email: entry.email,
                name: entry.name,
                status: entry.status,
                position: entry.position,
                aheadCount,
                totalWaiting,
                percentile: totalWaiting > 0 ? Math.round(((totalWaiting - aheadCount) / totalWaiting) * 100) : 100,
                daysWaiting,
                joinedAt: entry.createdAt,
                invitedAt: entry.invitedAt,
                completedAt: entry.joinedAt,
                referralLink: entry.inviteCode
                    ? `${baseUrl}?ref=${entry.inviteCode}`
                    : null,
                unsubscribeLink: `${baseUrl}/api/waitlist/unsubscribe?email=${encodeURIComponent(entry.email)}&token=${unsubscribeToken}`,
                statusMessage: getStatusMessage(entry.status, aheadCount),
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
        logger.error('GET waitlist/position failed', { requestId }, error);
        return addSecurityHeaders(
            apiResponse.internalError('Failed to check position', requestId),
            requestId
        );
    }
}

// =============================================================================
// POST - Check position by email (body)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
        const ip = getClientIp(request);
        const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

        if (!rateLimitResult.success) {
            logger.warn('Rate limit exceeded for position check', { ip, requestId });
            return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return addSecurityHeaders(
                apiResponse.validationError('Invalid JSON body', undefined, requestId),
                requestId
            );
        }

        const validation = checkPositionSchema.safeParse(body);

        if (!validation.success) {
            return addSecurityHeaders(
                apiResponse.validationError('Validation failed', validation.error.errors, requestId),
                requestId
            );
        }

        const entry = await prisma.waitlist.findUnique({
            where: { email: validation.data.email },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                position: true,
                inviteCode: true,
                createdAt: true,
                invitedAt: true,
                joinedAt: true,
            },
        });

        if (!entry) {
            return addSecurityHeaders(
                apiResponse.success(
                    {
                        found: false,
                        message: 'Email not found on waitlist',
                        joinLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/waitlist`,
                    },
                    { meta: { requestId } }
                ),
                requestId
            );
        }

        // Calculate position info
        const aheadCount = entry.position
            ? await prisma.waitlist.count({
                where: {
                    status: 'waiting',
                    position: { lt: entry.position },
                },
            })
            : 0;

        const daysWaiting = Math.floor(
            (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        logger.debug('Position checked via POST', {
            email: validation.data.email,
            position: entry.position,
            requestId,
            duration: Date.now() - startTime,
        });

        const response = apiResponse.success(
            {
                found: true,
                status: entry.status,
                position: entry.position,
                aheadCount,
                daysWaiting,
                statusMessage: getStatusMessage(entry.status, aheadCount),
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
        logger.error('POST waitlist/position failed', { requestId }, error);
        return addSecurityHeaders(
            apiResponse.internalError('Failed to check position', requestId),
            requestId
        );
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStatusMessage(status: string, aheadCount: number): string {
    switch (status) {
        case 'waiting':
            if (aheadCount === 0) {
                return "You're next in line! We'll send your invite soon.";
            } else if (aheadCount < 10) {
                return `Almost there! Only ${aheadCount} people ahead of you.`;
            } else if (aheadCount < 50) {
                return `You're getting closer! ${aheadCount} people ahead of you.`;
            } else {
                return `Thanks for your patience! ${aheadCount} people ahead of you.`;
            }
        case 'invited':
            return "You've been invited! Check your email to get started.";
        case 'joined':
            return 'Welcome aboard! You have full access now.';
        default:
            return 'Thanks for joining our waitlist!';
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';