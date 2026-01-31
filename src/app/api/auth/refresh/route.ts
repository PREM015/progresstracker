// src/app/api/auth/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { signJwt } from '@/lib/jwt';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 2048;
const REFRESH_TOKEN_EXPIRY_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// =============================================================================
// HELPERS
// =============================================================================

async function constantTimeDelay(start: number) {
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

function secureResponse(body: object, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  const start = Date.now();
  const clientIP = getClientIP(req);

  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse({ error: 'Content-Type must be application/json' }, 415);
    }

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return secureResponse({ error: 'Payload too large' }, 413);
    }

    let body: { refreshToken?: string };
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse({ error: 'Invalid JSON' }, 400);
    }

    const { refreshToken } = body;
    if (!refreshToken) {
      return secureResponse({ error: 'Refresh token required' }, 400);
    }

    const hashedToken = hashToken(refreshToken);

    // Find valid token
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: hashedToken,
        isValid: true,
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            isBanned: true,
          },
        },
      },
    });

    if (!tokenRecord || !tokenRecord.user) {
      logger.warn('Invalid refresh token attempt', { ip: clientIP });
      await constantTimeDelay(start);
      return secureResponse({ error: 'Invalid refresh token' }, 401);
    }

    // Check user status
    if (!tokenRecord.user.isActive || tokenRecord.user.isBanned) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'user_inactive',
        },
      });
      await constantTimeDelay(start);
      return secureResponse({ error: 'Account is not active' }, 401);
    }

    const user = tokenRecord.user;

    // Rotate token: invalidate old, create new
    const newToken = crypto.randomBytes(48).toString('hex');
    const newHashedToken = hashToken(newToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'rotated',
          replacedByToken: newHashedToken,
        },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newHashedToken,
          family: tokenRecord.family,
          deviceId: tokenRecord.deviceId,
          expiresAt,
          isValid: true,
        },
      }),
    ]);

    // Create new JWT access token
    const accessToken = signJwt({
      userId: user.id,
   email: user.email ?? undefined,

      role: user.role,
    });

 
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        category: 'auth',
        entityType: 'refresh_token',
        entityId: tokenRecord.id,
        description: 'Token refreshed',
        ipAddress: clientIP,
        userAgent: req.headers.get('user-agent')?.slice(0, 255),
        status: 'success',
        // ✅ Use newValue for additional data
        newValue: {
          deviceId: tokenRecord.deviceId || 'unknown',
          family: tokenRecord.family,
        },
      },
    });

    logger.info('Token refreshed', {
      userId: user.id,
      deviceId: tokenRecord.deviceId,
    });

    await constantTimeDelay(start);
    return secureResponse({
      success: true,
      accessToken,
      refreshToken: newToken,
      expiresAt: expiresAt.toISOString(),
    }, 200);

  } catch (error) {
    logger.error('Refresh token error', { ip: clientIP }, error);
    await constantTimeDelay(start);
    return secureResponse({ error: 'Something went wrong' }, 500);
  }
}

export async function GET() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }