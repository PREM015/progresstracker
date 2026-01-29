import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rateLimit';
import { signJwt } from '@/lib/jwt';

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 2048;
const REFRESH_TOKEN_EXPIRY_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

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

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse({ error: 'Content-Type must be application/json' }, 415);
    }

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) return secureResponse({ error: 'Payload too large' }, 413);

    let body: { refreshToken?: string };
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse({ error: 'Invalid JSON' }, 400);
    }

    const { refreshToken } = body;
    if (!refreshToken) return secureResponse({ error: 'Refresh token required' }, 400);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = `refresh-token:${ip}`;

    // Rate limiting to prevent brute force
    const allowed = await rateLimit(key, 10, 60 * 1000, { interval: 60 * 1000, uniqueTokenPerInterval: 500 });
    if (!allowed) return secureResponse({ error: 'Too many requests. Try later.' }, 429);

    const hashedToken = hashToken(refreshToken);

    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: hashedToken,
        isValid: true,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord || !tokenRecord.user) {
      await constantTimeDelay(start);
      return secureResponse({ error: 'Invalid refresh token' }, 401);
    }

    const user = tokenRecord.user;

    // Rotate token: invalidate old, create new
    const newToken = crypto.randomBytes(48).toString('hex');
    const newHashedToken = hashToken(newToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'Rotated' },
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
    const accessToken = signJwt({ userId: user.id, role: user.role });

    // Optionally log the refresh in audit logs
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        metadata: { ip, device: tokenRecord.deviceId || 'unknown' },
      },
    });

    await constantTimeDelay(start);
    return secureResponse({
      message: 'Token refreshed',
      accessToken,
      refreshToken: newToken,
      expiresAt,
    }, 200);

  } catch (error) {
    logger.error('Refresh token error', { error });
    await constantTimeDelay(start);
    return secureResponse({ error: 'Something went wrong' }, 500);
  }
}

// Block other methods
export async function GET() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }
