import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/* -------------------------------------------------------------------------- */
/*                                   SCHEMA                                   */
/* -------------------------------------------------------------------------- */

const ResetPasswordSchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token')
    .regex(/^[a-f0-9]+$/, 'Invalid token format'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

const MAX_PAYLOAD_SIZE = 2048;
const CONSTANT_TIME_MS = 300;
const BCRYPT_ROUNDS = 12;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? [];

const COMMON_PASSWORDS = new Set([
  'Password123!',
  'Welcome123!',
  'Qwerty123!',
  'Admin123!',
  'Letmein123!',
  'Password1!',
  'P@ssw0rd123',
  'Abc123!@#',
]);

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

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
  res.headers.set('X-XSS-Protection', '1; mode=block');
  return res;
}

function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password);
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  }
  return { message: String(err) };
}

/* -------------------------------------------------------------------------- */
/*                                   HANDLER                                  */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const start = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 500);

  try {
    /* ------------------------ Content-Type Check --------------------------- */
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse(
        { error: 'Content-Type must be application/json' },
        415
      );
    }

    /* -------------------------- Origin Validation -------------------------- */
    const origin = req.headers.get('origin');
    if (
      process.env.NODE_ENV === 'production' &&
      origin &&
      ALLOWED_ORIGINS.length > 0 &&
      !ALLOWED_ORIGINS.includes(origin)
    ) {
      logger.warn('Reset password request from unauthorized origin', {
        origin,
        ip: clientIP,
      });
      return secureResponse({ error: 'Unauthorized origin' }, 403);
    }

    /* -------------------------- Payload Parsing ---------------------------- */
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

    /* -------------------------- Schema Validation -------------------------- */
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      logger.debug('Reset password validation failed', {
        errors: parsed.error.flatten(),
        ip: clientIP,
      });
      return secureResponse({ error: 'Invalid request payload' }, 400);
    }

    const { token, password } = parsed.data;

    /* ----------------------- Check Common Passwords ------------------------ */
    if (isCommonPassword(password)) {
      return secureResponse(
        { error: 'Password is too common. Please choose a stronger password.' },
        400
      );
    }

    const tokenHash = hashToken(token);

    /* -------------------------- Lookup Token ------------------------------- */
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            isBanned: true,
            deletedAt: true,
            password: true,
          },
        },
      },
    });

    /* ------------------------- Validate Token ------------------------------ */
    const isInvalid =
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt < new Date() ||
      !resetRecord.user ||
      resetRecord.user.deletedAt !== null ||
      resetRecord.user.isBanned ||
      !resetRecord.user.isActive;

    if (isInvalid) {
      logger.warn('Invalid reset token attempt', {
        tokenExists: !!resetRecord,
        isUsed: resetRecord?.usedAt !== null,
        isExpired: resetRecord ? resetRecord.expiresAt < new Date() : null,
        ip: clientIP,
      });

      await constantTimeDelay(start);
      return secureResponse({ error: 'Invalid or expired token' }, 400);
    }

    /* ---------------------- Check Password Reuse --------------------------- */
    if (resetRecord.user.password) {
      const isSamePassword = await bcrypt.compare(
        password,
        resetRecord.user.password
      );
      if (isSamePassword) {
        return secureResponse(
          { error: 'New password cannot be the same as current password' },
          400
        );
      }
    }

    /* -------------------------- Hash Password ------------------------------ */
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    /* ---------------------------- Atomic Update ---------------------------- */
    await prisma.$transaction([
      // Update user password
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      }),

      // Mark token as used
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),

      // Invalidate all sessions (NextAuth sessions)
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),

      // Invalidate all active sessions
      prisma.activeSession.deleteMany({
        where: { userId: resetRecord.userId },
      }),

      // Invalidate all refresh tokens
      prisma.refreshToken.updateMany({
        where: {
          userId: resetRecord.userId,
          isValid: true,
        },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      }),

      // Delete all other pending password reset tokens
      prisma.passwordReset.deleteMany({
        where: {
          userId: resetRecord.userId,
          id: { not: resetRecord.id },
          usedAt: null,
        },
      }),

      // Create audit log entry
      prisma.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: 'PASSWORD_RESET',
          category: 'auth',
          entityType: 'user',
          entityId: resetRecord.userId,
          description: 'Password reset completed',
          ipAddress: clientIP,
          userAgent: userAgent,
          status: 'success',
        },
      }),
    ]);

    /* ------------------------------ Audit Log ------------------------------ */
    logger.info('Password reset completed', {
      userId: resetRecord.userId,
      email: resetRecord.user.email,
      requestIp: resetRecord.ipAddress,
      resetIp: clientIP,
      ipMatch: resetRecord.ipAddress === clientIP,
    });

    /* ------------------------------- Response ------------------------------ */
    await constantTimeDelay(start);
    return secureResponse(
      { message: 'Password has been reset successfully. Please log in.' },
      200
    );
  } catch (err) {
    const isPrismaError =
      err instanceof Error &&
      (err.name.includes('Prisma') || err.message.includes('prisma'));

    logger.error('Reset password error', {
      errorDetails: formatError(err),
      type: isPrismaError ? 'database' : 'unknown',
      ip: clientIP,
    });

    await constantTimeDelay(start);
    return secureResponse(
      { error: 'Something went wrong. Please try again later.' },
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            METHOD NOT ALLOWED                              */
/* -------------------------------------------------------------------------- */

export async function GET() {
  return secureResponse({ error: 'Method not allowed' }, 405);
}

export async function PUT() {
  return secureResponse({ error: 'Method not allowed' }, 405);
}

export async function DELETE() {
  return secureResponse({ error: 'Method not allowed' }, 405);
}

export async function PATCH() {
  return secureResponse({ error: 'Method not allowed' }, 405);
}