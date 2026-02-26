// src/app/api/auth/sessions/[id]/route.ts
// Manage a specific session

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 150;

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

async function constantTimeDelay(start: number): Promise<void> {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

function secureResponse(body: object, status: number, requestId: string): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set('X-Request-ID', requestId);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

function maskIP(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip.slice(0, 10) + '...';
}

// =============================================================================
// GET - Get Session Details
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const { id: sessionId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Find session
    const activeSession = await prisma.activeSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
        token: true,
        userAgent: true,
        ipAddress: true,
        device: true,
        deviceModel: true,
        browser: true,
        browserVersion: true,
        os: true,
        osVersion: true,
        country: true,
        countryCode: true,
        city: true,
        region: true,
        isValid: true,
        isCurrent: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    });

    if (!activeSession) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Session not found', code: 'NOT_FOUND' },
        404,
        requestId
      );
    }

    // Get current session token
    const currentSessionToken =
      req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        session: {
          id: activeSession.id,
          isCurrent: activeSession.token === currentSessionToken || activeSession.isCurrent,
          isValid: activeSession.isValid,
          device: activeSession.device || 'Unknown',
          deviceModel: activeSession.deviceModel,
          browser: activeSession.browser || 'Unknown',
          browserVersion: activeSession.browserVersion,
          os: activeSession.os || 'Unknown',
          osVersion: activeSession.osVersion,
          location: {
            city: activeSession.city,
            region: activeSession.region,
            country: activeSession.country,
            countryCode: activeSession.countryCode,
          },
          ipAddress: maskIP(activeSession.ipAddress),
          lastActiveAt: activeSession.lastActiveAt,
          expiresAt: activeSession.expiresAt,
          createdAt: activeSession.createdAt,
          revokedAt: activeSession.revokedAt,
          revokedReason: activeSession.revokedReason,
        },
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get session error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// DELETE - Revoke Specific Session
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');
  const { id: sessionId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `revoke-session:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Get current session token
    const currentSessionToken =
      req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    // Find session
    const activeSession = await prisma.activeSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
        token: true,
        isCurrent: true,
        isValid: true,
      },
    });

    if (!activeSession) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Session not found', code: 'NOT_FOUND' },
        404,
        requestId
      );
    }

    // Check if trying to revoke current session
    if (activeSession.token === currentSessionToken || activeSession.isCurrent) {
      return secureResponse(
        { success: false, error: 'Cannot revoke current session. Use logout instead.', code: 'CANNOT_REVOKE_CURRENT' },
        400,
        requestId
      );
    }

    // Check if already revoked
    if (!activeSession.isValid) {
      return secureResponse(
        { success: false, error: 'Session already revoked', code: 'ALREADY_REVOKED' },
        400,
        requestId
      );
    }

    // Revoke session
    await prisma.$transaction(async (tx) => {
      await tx.activeSession.update({
        where: { id: sessionId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'user_revoked',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          category: 'auth',
          entityType: 'session',
          entityId: sessionId,
          description: 'Session revoked by user',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    logger.info('Session revoked', { userId, sessionId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'Session has been logged out' },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Revoke session error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// OTHER METHODS
// =============================================================================

export async function POST(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PUT(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';