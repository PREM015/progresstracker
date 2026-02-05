// src/app/api/auth/forgot-password/route.ts
// Request password reset email

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 1024;
const RESET_TOKEN_EXPIRY_MINUTES = 30;
const COOLDOWN_MINUTES = 2;

// Generic response to prevent email enumeration
const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account with that email exists, a password reset link has been sent.',
};

// =============================================================================
// SCHEMAS
// =============================================================================

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
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

function generateResetToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
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
// POST - Request Password Reset
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Rate limiting
    const rateLimitKey = `forgot-password:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 5, rateLimitKey);

    if (!rateLimitResult.success) {
      logger.warn('Forgot password rate limit exceeded', { ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
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

    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      logger.debug('Forgot password validation failed', { errors: parsed.error.flatten(), requestId });
      return secureResponse(
        { success: false, error: 'Invalid email format', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { email } = parsed.data;

    // Find user - but always return same response
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        isActive: true,
        isBanned: true,
        deletedAt: true,
      },
    });

    // If user doesn't exist or is inactive, still return success (prevent enumeration)
    if (!user || user.deletedAt || !user.isActive || user.isBanned) {
      logger.debug('Forgot password for non-existent/inactive user', { email, requestId });
      await constantTimeDelay(start);
      return secureResponse(GENERIC_SUCCESS, 200, requestId);
    }

    // Check cooldown
    const recentToken = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000) },
      },
      select: { createdAt: true },
    });

    if (recentToken) {
      logger.info('Forgot password cooldown active', { userId: user.id, requestId });
      await constantTimeDelay(start);
      return secureResponse(GENERIC_SUCCESS, 200, requestId);
    }

    // Invalidate existing reset tokens
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Generate new token
    const { rawToken, hashedToken } = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Create reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
        ipAddress: clientIP,
        userAgent: userAgent?.slice(0, 255),
      },
    });

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;

    sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>Hi ${user.name || 'there'},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p>This link will expire in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>For security, this request was received from IP: ${clientIP}</p>
      `,
    }).catch((err) => {
      logger.error('Failed to send reset email', { userId: user.id, requestId }, err);
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        category: 'auth',
        entityType: 'password_reset',
        description: 'Password reset requested',
        ipAddress: clientIP,
        userAgent: userAgent?.slice(0, 255),
        status: 'success',
      },
    });

    logger.info('Password reset requested', { userId: user.id, email, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(GENERIC_SUCCESS, 200, requestId);

  } catch (error) {
    logger.error('Forgot password error', { ip: clientIP, requestId }, error);
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