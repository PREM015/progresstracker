// src/app/api/user/deactivate/route.ts
// =============================================================================
// ACCOUNT DEACTIVATION ROUTES
// =============================================================================
// Description: Deactivate user account (soft delete with recovery option)
// Methods: POST, DELETE, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 5 requests/hour
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { TwoFactorService } from '@/services/twoFactorService';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 5; // Very strict for security

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const deactivateSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().max(500).optional(),
  feedback: z.string().max(1000).optional(),
  twoFactorCode: z.string().length(6).optional(),
});

const cancelDeactivationSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const session = await getServerSession(authOptions);
  const rateLimitKey = session?.user?.id ? `deactivate:${session.user.id}` : `deactivate:${ip}`;
  const rateLimitResult = await checkLimit(authRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for deactivation', { ip, requestId });
    return {
      error: apiResponse.rateLimited(3600, requestId), // 1 hour cooldown
      session: null,
      rateLimitResult,
      ip,
    };
  }

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  return { error: null, session, rateLimitResult, ip };
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Check Deactivation Status
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isActive: true,
        deletedAt: true,
      },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Account-Active': String(user?.isActive ?? false),
        'X-Account-Deactivated': String(user?.deletedAt ? 'true' : 'false'),
        'X-Deactivation-Date': user?.deletedAt?.toISOString() || '',
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD deactivate failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// POST - Deactivate Account
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const bodyValidation = deactivateSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { password, reason, feedback, twoFactorCode } = bodyValidation.data;

    logger.warn('Account deactivation initiated', { userId, requestId, ip });

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        isActive: true,
        email: true,
      },
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User', requestId), requestId, rateLimitResult);
    }

    if (!user.isActive) {
      return addHeaders(
        apiResponse.validationError('Account is already deactivated', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Verify password
    if (!user.password) {
      return addHeaders(
        apiResponse.validationError(
          'Password not set. OAuth accounts must set a password first.',
          undefined,
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Deactivation failed - invalid password', { userId, requestId, ip });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETE',
          category: 'security',
          description: 'Deactivation failed - invalid password',
          ipAddress: ip,
          userAgent,
          status: 'failure',
        },
      });

      return addHeaders(
        apiResponse.validationError('Invalid password', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check 2FA if enabled
    const is2FAEnabled = await TwoFactorService.is2FAEnabled(userId);
    if (is2FAEnabled) {
      if (!twoFactorCode) {
        return addHeaders(
          apiResponse.validationError('2FA code required', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }

      const twoFactorResult = await TwoFactorService.verify(userId, twoFactorCode, ip);
      if (!twoFactorResult.success) {
        logger.warn('Deactivation failed - invalid 2FA code', { userId, requestId, ip });
        return addHeaders(
          apiResponse.validationError('Invalid 2FA code', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    // Calculate reactivation deadline (30 days)
    const reactivationDeadline = new Date();
    reactivationDeadline.setDate(reactivationDeadline.getDate() + 30);

    // Perform deactivation in transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate user
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Store deactivation reason in feedback
      if (reason || feedback) {
        await tx.feedback.create({
          data: {
            userId,
            type: 'deactivation',
            message: `Reason: ${reason || 'Not provided'}\n\nFeedback: ${feedback || 'None'}`,
            status: 'new',
          },
        });
      }

      // Invalidate all sessions
      await tx.activeSession.updateMany({
        where: { userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'account_deactivated',
        },
      });

      // Invalidate refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: 'account_deactivated',
        },
      });

      // Cancel subscription if active
      const subscription = await tx.subscription.findUnique({
        where: { userId },
      });

      if (subscription && subscription.status === 'ACTIVE') {
        await tx.subscription.update({
          where: { userId },
          data: {
            cancelAtPeriodEnd: true,
            cancelReason: 'account_deactivated',
            canceledAt: new Date(),
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETE',
          category: 'account',
          description: 'Account deactivated',
          newValue: {
            reason,
            reactivationDeadline: reactivationDeadline.toISOString(),
          },
          ipAddress: ip,
          userAgent,
          status: 'success',
        },
      });
    });

    // Send deactivation confirmation email
    try {
      if (user.email) {
        const { emailService } = await import('@/lib/email');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
        await emailService.send({
          to: user.email,
          subject: 'Your ProgressTracker account has been deactivated',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <h2>Account Deactivated</h2>
              <p>Your ProgressTracker account has been deactivated.</p>
              <p>Your data will be retained for 30 days until <strong>${reactivationDeadline.toLocaleDateString()}</strong>.</p>
              <p>To reactivate, log in before that date:</p>
              <a href="${appUrl}/auth/signin" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Reactivate Account</a>
            </div>
          `,
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send deactivation email', { userId, requestId, error: String(emailError) });
    }

    logger.info('Account deactivated', {
      userId,
      requestId,
      ip,
      reactivationDeadline: reactivationDeadline.toISOString(),
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: 'Account deactivated successfully',
        reactivationDeadline: reactivationDeadline.toISOString(),
        instructions: 'You have 30 days to reactivate your account by logging in. After that, your data will be permanently deleted.',
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST deactivate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to deactivate account', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Cancel Pending Deactivation (Reactivate)
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;
    const userAgent = request.headers.get('user-agent');

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const bodyValidation = cancelDeactivationSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { password } = bodyValidation.data;

    logger.info('Reactivation requested', { userId, requestId, ip });

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User', requestId), requestId, rateLimitResult);
    }

    if (user.isActive) {
      return addHeaders(
        apiResponse.validationError('Account is already active', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if within reactivation period (30 days)
    if (user.deletedAt) {
      const daysSinceDeactivation = Math.floor(
        (Date.now() - user.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDeactivation > 30) {
        return addHeaders(
          apiResponse.validationError(
            'Reactivation period has expired. Please create a new account.',
            undefined,
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }
    }

    // Verify password
    if (!user.password) {
      return addHeaders(
        apiResponse.validationError('Password not set', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Reactivation failed - invalid password', { userId, requestId, ip });
      return addHeaders(
        apiResponse.validationError('Invalid password', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Reactivate account
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          category: 'account',
          description: 'Account reactivated',
          ipAddress: ip,
          userAgent,
          status: 'success',
        },
      });
    });

    logger.info('Account reactivated', {
      userId,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: 'Account reactivated successfully',
        nextSteps: 'Your account is now active. You can continue using the platform.',
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE deactivate (reactivate) failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to reactivate account', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';