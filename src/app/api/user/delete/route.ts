// src/app/api/user/delete/route.ts
// =============================================================================
// PERMANENT ACCOUNT DELETION ROUTES
// =============================================================================
// Description: Permanently delete user account and all associated data
// Methods: POST, DELETE, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 3 requests/day
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
import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 3; // Very strict - 3 per day
const CONFIRMATION_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

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

// In-memory store for deletion tokens (in production, use Redis)
const deletionTokens = new Map<string, { userId: string; expiresAt: Date }>();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const requestDeletionSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().length(6).optional(),
  confirmPhrase: z.literal('DELETE MY ACCOUNT'),
  reason: z.string().max(500).optional(),
  feedback: z.string().max(1000).optional(),
});

const confirmDeletionSchema = z.object({
  token: z.string().min(1, 'Confirmation token is required'),
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
  const rateLimitKey = session?.user?.id ? `delete:${session.user.id}` : `delete:${ip}`;
  const rateLimitResult = await checkLimit(authRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for deletion', { ip, requestId });
    return {
      error: apiResponse.rateLimited(86400, requestId), // 24 hour cooldown
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

function generateDeletionToken(userId: string): string {
  const token = nanoid(64);
  const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_EXPIRY);
  deletionTokens.set(token, { userId, expiresAt });

  // Cleanup expired tokens
  for (const [key, value] of deletionTokens.entries()) {
    if (value.expiresAt < new Date()) {
      deletionTokens.delete(key);
    }
  }

  return token;
}

function validateDeletionToken(token: string, userId: string): boolean {
  const data = deletionTokens.get(token);
  if (!data) return false;
  if (data.userId !== userId) return false;
  if (data.expiresAt < new Date()) {
    deletionTokens.delete(token);
    return false;
  }
  return true;
}

function consumeDeletionToken(token: string): void {
  deletionTokens.delete(token);
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
// HEAD - Check Deletion Status
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    // Check if user has pending deletion token
    let hasPendingDeletion = false;
    for (const [, value] of deletionTokens.entries()) {
      if (value.userId === session.user.id && value.expiresAt > new Date()) {
        hasPendingDeletion = true;
        break;
      }
    }

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Pending-Deletion': String(hasPendingDeletion),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD delete failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// POST - Request Account Deletion (Step 1: Generate Token)
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

    const bodyValidation = requestDeletionSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { password, twoFactorCode, reason, feedback } = bodyValidation.data;

    logger.warn('Account deletion requested', { userId, requestId, ip });

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        email: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User', requestId), requestId, rateLimitResult);
    }

    // Prevent admin deletion via API
    if (user.isAdmin) {
      return addHeaders(
        apiResponse.forbidden('Admin accounts cannot be deleted via API', requestId),
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
      logger.warn('Deletion request failed - invalid password', { userId, requestId, ip });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETE',
          category: 'security',
          description: 'Deletion request failed - invalid password',
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
        logger.warn('Deletion request failed - invalid 2FA code', { userId, requestId, ip });
        return addHeaders(
          apiResponse.validationError('Invalid 2FA code', undefined, requestId),
          requestId,
          rateLimitResult
        );
      }
    }

    // Generate deletion token
    const deletionToken = generateDeletionToken(userId);

    // Store feedback
    if (reason || feedback) {
      await prisma.feedback.create({
        data: {
          userId,
          type: 'deletion_request',
          message: `Reason: ${reason || 'Not provided'}\n\nFeedback: ${feedback || 'None'}`,
          status: 'new',
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ACCOUNT_DELETE',
        category: 'account',
        description: 'Deletion token generated - awaiting confirmation',
        newValue: { reason },
        ipAddress: ip,
        userAgent,
        status: 'success',
      },
    });

    // TODO: Send deletion confirmation email with token
    // await sendDeletionConfirmationEmail(user.email, deletionToken);

    logger.info('Deletion token generated', {
      userId,
      requestId,
      ip,
      expiresIn: '30 minutes',
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: 'Deletion request received. Please confirm within 30 minutes.',
        token: deletionToken, // In production, send via email only
        expiresAt: new Date(Date.now() + CONFIRMATION_TOKEN_EXPIRY).toISOString(),
        warning: 'This action is IRREVERSIBLE. All your data will be permanently deleted.',
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST delete request failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to process deletion request', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Confirm and Execute Permanent Deletion (Step 2)
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

    const bodyValidation = confirmDeletionSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { token, password } = bodyValidation.data;

    logger.warn('Account deletion confirmation', { userId, requestId, ip });

    // Validate token
    if (!validateDeletionToken(token, userId)) {
      logger.warn('Invalid or expired deletion token', { userId, requestId, ip });
      return addHeaders(
        apiResponse.validationError('Invalid or expired deletion token', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        email: true,
        username: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return addHeaders(apiResponse.notFound('User', requestId), requestId, rateLimitResult);
    }

    // Verify password again
    if (!user.password) {
      return addHeaders(
        apiResponse.validationError('Password not set', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Deletion confirmation failed - invalid password', { userId, requestId, ip });
      return addHeaders(
        apiResponse.validationError('Invalid password', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Consume the token
    consumeDeletionToken(token);

    // Perform permanent deletion in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all user-related data
      // Order matters due to foreign key constraints

      // 1. Delete notifications
      await tx.notification.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });

      // 2. Delete tracker data
      await tx.trackerEntry.deleteMany({ where: { userId } });
      await tx.dailyStats.deleteMany({ where: { userId } });
      await tx.streakHistory.deleteMany({ where: { userId } });

      // 3. Delete goals
      await tx.goalReminder.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });

      // 4. Delete achievements
      await tx.userAchievement.deleteMany({ where: { userId } });

      // 5. Delete platform connections
      await tx.syncLog.deleteMany({ where: { userId } });
      await tx.userPlatform.deleteMany({ where: { userId } });
      await tx.customPlatform.deleteMany({ where: { userId } });

      // 6. Delete export jobs
      await tx.exportJob.deleteMany({ where: { userId } });
      await tx.scheduledExport.deleteMany({ where: { userId } });

      // 7. Delete support tickets
      await tx.ticketReply.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.feedback.deleteMany({ where: { userId } });

      // 8. Delete billing data (keep invoices for legal reasons, anonymize)
      await tx.paymentMethod.deleteMany({ where: { userId } });
      await tx.paymentEvent.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // 9. Delete subscription
      await tx.subscription.deleteMany({ where: { userId } });

      // 10. Delete reports
      await tx.report.deleteMany({ where: { userId } });

      // 11. Delete API keys
      await tx.apiKey.deleteMany({ where: { userId } });

      // 12. Delete security data
      await tx.backupCode.deleteMany({ where: { userId } });
      await tx.twoFactorAuth.deleteMany({ where: { userId } });
      await tx.passwordReset.deleteMany({ where: { userId } });
      await tx.emailVerification.deleteMany({ where: { userId } });
      await tx.emailChangeRequest.deleteMany({ where: { userId } });
      await tx.loginAttempt.deleteMany({ where: { userId } });

      // 13. Delete sessions
      await tx.activeSession.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });

      // 14. Delete settings
      await tx.userSettings.deleteMany({ where: { userId } });
      await tx.notificationPreferences.deleteMany({ where: { userId } });

      // 15. Delete accounts (OAuth)
      await tx.account.deleteMany({ where: { userId } });

      // 16. Create final audit log entry before deletion
      await tx.auditLog.create({
        data: {
          action: 'ACCOUNT_DELETE',
          category: 'account',
          description: `Account permanently deleted: ${user.email}`,
          ipAddress: ip,
          userAgent,
          status: 'success',
        },
      });

      // 17. Delete audit logs (after creating final entry)
      await tx.auditLog.deleteMany({ where: { userId } });

      // 18. Finally, delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    logger.warn('Account permanently deleted', {
      email: user.email,
      username: user.username,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    // TODO: Send deletion confirmation email
    // await sendDeletionCompleteEmail(user.email);

    const response = apiResponse.success(
      {
        message: 'Account permanently deleted',
        note: 'All your data has been removed from our systems.',
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE account failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete account', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';