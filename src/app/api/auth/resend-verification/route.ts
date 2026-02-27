// src/app/api/auth/resend-verification/route.ts
// Resend email verification link

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

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 1024;
const TOKEN_EXPIRY_HOURS = 24;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// Generic response to prevent enumeration
const GENERIC_SUCCESS = {
  success: true,
  message: 'If an unverified account exists with that email, a verification link has been sent.',
};

// =============================================================================
// SCHEMAS
// =============================================================================

const ResendVerificationSchema = z.object({
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
// POST - Resend Verification Email
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `resend-verification:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 3, rateLimitKey);

    if (!rateLimitResult.success) {
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

    const parsed = ResendVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid email format', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { email } = parsed.data;

    // Find user
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

    // Return generic response if user doesn't exist or is already verified
    if (!user || user.emailVerified || !user.isActive || user.isBanned || user.deletedAt) {
      logger.debug('Resend verification for invalid user', { email, requestId });
      await constantTimeDelay(start);
      return secureResponse(GENERIC_SUCCESS, 200, requestId);
    }

    // Check cooldown
    const recentVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        type: 'verification',
        createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
      },
      select: { createdAt: true },
    });

    if (recentVerification) {
      logger.info('Resend verification cooldown active', { userId: user.id, requestId });
      await constantTimeDelay(start);
      return secureResponse(GENERIC_SUCCESS, 200, requestId);
    }

    // Generate new token
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate old tokens and create new one
    await prisma.$transaction([
      prisma.emailVerification.updateMany({
        where: {
          userId: user.id,
          type: 'verification',
          verifiedAt: null,
        },
        data: {
          expiresAt: new Date(0), // Mark as expired
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

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}`;

    sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Verify Your Email</h1>
        <p>Hi ${user.name || 'there'},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
        <p>This link will expire in ${TOKEN_EXPIRY_HOURS} hours.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    }).catch((err) => {
      logger.error('Failed to send verification email', { userId: user.id, requestId }, err);
    });

    logger.info('Verification email resent', { userId: user.id, email, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(GENERIC_SUCCESS, 200, requestId);

  } catch (error) {
    logger.error('Resend verification error', { ip: clientIP, requestId }, error);
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