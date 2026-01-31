// src/app/api/auth/resend-verification/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// SCHEMA
// =============================================================================

const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
});

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_PAYLOAD_SIZE = 2048;
const TOKEN_EXPIRY_MS = 1000 * 60 * 60; // 1 hour
const CONSTANT_TIME_MS = 250;
const COOLDOWN_MS = 1000 * 60 * 2; // 2 minutes between requests

// =============================================================================
// HELPERS
// =============================================================================

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return secureResponse({ error: 'Invalid JSON' }, 400);
    }

    const parsed = ResendVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse({ error: 'Invalid request payload' }, 400);
    }

    const { email } = parsed.data;

    logger.debug('Resend verification requested', { email, ip: clientIP });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isActive: true,
        isBanned: true,
        deletedAt: true,
      },
    });

    // Prevent enumeration - always return success
    if (!user || user.emailVerified || !user.isActive || user.isBanned || user.deletedAt) {
      await constantTimeDelay(start);
      return secureResponse({
        success: true,
        message: 'If an account exists and is unverified, a verification email was sent.',
      }, 200);
    }

    // Check cooldown - find recent verification request
    const recentVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        type: 'verification',
        createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
      },
      select: { createdAt: true },
    });

    if (recentVerification) {
      logger.info('Resend verification cooldown active', {
        userId: user.id,
        lastRequest: recentVerification.createdAt,
      });
      await constantTimeDelay(start);
      return secureResponse({
        success: true,
        message: 'If an account exists and is unverified, a verification email was sent.',
      }, 200);
    }

    // Generate new token
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Invalidate old tokens and create new one
    await prisma.$transaction([
      prisma.emailVerification.updateMany({
        where: {
          userId: user.id,
          type: 'verification',
          verifiedAt: null,
        },
        data: {
          // Mark as expired by setting past date
          expiresAt: new Date(0),
        },
      }),
      prisma.emailVerification.create({
        data: {
          userId: user.id,
          email: user.email!,
          token: tokenHash,
          expiresAt,
          type: 'verification',
        },
      }),
    ]);

    // TODO: Send verification email
    // const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}`;
    // await sendVerificationEmail({ to: user.email, verificationUrl });

    // For development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Verification token generated (DEV ONLY)', {
        rawToken,
        userId: user.id,
      });
    }

    logger.info('Verification email resent', {
      userId: user.id,
      email: user.email,
      ip: clientIP,
    });

    await constantTimeDelay(start);
    return secureResponse({
      success: true,
      message: 'If an account exists and is unverified, a verification email was sent.',
    }, 200);

  } catch (error) {
    logger.error('Resend verification error', { ip: clientIP }, error);
    await constantTimeDelay(start);
    return secureResponse({ error: 'Something went wrong' }, 500);
  }
}

export async function GET() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }