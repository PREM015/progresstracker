// src/app/api/auth/reset-password/route.ts
// Reset password with token

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 2048;
const BCRYPT_ROUNDS = 12;

// Common passwords to reject
const COMMON_PASSWORDS = new Set([
  'Password123!', 'Welcome123!', 'Qwerty123!', 'Admin123!', 'Letmein123!',
  'password123', 'password1234', 'qwerty1234', '12345678', 'abcd1234',
]);

// =============================================================================
// SCHEMAS
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
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
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
  return res;
}

// =============================================================================
// POST - Reset Password
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Rate limiting
    const rateLimitKey = `reset-password:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 5, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
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

    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return secureResponse(
        { success: false, error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors },
        400,
        requestId
      );
    }

    const { token, password } = parsed.data;

    // Check common passwords
    if (COMMON_PASSWORDS.has(password)) {
      return secureResponse(
        { success: false, error: 'This password is too common. Please choose a stronger password.', code: 'WEAK_PASSWORD' },
        400,
        requestId
      );
    }

    const tokenHash = hashToken(token);

    // Find reset token
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            isActive: true,
            isBanned: true,
            deletedAt: true,
          },
        },
      },
    });

    // Validate token
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
        requestId,
      });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid or expired reset token', code: 'INVALID_TOKEN' },
        400,
        requestId
      );
    }

    // Check if same as current password
    if (resetRecord.user.password) {
      const isSamePassword = await bcrypt.compare(password, resetRecord.user.password);
      if (isSamePassword) {
        return secureResponse(
          { success: false, error: 'New password cannot be the same as your current password', code: 'SAME_PASSWORD' },
          400,
          requestId
        );
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password and invalidate sessions
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

      // Delete all other pending tokens
      prisma.passwordReset.deleteMany({
        where: {
          userId: resetRecord.userId,
          id: { not: resetRecord.id },
        },
      }),

      // Invalidate all sessions
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),

      prisma.activeSession.updateMany({
        where: { userId: resetRecord.userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      }),

      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, isValid: true },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      }),

      // Create audit log
      prisma.auditLog.create({
        data: {
          userId: resetRecord.userId,
          action: 'PASSWORD_CHANGE',
          category: 'auth',
          entityType: 'user',
          entityId: resetRecord.userId,
          description: 'Password reset completed',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      }),
    ]);

    // Send confirmation email
    sendEmail({
      to: resetRecord.user.email!,
      subject: 'Your Password Has Been Reset',
      html: `
        <h1>Password Reset Successful</h1>
        <p>Hi ${resetRecord.user.name || 'there'},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <p>For security, this action was performed from IP: ${clientIP}</p>
      `,
    }).catch((err) => {
      logger.error('Failed to send password reset confirmation', { userId: resetRecord.userId, requestId }, err);
    });

    logger.info('Password reset completed', {
      userId: resetRecord.userId,
      email: resetRecord.user.email,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'Password has been reset successfully. Please log in with your new password.' },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Reset password error', { ip: clientIP, requestId }, error);
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
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';