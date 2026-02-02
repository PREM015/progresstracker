// src/app/api/user/2fa/route.ts
// =============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authenticator } from 'otplib';
import { encrypt, decrypt } from '@/lib/encryption';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const disable2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
  password: z.string().min(1, 'Password is required'),
});

const verify2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10; // 10 attempts per 5 minutes for 2FA
const BACKUP_CODES_COUNT = 10;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
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
  const rateLimitResult = await checkLimit(authRateLimiter, RATE_LIMIT, ip);

  if (!rateLimitResult.success) {
    logger.warn('2FA rate limit exceeded', { ip, requestId });
    return { error: apiResponse.rateLimited(300, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODES_COUNT }, () =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
}

async function createAuditLog(
  userId: string,
  action: 'TWO_FACTOR_ENABLE' | 'TWO_FACTOR_DISABLE',
  description: string,
  request: NextRequest
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      category: 'auth',
      description,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    },
  });
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
    logger.info('request is ', { request })

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
      select: { isEnabled: true, isPending: true },
    });

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-2FA-Enabled': String(twoFactorAuth?.isEnabled ?? false),
        'X-2FA-Pending': String(twoFactorAuth?.isPending ?? false),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD 2FA failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get 2FA status
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    logger.debug('Fetching 2FA status', { userId, requestId });

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: {
        isEnabled: true,
        isPending: true,
        verifiedAt: true,
        lastUsedAt: true,
        recoveryEmail: true,
        recoveryPhone: true,
        createdAt: true,
      },
    });

    const backupCodesCount = await prisma.backupCode.count({
      where: { userId, usedAt: null },
    });

    const totalBackupCodes = await prisma.backupCode.count({
      where: { userId },
    });

    logger.info('2FA status fetched', {
      userId,
      isEnabled: twoFactorAuth?.isEnabled ?? false,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        isEnabled: twoFactorAuth?.isEnabled ?? false,
        isPending: twoFactorAuth?.isPending ?? false,
        verifiedAt: twoFactorAuth?.verifiedAt,
        lastUsedAt: twoFactorAuth?.lastUsedAt,
        recoveryEmail: twoFactorAuth?.recoveryEmail
          ? '***' + twoFactorAuth.recoveryEmail.slice(-10)
          : null,
        recoveryPhone: twoFactorAuth?.recoveryPhone
          ? '***' + twoFactorAuth.recoveryPhone.slice(-4)
          : null,
        backupCodesRemaining: backupCodesCount,
        totalBackupCodes,
        createdAt: twoFactorAuth?.createdAt,
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
    logger.error('GET 2FA status failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch 2FA status', requestId), requestId);
  }
}

// =============================================================================
// POST - Enable/Setup 2FA
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId);

    const userId = session!.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true, name: true },
    });

    if (!user?.email) {
      logger.warn('2FA setup attempted without email', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Email required for 2FA setup', undefined, requestId),
        requestId
      );
    }

    // Check if already enabled
    const existing = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing?.isEnabled) {
      logger.warn('2FA already enabled', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('2FA is already enabled', undefined, requestId),
        requestId
      );
    }

    logger.info('Setting up 2FA', { userId, requestId });

    // Generate secret
    const secret = authenticator.generateSecret();
    const encryptedSecret = encrypt(secret);

    // Create or update 2FA record
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        isEnabled: false,
        isPending: true,
      },
      update: {
        secret: encryptedSecret,
        isEnabled: false,
        isPending: true,
        updatedAt: new Date(),
      },
    });

    // Generate QR code
    const appName = process.env.APP_NAME || 'ProgressTracker';
    const identifier = user.username || user.email;
    const otpAuthUrl = authenticator.keyuri(identifier, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Delete old backup codes and create new ones
    await prisma.backupCode.deleteMany({ where: { userId } });

    await prisma.backupCode.createMany({
      data: await Promise.all(
        backupCodes.map(async (code) => ({
          userId,
          code: await bcrypt.hash(code, 10),
        }))
      ),
    });

    logger.info('2FA setup initiated', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        qrCode: qrCodeDataUrl,
        secret, // Show only once - user should save this
        backupCodes, // Show only once - user should save these
        message: 'Scan the QR code with your authenticator app, then verify with a code',
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
    logger.error('POST 2FA setup failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to setup 2FA', requestId), requestId);
  }
}

// =============================================================================
// PUT - Verify and complete 2FA setup
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

    const validation = verify2FASchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { code } = validation.data;

    logger.debug('Verifying 2FA setup', { userId, requestId });

    // Get pending 2FA setup
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return addHeaders(
        apiResponse.validationError('No 2FA setup in progress', undefined, requestId),
        requestId
      );
    }

    if (twoFactorAuth.isEnabled) {
      return addHeaders(
        apiResponse.validationError('2FA is already enabled', undefined, requestId),
        requestId
      );
    }

    // Verify the code
    const decryptedSecret = decrypt(twoFactorAuth.secret);
    const isValidCode = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValidCode) {
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
        lastUsedAt: new Date(),
      },
    });

    await createAuditLog(userId, 'TWO_FACTOR_ENABLE', '2FA enabled successfully', request);

    logger.info('2FA enabled successfully', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: '2FA has been enabled successfully' },
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
    logger.error('PUT 2FA verify failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to verify 2FA', requestId), requestId);
  }
}

// =============================================================================
// DELETE - Disable 2FA
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

    const validation = disable2FASchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { code, password } = validation.data;

    logger.info('Attempting to disable 2FA', { userId, requestId });

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      return addHeaders(
        apiResponse.validationError('Password verification required', undefined, requestId),
        requestId
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.warn('Invalid password for 2FA disable', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Invalid password', undefined, requestId),
        requestId
      );
    }

    // Get 2FA record
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth?.isEnabled) {
      return addHeaders(
        apiResponse.validationError('2FA is not enabled', undefined, requestId),
        requestId
      );
    }

    // Verify 2FA code or backup code
    const decryptedSecret = decrypt(twoFactorAuth.secret);
    let isValidCode = authenticator.verify({
      token: code,
      secret: decryptedSecret,
    });

    if (!isValidCode) {
      // Check backup codes
      const backupCodes = await prisma.backupCode.findMany({
        where: { userId, usedAt: null },
      });

      for (const backupCode of backupCodes) {
        const isMatch = await bcrypt.compare(code, backupCode.code);
        if (isMatch) {
          isValidCode = true;
          // Mark backup code as used
          await prisma.backupCode.update({
            where: { id: backupCode.id },
            data: {
              usedAt: new Date(),
              usedIpAddress: getClientIp(request),
            },
          });
          break;
        }
      }
    }

    if (!isValidCode) {
      logger.warn('Invalid 2FA code for disable', { userId, requestId });
      return addHeaders(
        apiResponse.validationError('Invalid 2FA code', undefined, requestId),
        requestId
      );
    }

    // Disable 2FA
    await prisma.twoFactorAuth.delete({
      where: { userId },
    });

    // Delete backup codes
    await prisma.backupCode.deleteMany({
      where: { userId },
    });

    await createAuditLog(userId, 'TWO_FACTOR_DISABLE', '2FA disabled', request);

    logger.info('2FA disabled successfully', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      { message: '2FA has been disabled' },
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
    logger.error('DELETE 2FA failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to disable 2FA', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';