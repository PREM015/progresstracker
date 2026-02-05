// src/app/api/auth/confirm-email-change/route.ts
// Confirm email change from either old or new email

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

const ConfirmEmailChangeSchema = z.object({
  token: z
    .string()
    .min(64, 'Invalid token')
    .max(128, 'Invalid token'),
  type: z.enum(['old', 'new'], { errorMap: () => ({ message: 'Type must be "old" or "new"' }) }),
});

const QuerySchema = z.object({
  token: z.string().min(64).max(128),
  type: z.enum(['old', 'new']),
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

async function processConfirmation(
  token: string,
  type: 'old' | 'new',
  clientIP: string,
  userAgent: string | null
): Promise<{ success: boolean; message: string; code: string; status: number; completed?: boolean }> {
  const tokenHash = hashToken(token);

  // Find the email change request
  const whereClause = type === 'old'
    ? { oldEmailToken: tokenHash }
    : { newEmailToken: tokenHash };

  const request = await prisma.emailChangeRequest.findFirst({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isBanned: true,
        },
      },
    },
  });

  // Validate request
  if (!request) {
    return { success: false, message: 'Invalid or expired token', code: 'INVALID_TOKEN', status: 400 };
  }

  if (request.expiresAt < new Date()) {
    return { success: false, message: 'Token has expired', code: 'TOKEN_EXPIRED', status: 400 };
  }

  if (request.cancelledAt) {
    return { success: false, message: 'This request has been cancelled', code: 'REQUEST_CANCELLED', status: 400 };
  }

  if (request.completedAt) {
    return { success: true, message: 'Email change already completed', code: 'ALREADY_COMPLETED', status: 200, completed: true };
  }

  if (!request.user || !request.user.isActive || request.user.isBanned) {
    return { success: false, message: 'Account not found or inactive', code: 'ACCOUNT_INACTIVE', status: 403 };
  }

  // Update verification status
  if (type === 'old') {
    if (request.oldEmailVerified) {
      return { success: true, message: 'Old email already verified. Please verify your new email.', code: 'OLD_VERIFIED', status: 200 };
    }

    await prisma.emailChangeRequest.update({
      where: { id: request.id },
      data: { oldEmailVerified: true },
    });

    return {
      success: true,
      message: 'Old email verified. Please check your new email to complete the change.',
      code: 'OLD_VERIFIED',
      status: 200,
    };
  } else {
    // Type is 'new'
    if (!request.oldEmailVerified) {
      return {
        success: false,
        message: 'Please verify your old email first',
        code: 'OLD_NOT_VERIFIED',
        status: 400,
      };
    }

    if (request.newEmailVerified) {
      return { success: true, message: 'Email change already completed', code: 'ALREADY_COMPLETED', status: 200, completed: true };
    }

    // Check if new email is still available
    const existingUser = await prisma.user.findUnique({
      where: { email: request.newEmail },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== request.userId) {
      await prisma.emailChangeRequest.update({
        where: { id: request.id },
        data: { cancelledAt: new Date() },
      });
      return {
        success: false,
        message: 'This email is no longer available',
        code: 'EMAIL_TAKEN',
        status: 409,
      };
    }

    // Complete the email change
    await prisma.$transaction([
      prisma.emailChangeRequest.update({
        where: { id: request.id },
        data: {
          newEmailVerified: true,
          completedAt: new Date(),
        },
      }),

      prisma.user.update({
        where: { id: request.userId },
        data: {
          email: request.newEmail,
          emailVerified: new Date(),
        },
      }),

      // Invalidate all sessions for security
      prisma.session.deleteMany({
        where: { userId: request.userId },
      }),

      prisma.activeSession.updateMany({
        where: { userId: request.userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'email_changed',
        },
      }),

      prisma.refreshToken.updateMany({
        where: { userId: request.userId, isValid: true },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'email_changed',
        },
      }),

      prisma.auditLog.create({
        data: {
          userId: request.userId,
          action: 'EMAIL_CHANGE',
          category: 'auth',
          entityType: 'user',
          entityId: request.userId,
          description: 'Email changed successfully',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
          oldValue: { email: request.oldEmail },
          newValue: { email: request.newEmail },
        },
      }),
    ]);

    // Send confirmation emails
    sendEmail({
      to: request.oldEmail,
      subject: 'Your Email Has Been Changed',
      html: `
        <h1>Email Changed</h1>
        <p>Hi ${request.user.name || 'there'},</p>
        <p>Your email address has been successfully changed to <strong>${request.newEmail}</strong>.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <p>For security, all your sessions have been logged out.</p>
      `,
    }).catch((err) => {
      logger.error('Failed to send email change notification to old email', { userId: request.userId }, err);
    });

    sendEmail({
      to: request.newEmail,
      subject: 'Email Change Confirmed',
      html: `
        <h1>Email Change Complete</h1>
        <p>Hi ${request.user.name || 'there'},</p>
        <p>Your email address has been successfully changed to this address.</p>
        <p>You can now use this email to log in.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Log in now</a></p>
      `,
    }).catch((err) => {
      logger.error('Failed to send email change confirmation to new email', { userId: request.userId }, err);
    });

    logger.info('Email change completed', {
      userId: request.userId,
      oldEmail: request.oldEmail,
      newEmail: request.newEmail,
      ip: clientIP,
    });

    return {
      success: true,
      message: 'Email changed successfully. Please log in with your new email.',
      code: 'COMPLETED',
      status: 200,
      completed: true,
    };
  }
}

// =============================================================================
// GET - Confirm via URL parameters
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Rate limiting
    const rateLimitKey = `confirm-email-change:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 20, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      token: searchParams.get('token'),
      type: searchParams.get('type'),
    });

    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid request parameters', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const result = await processConfirmation(
      parsed.data.token,
      parsed.data.type,
      clientIP,
      userAgent
    );

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: result.success,
        message: result.message,
        code: result.code,
        ...(result.completed !== undefined && { completed: result.completed }),
      },
      result.status,
      requestId
    );

  } catch (error) {
    logger.error('Confirm email change error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Confirm via body
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    // Rate limiting
    const rateLimitKey = `confirm-email-change:${clientIP}`;
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

    const parsed = ConfirmEmailChangeSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid request', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const result = await processConfirmation(
      parsed.data.token,
      parsed.data.type,
      clientIP,
      userAgent
    );

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: result.success,
        message: result.message,
        code: result.code,
        ...(result.completed !== undefined && { completed: result.completed }),
      },
      result.status,
      requestId
    );

  } catch (error) {
    logger.error('Confirm email change error', { ip: clientIP, requestId }, error);
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