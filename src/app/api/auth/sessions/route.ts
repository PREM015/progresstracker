// src/app/api/auth/sessions/route.ts
// List and manage all active sessions

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { SessionService } from '@/services/sessionService';

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
// GET - List All Active Sessions
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

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
    const rateLimitKey = `sessions:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, rateLimitKey);

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

    // Get all active sessions
    const sessions = await prisma.activeSession.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: [
        { isCurrent: 'desc' },
        { lastActiveAt: 'desc' },
      ],
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
        city: true,
        isCurrent: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Format sessions for response
    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      isCurrent: s.token === currentSessionToken || s.isCurrent,
      device: s.device || 'Unknown',
      deviceModel: s.deviceModel,
      browser: s.browser || 'Unknown',
      browserVersion: s.browserVersion,
      os: s.os || 'Unknown',
      osVersion: s.osVersion,
      location: s.city && s.country ? `${s.city}, ${s.country}` : s.country || 'Unknown',
      ipAddress: maskIP(s.ipAddress),
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        sessions: formattedSessions,
        totalSessions: formattedSessions.length,
        currentSessionId: formattedSessions.find((s) => s.isCurrent)?.id,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get sessions error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// DELETE - Revoke All Other Sessions
// =============================================================================

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

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

    // Get current session token
    const currentSessionToken =
      req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    // Revoke all other sessions
    const result = await SessionService.revokeOtherSessions(userId, currentSessionToken || '');

    // Also revoke refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, isValid: true },
      data: { isValid: false, revokedAt: new Date(), revokedReason: 'all_sessions_revoked' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        category: 'auth',
        description: `Revoked ${result.count} other sessions`,
        ipAddress: clientIP,
        userAgent: userAgent?.slice(0, 255),
        status: 'success',
      },
    });

    logger.info('All other sessions revoked', { userId, count: result.count, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: `${result.count} other session(s) have been logged out`,
        revokedCount: result.count,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Revoke all sessions error', { ip: clientIP, requestId }, error);
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