// src/app/api/user/sessions/[id]/route.ts
// =============================================================================
// INDIVIDUAL SESSION MANAGEMENT ROUTES
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}


// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

function getCurrentSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value
  );
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const activeSession = await prisma.activeSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, isValid: true },
    });

    if (!activeSession) {
      return addHeaders(new NextResponse(null, { status: 404 }), requestId);
    }

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Session-Valid': String(activeSession.isValid),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD session failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get session details
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const { id } = await params;
    const userId = session!.user.id;

    const activeSession = await prisma.activeSession.findFirst({
      where: { id, userId },
      select: {
        id: true,
        device: true,
        deviceModel: true,
        browser: true,
        browserVersion: true,
        os: true,
        osVersion: true,
        ipAddress: true,
        country: true,
        countryCode: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        isCurrent: true,
        isValid: true,
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    });

    if (!activeSession) {
      return addHeaders(apiResponse.notFound('Session', requestId), requestId);
    }

    logger.debug('Session details fetched', {
      userId,
      sessionId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(activeSession, {
      meta: { requestId },
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET session failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch session', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Revoke specific session
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const { id } = await params;
    const userId = session!.user.id;

    // Verify session belongs to user
    const activeSession = await prisma.activeSession.findFirst({
      where: { id, userId },
      select: {
        id: true,
        token: true,
        device: true,
        browser: true,
        country: true,
      },
    });

    if (!activeSession) {
      return addHeaders(apiResponse.notFound('Session', requestId), requestId);
    }


    // Check if trying to revoke current session
    const currentSessionToken = getCurrentSessionToken(request);
    if (activeSession.token === currentSessionToken) {
      return addHeaders(
        apiResponse.validationError('Cannot revoke current session. Use logout instead.', undefined, requestId),
        requestId
      );
    }


    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        category: 'auth',
        entityType: 'session',
        entityId: id,
        description: 'Session revoked by user',
        newValue: {
          device: activeSession.device,
          browser: activeSession.browser,
          country: activeSession.country,
        },
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Session revoked', {
      userId,
      sessionId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Session revoked successfully' },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('DELETE session failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to revoke session', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';