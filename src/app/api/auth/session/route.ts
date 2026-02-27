// src/app/api/auth/session/route.ts
// Get current session information

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { UserService } from '@/services/userService';
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
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

// =============================================================================
// GET - Get Current Session
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `session:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { authenticated: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { authenticated: false, user: null },
        200,
        requestId
      );
    }

    const userId = session.user.id;
    const cacheKey = `session:response:${userId}`;

    // Try to get from cache
    // We only use cache if we are confident the session is still valid (NextAuth handles the JWT/Session check above)
    // But we might want to check against a revocation list or relies on short TTL
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cachedResponse = await import('@/lib/redis').then(m => m.cache.get<any>(cacheKey));
      if (cachedResponse) {
        return secureResponse(
          cachedResponse,
          200,
          requestId
        );
      }
    } catch (error) {
      // Redis failure shouldn't block the request
      logger.warn('Redis cache get failed for session', { userId, error });
    }

    // Get optimzed user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        image: true,
        role: true,
        isAdmin: true,
        isActive: true,
        isBanned: true,
        emailVerified: true,
        currentStreak: true,
        longestStreak: true,
        totalPoints: true,
        // preferredLanguage: true, // Reduced fields
        // timezone: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    if (!user || !user.isActive || user.isBanned) {
      await constantTimeDelay(start);
      return secureResponse(
        { authenticated: false, user: null, reason: user?.isBanned ? 'banned' : 'inactive' },
        200,
        requestId
      );
    }

    // Update last active timestamp (throttled to 5 mins)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // Only update if not recently updated
    if (!user.lastActiveAt || user.lastActiveAt < fiveMinutesAgo) {
      UserService.updateLastActive(user.id).catch(() => {
        // Ignore errors for background update
      });
    }

    // Get active sessions count (optimized & cached)
    const sessionCount = await SessionService.getCachedSessionCount(user.id);

    const responseBody = {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        image: user.image,
        role: user.role,
        isAdmin: user.isAdmin,
        emailVerified: !!user.emailVerified,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalPoints: user.totalPoints,
        // preferredLanguage: user.preferredLanguage,
        // timezone: user.timezone,
        createdAt: user.createdAt,
      },
      sessionCount,
    };

    // Cache response for 2 minutes (short TTL for responsiveness)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await import('@/lib/redis').then(m => m.cache.set(cacheKey, responseBody, 120));
    } catch (error) {
      // Ignore cache set errors
    }

    await constantTimeDelay(start);
    return secureResponse(
      responseBody,
      200,
      requestId
    );

  } catch (error) {
    logger.error('Session check error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { authenticated: false, error: 'Session check failed', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}


// =============================================================================
// DELETE - End Session
// =============================================================================

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Not authenticated', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    // Revoke all sessions
    await SessionService.revokeAllSessions(session.user.id, 'user_session_delete');

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOGOUT',
        category: 'auth',
        description: 'All sessions terminated',
        ipAddress: clientIP,
        userAgent: req.headers.get('user-agent')?.slice(0, 255),
        status: 'success',
      },
    });

    logger.info('All sessions terminated', { userId: session.user.id, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'All sessions terminated' },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Session delete error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Failed to terminate sessions', code: 'INTERNAL_ERROR' },
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