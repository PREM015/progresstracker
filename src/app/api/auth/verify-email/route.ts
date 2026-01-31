// src/app/api/auth/verify-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// SCHEMA
// =============================================================================

const VerifyEmailSchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token')
    .regex(/^[a-f0-9]+$/, 'Invalid token format'),
});

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 1024;

// =============================================================================
// HELPERS
// =============================================================================

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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

function secureResponse(body: object, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  return res;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  const start = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 500);

  try {
    // Content-Type Check
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse({ error: 'Content-Type must be application/json' }, 415);
    }

    // Payload Parsing
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

    // Schema Validation
    const parsed = VerifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      logger.debug('Verify email validation failed', {
        errors: parsed.error.flatten(),
        ip: clientIP,
      });
      return secureResponse({ error: 'Invalid request payload' }, 400);
    }

    const { token } = parsed.data;
    const tokenHash = hashToken(token);

    // Lookup Token
    const verification = await prisma.emailVerification.findUnique({
      where: { token: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerified: true,
            isActive: true,
            isBanned: true,
            deletedAt: true,
          },
        },
      },
    });

    // Validate Token
    const isInvalid =
      !verification ||
      verification.verifiedAt !== null ||
      verification.expiresAt < new Date() ||
      !verification.user ||
      verification.user.deletedAt !== null ||
      verification.user.isBanned ||
      !verification.user.isActive;

    if (isInvalid) {
      logger.warn('Invalid email verification attempt', {
        tokenExists: !!verification,
        ip: clientIP,
      });

      await constantTimeDelay(start);
      return secureResponse({ error: 'Invalid or expired token' }, 400);
    }

    // Idempotency Check
    if (verification.user.emailVerified) {
      await constantTimeDelay(start);
      return secureResponse({ message: 'Email already verified' }, 200);
    }

    // ✅ FIXED: Use correct AuditAction enum value
    // 'EMAIL_VERIFIED' doesn't exist, use 'UPDATE' instead
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          emailVerified: new Date(),
          isVerified: true,
        },
      }),

      prisma.emailVerification.update({
        where: { id: verification.id },
        data: {
          verifiedAt: new Date(),
          verifiedIp: clientIP,
        },
      }),

      prisma.auditLog.create({
        data: {
          userId: verification.userId,
          action: 'UPDATE', // ✅ FIXED: Use existing enum value
          category: 'auth',
          entityType: 'user',
          entityId: verification.userId,
          description: 'Email address verified successfully',
          ipAddress: clientIP,
          userAgent: userAgent,
          status: 'success',
          newValue: {
            emailVerified: true,
            verifiedEmail: verification.user.email,
          },
        },
      }),
    ]);

    logger.info('Email verified', {
      userId: verification.userId,
      email: verification.user.email,
      ip: clientIP,
    });

    await constantTimeDelay(start);
    return secureResponse({ message: 'Email verified successfully' }, 200);

  } catch (error) {
    logger.error('Verify email error', { ip: clientIP }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { error: 'Something went wrong. Please try again later.' },
      500
    );
  }
}

export async function GET() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function PUT() { return secureResponse({ error: 'Method not allowed' }, 405); }
export async function DELETE() { return secureResponse({ error: 'Method not allowed' }, 405); }