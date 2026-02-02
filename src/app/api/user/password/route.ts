// src/app/api/user/password/route.ts
// =============================================================================
// USER PASSWORD MANAGEMENT ROUTES
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { hash, compare } from 'bcryptjs';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { AuditAction } from "@prisma/client";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const setPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
   .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 5; // 5 attempts per 5 minutes for password operations

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const session = await getServerSession(authOptions);
  const key = session?.user?.id ? `pwd:${session.user.id}` : `pwdip:${ip}`;

  const rateLimitResult = await checkLimit(authRateLimiter, RATE_LIMIT, key);

  if (!rateLimitResult.success) {
    logger.warn('Rate limit exceeded for password operation', { key, requestId });
    return {
      error: apiResponse.rateLimited(300, requestId), // 5 minute cooldown
      session: null,
      rateLimitResult,
    };
  }



  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

async function createAuditLog(
  userId: string,
  action: AuditAction,
  description: string,
  request: NextRequest,
  extra?: Partial<{
    category: string;
    entityType: string;
    entityId: string;
    oldValue: any;
    newValue: any;
    changes: any;
    status: "success" | "failure";
    errorMessage: string;
  }>
) {
  const ip = getClientIp(request);

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        category: extra?.category ?? "auth",
        description,

        entityType: extra?.entityType,
        entityId: extra?.entityId,

        oldValue: extra?.oldValue,
        newValue: extra?.newValue,
        changes: extra?.changes,

        ipAddress: ip,
        userAgent: request.headers.get("user-agent") ?? undefined,

      requestId: request.headers.get("x-request-id") ?? request.headers.get("X-Request-ID") ?? undefined,

        requestPath: new URL(request.url).pathname,
        requestMethod: request.method,

        status: extra?.status ?? "success",
        errorMessage: extra?.errorMessage,
      },
    });
  } catch (err) {
    // audit log should NEVER break main flow
    logger.warn("audit log failed", {
      err,
      userId,
      action,
    });
  }
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(request: NextRequest) {
  const requestId = generateRequestId();
  logger.info('request is ', { request })
  return addHeaders(
    new NextResponse(null, { status: 204, headers: CORS_HEADERS }),
    requestId
  );
}

// =============================================================================
// HEAD
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
      select: { password: true, passwordChangedAt: true },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Has-Password': user?.password ? 'true' : 'false',
        'X-Password-Changed': user?.passwordChangedAt?.toISOString() || 'never',
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD password failed', { requestId }, error);
    logger.info('request is ', { request })
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Check password status
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();


  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        passwordChangedAt: true,
      },
    });

    logger.debug('Password status checked', {
      userId,
      requestId,
      hasPassword: !!user?.password,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        hasPassword: !!user?.password,
        passwordChangedAt: user?.passwordChangedAt,
        requiresPassword: !user?.password,
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET password status failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to check password status', requestId), requestId);
  }
}

// =============================================================================
// POST - Change password (for users with existing password)
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Password change validation failed', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      logger.warn('Password change attempted without existing password', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('No password set. Use PUT to set password.', undefined, requestId),
        requestId
      );
    }

    const isValidPassword = await compare(currentPassword, user.password);
    if (!isValidPassword) {
      logger.warn('Invalid current password', { userId, requestId });
      await createAuditLog(
        userId,
        AuditAction.PASSWORD_CHANGE,
        'Password change failed - invalid current password',
        request,
        { status: "failure" }
      );

      return addHeaders(
        apiResponse.validationError('Current password is incorrect', undefined, requestId),
        requestId
      );
    }

    const isSamePassword = await compare(newPassword, user.password);
    if (isSamePassword) {
      return addHeaders(
        apiResponse.validationError('New password must be different from current password', undefined, requestId),
        requestId
      );
    }

    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.$transaction([
      prisma.activeSession.updateMany({
        where: { userId, isValid: true },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: "password_changed",
          isCurrent: false,
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, isValid: true },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: "password_changed",
        },
      }),
    ]);

    await createAuditLog(
      userId,
      AuditAction.PASSWORD_CHANGE,
      'Password changed successfully',
      request,
      { status: "success" }
    );

    logger.info('Password changed', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Password changed successfully. Other sessions have been logged out.' },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST password change failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to change password', requestId), requestId);
  }
}

// =============================================================================
// PUT - Set password (for OAuth users without password)
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = setPasswordSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Password set validation failed', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { newPassword } = validation.data;

    // Check if user already has password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (user?.password) {
      logger.warn('Password set attempted with existing password', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Password already set. Use POST to change password.', undefined, requestId),
        requestId
      );
    }

    // Hash and set password
    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  await createAuditLog(
  userId,
  AuditAction.PASSWORD_CHANGE,
  'Password set for OAuth user',
  request,
  { status: "success" }
);


    logger.info('Password set', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: 'Password set successfully' },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('PUT password set failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to set password', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';