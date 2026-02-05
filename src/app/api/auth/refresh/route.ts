// src/app/api/auth/refresh/route.ts
// Refresh access token using refresh token

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { signJwt } from '@/lib/jwt';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 2048;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// =============================================================================
// SCHEMAS
// =============================================================================

const RefreshSchema = z.object({
  refreshToken: z.string().min(64).max(128),
});

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

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

// =============================================================================
// POST - Refresh Token
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `refresh:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Content-Type validation
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse(
        { success: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' },
        415,
        requestId
      );
    }

    // Parse body
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return secureResponse(
        { success: false, error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' },
        413,
        requestId
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse(
        { success: false, error: 'Invalid JSON', code: 'INVALID_JSON' },
        400,
        requestId
      );
    }

    const parsed = RefreshSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Refresh token is required', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { refreshToken } = parsed.data;
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
            deletedAt: true,
          },
        },
      },
    });

    if (!tokenRecord || !tokenRecord.user) {
      logger.warn('Invalid refresh token attempt', { ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid refresh token', code: 'INVALID_TOKEN' },
        401,
        requestId
      );
    }

    // Check user status
    if (!tokenRecord.user.isActive || tokenRecord.user.isBanned || tokenRecord.user.deletedAt) {
      // Revoke token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'user_inactive',
        },
      });

      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Account is not active', code: 'ACCOUNT_INACTIVE' },
        401,
        requestId
      );
    }

    const user = tokenRecord.user;

    // Token rotation: invalidate old, create new
    const newToken = crypto.randomBytes(48).toString('hex');
    const newHashedToken = hashToken(newToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

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

    // Generate new access token
    const accessToken = signJwt({
      userId: user.id,
      email: user.email ?? undefined,
      role: user.role,
    });

    logger.info('Token refreshed', {
      userId: user.id,
      deviceId: tokenRecord.deviceId,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        accessToken,
        refreshToken: newToken,
        expiresAt: expiresAt.toISOString(),
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Refresh token error', { ip: clientIP, requestId }, error);
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

export async function GET(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PUT(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function DELETE(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';