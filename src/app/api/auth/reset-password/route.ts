// src/app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// SCHEMA
// =============================================================================

const ResetPasswordSchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token')
    .regex(/^[a-f0-9]+$/, 'Invalid token format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_PAYLOAD_SIZE = 2048;
const CONSTANT_TIME_MS = 300;
const BCRYPT_ROUNDS = 12;

const COMMON_PASSWORDS = new Set([
  'Password123!',
  'Welcome123!',
  'Qwerty123!',
  'Admin123!',
  'Letmein123!',
]);

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
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      logger.debug('Reset password validation failed', {
        errors: parsed.error.flatten(),
        ip: clientIP,
      });
      return secureResponse({ error: 'Invalid request payload' }, 400);
    }

    const { token, password } = parsed.data;

    // Check Common Passwords
    if (COMMON_PASSWORDS.has(password)) {
      return secureResponse(
        { error: 'Password is too common. Please choose a stronger password.' },
        400
      );
    }

    const tokenHash = hashToken(token);

    // ✅ FIXED: Use 'token' field instead of 'tokenHash'
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: tokenHash }, // ✅ Schema field is 'token'
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

    // Validate Token
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

    // Check Password Reuse
    if (resetRecord.user.password) {
      const isSamePassword = await bcrypt.compare(password, resetRecord.user.password);
      if (isSamePassword) {
        return secureResponse(
          { error: 'New password cannot be the same as current password' },
          400
        );
      }
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Atomic Update
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
      prisma.activeSession.updateMany({
        where: { userId: resetRecord.userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
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

      // ✅ FIXED: Use correct AuditAction enum value
      prisma.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: 'PASSWORD_RESET', // ✅ This exists in AuditAction enum
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

    logger.info('Password reset completed', {
      userId: resetRecord.userId,
      email: resetRecord.user.email,
      ip: clientIP,
    });

    await constantTimeDelay(start);
    return secureResponse(
      { message: 'Password has been reset successfully. Please log in.' },
      200
    );

  } catch (error) {
    logger.error('Reset password error', { ip: clientIP }, error);
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