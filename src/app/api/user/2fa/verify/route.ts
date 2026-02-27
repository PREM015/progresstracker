// src/app/api/user/2fa/verify/route.ts
// =============================================================================
// 2FA VERIFICATION ROUTE
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authenticator } from 'otplib';
import { decrypt } from '@/lib/encryption';
import { z } from 'zod';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// SCHEMAS
// =============================================================================

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 5;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// =============================================================================
// POST - Verify 2FA code
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(authRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(300, requestId), requestId);
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const userId = session.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON', undefined, requestId), requestId);
    }

    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid code format', validation.error.errors, requestId),
        requestId
      );
    }

    const { code } = validation.data;

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return addHeaders(
        apiResponse.validationError('2FA not set up', undefined, requestId),
        requestId
      );
    }

    if (twoFactorAuth.isEnabled && !twoFactorAuth.isPending) {
      return addHeaders(
        apiResponse.validationError('2FA is already verified and enabled', undefined, requestId),
        requestId
      );
    }

    // Decrypt and verify
    const decryptedSecret = decrypt(twoFactorAuth.secret);
    const isValid = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValid) {
      logger.warn('Invalid 2FA verification code', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Invalid verification code', undefined, requestId),
        requestId
      );
    }

    // Enable 2FA
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: true,
        isPending: false,
        verifiedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TWO_FACTOR_ENABLE',
        category: 'auth',
        description: '2FA enabled and verified',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
      },
    });

    logger.info('2FA verified and enabled', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: '2FA has been successfully enabled' },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('POST 2FA verify failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to verify 2FA', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';