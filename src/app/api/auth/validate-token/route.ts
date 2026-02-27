// src/app/api/auth/validate-token/route.ts
// Validate various tokens (reset, verification, 2FA, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyJwt } from '@/lib/jwt';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 200;
const MAX_PAYLOAD_SIZE = 2048;

// =============================================================================
// SCHEMAS
// =============================================================================

const ValidateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').max(1024),
  type: z.enum([
    'password_reset',
    'email_verification',
    'email_change',
    'refresh',
    'access',
    '2fa_temp',
  ]),
});

const QuerySchema = z.object({
  token: z.string().min(1).max(1024),
  type: z.enum([
    'password_reset',
    'email_verification',
    'email_change',
    'refresh',
    'access',
    '2fa_temp',
  ]),
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

interface ValidationResult {
  valid: boolean;
  message: string;
  code: string;
  expiresAt?: string;
  userId?: string;
  email?: string;
  meta?: Record<string, unknown>;
}

async function validateToken(token: string, type: string): Promise<ValidationResult> {
  const tokenHash = hashToken(token);

  switch (type) {
    case 'password_reset': {
      const resetToken = await prisma.passwordReset.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            select: { id: true, email: true, isActive: true, isBanned: true },
          },
        },
      });

      if (!resetToken) {
        return { valid: false, message: 'Token not found', code: 'NOT_FOUND' };
      }
      if (resetToken.usedAt) {
        return { valid: false, message: 'Token already used', code: 'ALREADY_USED' };
      }
      if (resetToken.expiresAt < new Date()) {
        return { valid: false, message: 'Token expired', code: 'EXPIRED' };
      }
      if (!resetToken.user.isActive || resetToken.user.isBanned) {
        return { valid: false, message: 'Account inactive', code: 'ACCOUNT_INACTIVE' };
      }

      return {
        valid: true,
        message: 'Token is valid',
        code: 'VALID',
        expiresAt: resetToken.expiresAt.toISOString(),
        email: resetToken.user.email ?? undefined,
      };
    }

    case 'email_verification': {
      const verificationToken = await prisma.emailVerification.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            select: { id: true, email: true, emailVerified: true, isActive: true },
          },
        },
      });

      if (!verificationToken) {
        return { valid: false, message: 'Token not found', code: 'NOT_FOUND' };
      }
      if (verificationToken.verifiedAt) {
        return { valid: false, message: 'Already verified', code: 'ALREADY_VERIFIED' };
      }
      if (verificationToken.expiresAt < new Date()) {
        return { valid: false, message: 'Token expired', code: 'EXPIRED' };
      }
      if (verificationToken.user.emailVerified) {
        return { valid: false, message: 'Email already verified', code: 'ALREADY_VERIFIED' };
      }

      return {
        valid: true,
        message: 'Token is valid',
        code: 'VALID',
        expiresAt: verificationToken.expiresAt.toISOString(),
        email: verificationToken.email,
      };
    }

    case 'email_change': {
      // Check both old and new email tokens
      const changeRequest = await prisma.emailChangeRequest.findFirst({
        where: {
          OR: [
            { oldEmailToken: tokenHash },
            { newEmailToken: tokenHash },
          ],
        },
      });

      if (!changeRequest) {
        return { valid: false, message: 'Token not found', code: 'NOT_FOUND' };
      }
      if (changeRequest.completedAt) {
        return { valid: false, message: 'Already completed', code: 'ALREADY_COMPLETED' };
      }
      if (changeRequest.cancelledAt) {
        return { valid: false, message: 'Request cancelled', code: 'CANCELLED' };
      }
      if (changeRequest.expiresAt < new Date()) {
        return { valid: false, message: 'Token expired', code: 'EXPIRED' };
      }

      const isOldToken = changeRequest.oldEmailToken === tokenHash;

      return {
        valid: true,
        message: 'Token is valid',
        code: 'VALID',
        expiresAt: changeRequest.expiresAt.toISOString(),
        meta: {
          type: isOldToken ? 'old_email' : 'new_email',
          oldEmailVerified: changeRequest.oldEmailVerified,
          newEmailVerified: changeRequest.newEmailVerified,
          newEmail: changeRequest.newEmail,
        },
      };
    }

    case 'refresh': {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            select: { id: true, isActive: true, isBanned: true },
          },
        },
      });

      if (!refreshToken) {
        return { valid: false, message: 'Token not found', code: 'NOT_FOUND' };
      }
      if (!refreshToken.isValid) {
        return { valid: false, message: 'Token revoked', code: 'REVOKED' };
      }
      if (refreshToken.expiresAt < new Date()) {
        return { valid: false, message: 'Token expired', code: 'EXPIRED' };
      }
      if (!refreshToken.user.isActive || refreshToken.user.isBanned) {
        return { valid: false, message: 'Account inactive', code: 'ACCOUNT_INACTIVE' };
      }

      return {
        valid: true,
        message: 'Token is valid',
        code: 'VALID',
        expiresAt: refreshToken.expiresAt.toISOString(),
        userId: refreshToken.userId,
      };
    }

    case 'access': {
      // Validate JWT access token
      const payload = verifyJwt(token);

      if (!payload) {
        return { valid: false, message: 'Invalid or expired token', code: 'INVALID' };
      }

      // Optionally check if user is still active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true, isBanned: true },
      });

      if (!user || !user.isActive || user.isBanned) {
        return { valid: false, message: 'Account inactive', code: 'ACCOUNT_INACTIVE' };
      }

      return {
        valid: true,
        message: 'Token is valid',
        code: 'VALID',
        userId: payload.userId,
        email: payload.email,
        meta: { role: payload.role },
      };
    }

    case '2fa_temp': {
      // 2FA temporary tokens are stored in password reset table with a special purpose
      const tempToken = await prisma.passwordReset.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              twoFactorAuth: { select: { isEnabled: true } },
            },
          },
        },
      });

      if (!tempToken) {
        return { valid: false, message: 'Token not found', code: 'NOT_FOUND' };
      }
      if (tempToken.usedAt) {
        return { valid: false, message: 'Token already used', code: 'ALREADY_USED' };
      }
      if (tempToken.expiresAt < new Date()) {
        return { valid: false, message: 'Token expired', code: 'EXPIRED' };
      }
      if (!tempToken.user.twoFactorAuth?.isEnabled) {
        return { valid: false, message: '2FA not enabled', code: '2FA_NOT_ENABLED' };
      }

      return {
        valid: true,
        message: 'Token is valid',
        code: 'VALID',
        expiresAt: tempToken.expiresAt.toISOString(),
        userId: tempToken.userId,
        email: tempToken.user.email ?? undefined,
        meta: { requiresTwoFactor: true },
      };
    }

    default:
      return { valid: false, message: 'Unknown token type', code: 'UNKNOWN_TYPE' };
  }
}

// =============================================================================
// GET - Validate via query parameters
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `validate-token:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, rateLimitKey);

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
        { success: false, error: 'Invalid parameters', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const result = await validateToken(parsed.data.token, parsed.data.type);

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        ...result,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Validate token error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Validate via body
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    // Rate limiting
    const rateLimitKey = `validate-token:${clientIP}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, rateLimitKey);

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

    const parsed = ValidateTokenSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid parameters', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const result = await validateToken(parsed.data.token, parsed.data.type);

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        ...result,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Validate token error', { ip: clientIP, requestId }, error);
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