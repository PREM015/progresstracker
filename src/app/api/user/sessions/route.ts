// src/app/api/user/sessions/route.ts
// =============================================================================
// USER SESSIONS MANAGEMENT ROUTES
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// SCHEMAS
// =============================================================================

const cleanupSchema = z.object({
  action: z.literal('cleanup'),
});

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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, HEAD',
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

function getCurrentSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value
  );
}

// =============================================================================
// OPTIONS
// =============================================================================
export async function OPTIONS(request: NextRequest) {
  const requestId = generateRequestId();  logger.info('request is ', { request })
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  logger.info('request is ', { request })
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const count = await prisma.activeSession.count({
      where: {
        userId: session.user.id,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Active-Sessions': String(count),
      },
    });

    return addHeaders(response, requestId);
 // src/app/api/user/sessions/route.ts (continued)
// =============================================================================

  } catch (error) {
    logger.error('HEAD sessions failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get all active sessions
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;
    const currentSessionToken = getCurrentSessionToken(request);

    logger.debug('Fetching user sessions', { userId, requestId });

    // Fetch active sessions
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
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
     
        lastActiveAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });
const currentActiveSession = currentSessionToken
  ? await prisma.activeSession.findFirst({
      where: { token: currentSessionToken },
      select: { id: true },
    })
  : null;

    // Mark current session and remove sensitive data
    const sessionsWithCurrent = activeSessions.map((s) => ({
      id: s.id,
      device: s.device,
      deviceModel: s.deviceModel,
      browser: s.browser,
      browserVersion: s.browserVersion,
      os: s.os,
      osVersion: s.osVersion,
      ipAddress: s.ipAddress ? maskIpAddress(s.ipAddress) : null,
      country: s.country,
      countryCode: s.countryCode,
      city: s.city,
      region: s.region,
    isCurrent: currentActiveSession?.id === s.id,

      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    // Count expired sessions
    const expiredCount = await prisma.activeSession.count({
      where: {
        userId,
        OR: [{ isValid: false }, { expiresAt: { lte: new Date() } }],
      },
    });

    logger.info('Sessions fetched', {
      userId,
      requestId,
      activeCount: sessionsWithCurrent.length,
      expiredCount,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        sessions: sessionsWithCurrent,
        activeCount: sessionsWithCurrent.length,
        expiredCount,
      },
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
    logger.error('GET sessions failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch sessions', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Revoke all other sessions
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;
    const currentSessionToken = getCurrentSessionToken(request);

    logger.info('Revoking all other sessions', { userId, requestId });

    // Get current session ID
   const currentActiveSession = currentSessionToken
  ? await prisma.activeSession.findFirst({
      where: { token: currentSessionToken },
      select: { id: true },
    })
  : null;


    // Revoke all other sessions
    const sessionResult = await prisma.activeSession.updateMany({
      where: {
        userId,
        ...(currentActiveSession ? { id: { not: currentActiveSession.id } } : {}),
      },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked_all',
      },
    });

    // Invalidate refresh tokens
    const tokenResult = await prisma.refreshToken.updateMany({
      where: { userId },
      data: {
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_revoked_all',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        category: 'auth',
        description: `Revoked ${sessionResult.count} session(s) and ${tokenResult.count} refresh token(s)`,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('Sessions revoked', {
      userId,
      requestId,
      sessionsRevoked: sessionResult.count,
      tokensRevoked: tokenResult.count,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        sessionsRevoked: sessionResult.count,
        tokensRevoked: tokenResult.count,
        message: `${sessionResult.count} session(s) revoked successfully`,
      },
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
    logger.error('DELETE sessions failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to revoke sessions', requestId), requestId);
  }
}

// =============================================================================
// POST - Cleanup expired sessions
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = cleanupSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid action. Use { "action": "cleanup" }', undefined, requestId),
        requestId
      );
    }

    logger.info('Cleaning up expired sessions', { userId, requestId });

    // Delete expired and revoked sessions
    const sessionResult = await prisma.activeSession.deleteMany({
      where: {
        userId,
        OR: [{ isValid: false }, { expiresAt: { lte: new Date() } }],
      },
    });

    // Delete expired refresh tokens
    const tokenResult = await prisma.refreshToken.deleteMany({
      where: {
        userId,
        OR: [{ isValid: false }, { expiresAt: { lte: new Date() } }],
      },
    });

    logger.info('Session cleanup complete', {
      userId,
      requestId,
      sessionsDeleted: sessionResult.count,
      tokensDeleted: tokenResult.count,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        sessionsDeleted: sessionResult.count,
        tokensDeleted: tokenResult.count,
        message: `Cleaned up ${sessionResult.count} expired session(s)`,
      },
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
    logger.error('POST sessions cleanup failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to cleanup sessions', requestId), requestId);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function maskIpAddress(ip: string): string {
  if (!ip) return '';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  // IPv6
  if (ip.includes(':')) {
    const ipv6Parts = ip.split(':');
    return `${ipv6Parts.slice(0, 3).join(':')}:***`;
  }
  return ip;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';