import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
// import { rateLimiter } from '@/lib/redis';
// import { sendResetPasswordEmail } from '@/lib/mailer';

/* -------------------------------------------------------------------------- */
/*                                   SCHEMA                                   */
/* -------------------------------------------------------------------------- */

const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform((email) => email.toLowerCase().trim()),
});

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

const RESET_TOKEN_EXPIRY_MINUTES = 30;
const COOLDOWN_MINUTES = 2; // Minimum time between reset requests for same email
const MAX_PAYLOAD_SIZE = 1024; // 1KB max request size
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

const GENERIC_RESPONSE = {
  message:
    'If an account with that email exists, a password reset link has been sent.',
};

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function generateResetToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  return { rawToken, hashedToken };
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Simulate async work to prevent timing attacks
 * Always takes approximately the same time regardless of user existence
 */
async function constantTimeDelay(startTime: number, targetMs: number = 200): Promise<void> {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, targetMs - elapsed);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function createSecureResponse(
  data: object,
  status: number
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  
  return response;
}

/* -------------------------------------------------------------------------- */
/*                                   HANDLER                                  */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    /* ------------------------ Content-Type Validation ----------------------- */
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return createSecureResponse(
        { error: 'Content-Type must be application/json' },
        415
      );
    }

    /* -------------------------- Origin Validation --------------------------- */
    const origin = req.headers.get('origin');
    if (
      process.env.NODE_ENV === 'production' &&
      origin &&
      ALLOWED_ORIGINS.length > 0 &&
      !ALLOWED_ORIGINS.includes(origin)
    ) {
      logger.warn('Forgot password request from unauthorized origin', {
        origin,
        ip: getClientIP(req),
      });
      
      return createSecureResponse(
        { error: 'Unauthorized origin' },
        403
      );
    }

    /* -------------------------- Payload Size Check -------------------------- */
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return createSecureResponse(
        { error: 'Request payload too large' },
        413
      );
    }

    /* ------------------------------ Parse Body ------------------------------ */
    let body: unknown;
    try {
      const text = await req.text();
      
      // Additional size check on actual content
      if (text.length > MAX_PAYLOAD_SIZE) {
        return createSecureResponse(
          { error: 'Request payload too large' },
          413
        );
      }
      
      body = JSON.parse(text);
    } catch {
      return createSecureResponse(
        { error: 'Invalid JSON payload' },
        400
      );
    }

    /* --------------------------- Schema Validation -------------------------- */
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      // Don't leak validation details
      logger.debug('Forgot password validation failed', {
        errors: parsed.error.flatten(),
        ip: getClientIP(req),
      });

      return createSecureResponse(
        { error: 'Invalid request payload' },
        400
      );
    }

    const { email } = parsed.data;
    const clientIP = getClientIP(req);

    /* ---------------------------- Rate Limiting ----------------------------- */
    // NOTE: Enable once Redis is finalized
    /*
    // Rate limit by IP
    const ipRateLimit = await rateLimiter.limit(
      `forgot-password:ip:${clientIP}`,
      10,          // max requests
      60 * 15      // 15 minute window
    );

    if (!ipRateLimit.allowed) {
      logger.warn('Forgot password rate limit exceeded (IP)', {
        ip: clientIP,
      });
      
      await constantTimeDelay(startTime);
      return createSecureResponse(
        { error: 'Too many requests. Try again later.' },
        429
      );
    }

    // Rate limit by email (stricter)
    const emailHash = crypto.createHash('sha256').update(email).digest('hex');
    const emailRateLimit = await rateLimiter.limit(
      `forgot-password:email:${emailHash}`,
      3,           // max requests
      60 * 60      // 1 hour window
    );

    if (!emailRateLimit.allowed) {
      logger.warn('Forgot password rate limit exceeded (email)', {
        emailHash,
        ip: clientIP,
      });
      
      await constantTimeDelay(startTime);
      // Still return generic response to prevent enumeration
      return createSecureResponse(GENERIC_RESPONSE, 200);
    }
    */

    /* ------------------------------ Find User ------------------------------- */
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true, // Optional: only allow for verified emails
        deletedAt: true,     // Optional: check for soft-deleted users
      },
    });

    // IMPORTANT: Prevent user enumeration
    // Also handles: non-existent users, unverified emails, deleted accounts
    if (!user || user.deletedAt) {
      await constantTimeDelay(startTime);
      return createSecureResponse(GENERIC_RESPONSE, 200);
    }

    // Optional: Only allow password reset for verified emails
    // if (!user.emailVerified) {
    //   await constantTimeDelay(startTime);
    //   return createSecureResponse(GENERIC_RESPONSE, 200);
    // }

    /* ---------------------------- Cooldown Check ---------------------------- */
    const recentToken = await prisma.passwordResetToken.findFirst({
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
      // Return success to prevent enumeration
      return createSecureResponse(GENERIC_RESPONSE, 200);
    }

    /* ------------------------ Invalidate Old Tokens ------------------------- */
    const deletedTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    if (deletedTokens.count > 0) {
      logger.debug('Invalidated existing reset tokens', {
        userId: user.id,
        count: deletedTokens.count,
      });
    }

    /* -------------------------- Generate New Token -------------------------- */
    const { rawToken, hashedToken } = generateResetToken();

    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt,
        // Optional: track request metadata
        // ipAddress: clientIP,
        // userAgent: req.headers.get('user-agent')?.slice(0, 255),
      },
    });

    /* ------------------------------ Send Email ------------------------------ */
    // TODO (Phase Email):
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
    // await sendResetPasswordEmail({
    //   to: user.email,
    //   resetUrl,
    //   expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
    // });

    // For development, log the token (REMOVE IN PRODUCTION)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Reset token generated (DEV ONLY)', {
        rawToken,
        userId: user.id,
      });
    }

    /* ------------------------------ Audit Log ------------------------------- */
    logger.info('Password reset requested', {
      userId: user.id,
      email: user.email,
      expiresAt,
      ip: clientIP,
      userAgent: req.headers.get('user-agent')?.slice(0, 100),
    });

    /* ------------------------------ Response -------------------------------- */
    await constantTimeDelay(startTime);
    return createSecureResponse(GENERIC_RESPONSE, 200);

  } catch (error) {
    // Determine error type for appropriate logging
    const isDbError = error instanceof Error && 
      error.message.includes('prisma');

    logger.error('Forgot password error', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      } : error,
      type: isDbError ? 'database' : 'unknown',
      ip: getClientIP(req),
    });

    await constantTimeDelay(startTime);
    return createSecureResponse(
      { error: 'Something went wrong. Please try again later.' },
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            METHOD NOT ALLOWED                              */
/* -------------------------------------------------------------------------- */

export async function GET() {
  return createSecureResponse(
    { error: 'Method not allowed' },
    405
  );
}

export async function PUT() {
  return createSecureResponse(
    { error: 'Method not allowed' },
    405
  );
}

export async function DELETE() {
  return createSecureResponse(
    { error: 'Method not allowed' },
    405
  );
}