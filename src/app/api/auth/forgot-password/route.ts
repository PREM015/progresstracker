// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// SCHEMA
// =============================================================================

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform((email) => email.toLowerCase().trim()),
});

// =============================================================================
// CONFIGURATION
// =============================================================================

const RESET_TOKEN_EXPIRY_MINUTES = 30;
const COOLDOWN_MINUTES = 2;
const MAX_PAYLOAD_SIZE = 1024;
const CONSTANT_TIME_MS = 200;

const GENERIC_RESPONSE = {
  message: 'If an account with that email exists, a password reset link has been sent.',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateResetToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

async function constantTimeDelay(startTime: number): Promise<void> {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function createSecureResponse(data: object, status: number): NextResponse {
  const response = NextResponse.json(data, { status });
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(req);

  try {
    // Content-Type Validation
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createSecureResponse(
        { error: 'Content-Type must be application/json' },
        415
      );
    }

    // Payload Size Check
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return createSecureResponse({ error: 'Request payload too large' }, 413);
    }

    // Parse Body
    let body: unknown;
    try {
      const text = await req.text();
      if (text.length > MAX_PAYLOAD_SIZE) {
        return createSecureResponse({ error: 'Request payload too large' }, 413);
      }
      body = JSON.parse(text);
    } catch {
      return createSecureResponse({ error: 'Invalid JSON payload' }, 400);
    }

    // Schema Validation
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      logger.debug('Forgot password validation failed', {
        errors: parsed.error.flatten(),
        ip: clientIP,
      });
      return createSecureResponse({ error: 'Invalid request payload' }, 400);
    }

    const { email } = parsed.data;

    // Find User
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        deletedAt: true,
        isActive: true,
        isBanned: true,
      },
    });

    // Prevent user enumeration
    if (!user || user.deletedAt || !user.isActive || user.isBanned) {
      await constantTimeDelay(startTime);
      return createSecureResponse(GENERIC_RESPONSE, 200);
    }

    // Cooldown Check
    const recentToken = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000),
        },
      },
      select: { createdAt: true },
    });

    if (recentToken) {
      logger.info('Forgot password cooldown active', {
        userId: user.id,
        lastRequest: recentToken.createdAt,
      });
      await constantTimeDelay(startTime);
      return createSecureResponse(GENERIC_RESPONSE, 200);
    }

    // Invalidate Old Tokens
    const deletedTokens = await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    if (deletedTokens.count > 0) {
      logger.debug('Invalidated existing reset tokens', {
        userId: user.id,
        count: deletedTokens.count,
      });
    }

    // Generate New Token
    const { rawToken, hashedToken } = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // ✅ FIXED: Use 'token' field instead of 'tokenHash'
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken, // ✅ Schema field is 'token'
        expiresAt,
        ipAddress: clientIP,
        userAgent: req.headers.get('user-agent')?.slice(0, 255),
      },
    });

    // TODO: Send Email
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
    // await sendResetPasswordEmail({ to: user.email, resetUrl, expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES });

    // For development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Reset token generated (DEV ONLY)', {
        rawToken,
        userId: user.id,
      });
    }

    // Audit Log
    logger.info('Password reset requested', {
      userId: user.id,
      email: user.email,
      expiresAt,
      ip: clientIP,
    });

    await constantTimeDelay(startTime);
    return createSecureResponse(GENERIC_RESPONSE, 200);

  } catch (error) {
    logger.error('Forgot password error', { ip: clientIP }, error);
    await constantTimeDelay(startTime);
    return createSecureResponse(
      { error: 'Something went wrong. Please try again later.' },
      500
    );
  }
}

export async function GET() {
  return createSecureResponse({ error: 'Method not allowed' }, 405);
}

export async function PUT() {
  return createSecureResponse({ error: 'Method not allowed' }, 405);
}

export async function DELETE() {
  return createSecureResponse({ error: 'Method not allowed' }, 405);
}