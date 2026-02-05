// src/app/api/auth/verify-email/route.ts
// Verify email address with token

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 250;
const MAX_PAYLOAD_SIZE = 1024;

// =============================================================================
// SCHEMAS
// =============================================================================

const VerifyEmailSchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token')
    .regex(/^[a-f0-9]+$/, 'Invalid token format'),
});

const QuerySchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token')
    .regex(/^[a-f0-9]+$/, 'Invalid token format'),
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

async function verifyEmailToken(token: string, clientIP: string, userAgent: string | null): Promise<{
  success: boolean;
  message: string;
  code: string;
  status: number;
}> {
  const tokenHash = hashToken(token);

  // Find verification record
  const verification = await prisma.emailVerification.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          isActive: true,
          isBanned: true,
          deletedAt: true,
        },
      },
    },
  });

  // Validate
  const isInvalid =
    !verification ||
    verification.verifiedAt !== null ||
    verification.expiresAt < new Date() ||
    !verification.user ||
    verification.user.deletedAt !== null ||
    verification.user.isBanned ||
    !verification.user.isActive;

  if (isInvalid) {
    return {
      success: false,
      message: 'Invalid or expired verification token',
      code: 'INVALID_TOKEN',
      status: 400,
    };
  }

  // Check if already verified
  if (verification.user.emailVerified) {
    return {
      success: true,
      message: 'Email already verified',
      code: 'ALREADY_VERIFIED',
      status: 200,
    };
  }

  // Verify email
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
        action: 'UPDATE',
        category: 'auth',
        entityType: 'user',
        entityId: verification.userId,
        description: 'Email verified successfully',
        ipAddress: clientIP,
        userAgent: userAgent?.slice(0, 255),
        status: 'success',
        newValue: { emailVerified: true },
      },
    }),
  ]);

  // Send welcome email
  sendEmail({
    to: verification.user.email!,
    subject: 'Welcome to CodeSync!',
    html: `
      <h1>Email Verified!</h1>
      <p>Hi ${verification.user.name || 'there'},</p>
      <p>Your email has been verified successfully. You now have full access to your account.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Dashboard</a></p>
    `,
  }).catch((err) => {
    logger.error('Failed to send welcome email', { userId: verification.userId }, err);
  });

  return {
    success: true,
    message: 'Email verified successfully',
    code: 'VERIFIED',
    status: 200,
  };
}

// =============================================================================
// GET - Verify via URL parameter
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Rate limiting
    const rateLimitKey = `verify-email:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Parse query
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ token: searchParams.get('token') });

    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid token', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const result = await verifyEmailToken(parsed.data.token, clientIP, userAgent);

    logger.info('Email verification attempt', {
      success: result.success,
      code: result.code,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      { success: result.success, message: result.message, code: result.code },
      result.status,
      requestId
    );

  } catch (error) {
    logger.error('Verify email error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Verify via body
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Rate limiting
    const rateLimitKey = `verify-email:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, rateLimitKey);

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

    const parsed = VerifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid token', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const result = await verifyEmailToken(parsed.data.token, clientIP, userAgent);

    logger.info('Email verification attempt', {
      success: result.success,
      code: result.code,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      { success: result.success, message: result.message, code: result.code },
      result.status,
      requestId
    );

  } catch (error) {
    logger.error('Verify email error', { ip: clientIP, requestId }, error);
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
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';