// src/app/api/auth/change-password/route.ts
// Change password for logged-in users

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { authOptions } from '@/lib/auth';
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

const COMMON_PASSWORDS = new Set([
  'Password123!', 'Welcome123!', 'Qwerty123!', 'Admin123!', 'Letmein123!',
  'password123', 'password1234', 'qwerty1234', '12345678', 'abcd1234',
]);

// =============================================================================
// SCHEMAS
// =============================================================================

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  logoutOtherSessions: z.boolean().optional().default(true),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

const SetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
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
// GET - Check if user has password
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        passwordChangedAt: true,
      },
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        hasPassword: !!user?.password,
        passwordChangedAt: user?.passwordChangedAt,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Check password error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Change Password
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    // Rate limiting
    const rateLimitKey = `change-password:${userId}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 3, rateLimitKey);

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

    const parsed = ChangePasswordSchema.safeParse(body);
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

    const { currentPassword, newPassword, logoutOtherSessions } = parsed.data;

    // Check common passwords
    if (COMMON_PASSWORDS.has(newPassword)) {
      return secureResponse(
        { success: false, error: 'This password is too common. Please choose a stronger password.', code: 'WEAK_PASSWORD' },
        400,
        requestId
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!user) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        404,
        requestId
      );
    }

    if (!user.password) {
      return secureResponse(
        { success: false, error: 'No password set. Use PUT to set password for OAuth accounts.', code: 'NO_PASSWORD' },
        400,
        requestId
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      logger.warn('Password change failed - invalid current password', { userId, ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Current password is incorrect', code: 'INVALID_PASSWORD' },
        401,
        requestId
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Get current session token
    const currentSessionToken =
      req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    // Update password and optionally logout other sessions
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      if (logoutOtherSessions) {
        if (currentSessionToken) {
          await tx.activeSession.updateMany({
            where: { userId, token: { not: currentSessionToken } },
            data: { isValid: false, revokedAt: new Date(), revokedReason: 'password_changed' },
          });
        }

        await tx.refreshToken.updateMany({
          where: { userId, isValid: true },
          data: { isValid: false, revokedAt: new Date(), revokedReason: 'password_changed' },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGE',
          category: 'auth',
          entityType: 'user',
          entityId: userId,
          description: 'Password changed',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
          newValue: { logoutOtherSessions },
        },
      });
    });

    // Send notification email
    if (user.email) {
      sendEmail({
        to: user.email,
        subject: 'Your Password Has Been Changed',
        html: `
          <h1>Password Changed</h1>
          <p>Hi ${user.name || 'there'},</p>
          <p>Your password has been successfully changed.</p>
          ${logoutOtherSessions ? '<p>All other sessions have been logged out for security.</p>' : ''}
          <p>If you did not make this change, please reset your password immediately.</p>
          <p>IP Address: ${clientIP}</p>
          <p>Time: ${new Date().toISOString()}</p>
        `,
      }).catch((err) => {
        logger.error('Failed to send password change notification', { userId, requestId }, err);
      });
    }

    logger.info('Password changed', { userId, logoutOtherSessions, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'Password changed successfully', loggedOutOtherSessions: logoutOtherSessions },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Change password error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// PUT - Set Password (for OAuth users)
// =============================================================================

export async function PUT(req: NextRequest): Promise<NextResponse> {
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

    // Content-Type validation
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return secureResponse(
        { success: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' },
        415,
        requestId
      );
    }

    const raw = await req.text();
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

    const parsed = SetPasswordSchema.safeParse(body);
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

    const { newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        404,
        requestId
      );
    }

    if (user.password) {
      return secureResponse(
        { success: false, error: 'Password already set. Use POST to change password.', code: 'PASSWORD_EXISTS' },
        400,
        requestId
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword, passwordChangedAt: new Date(), updatedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGE',
          category: 'auth',
          entityType: 'user',
          entityId: userId,
          description: 'Password set for OAuth account',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    logger.info('Password set for OAuth user', { userId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'Password set successfully. You can now login with email and password.' },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Set password error', { ip: clientIP, requestId }, error);
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

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function DELETE(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';