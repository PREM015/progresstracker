// src/app/api/auth/2fa/setup/route.ts
// Setup Two-Factor Authentication (TOTP)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticator } from '@/lib/totp';
import QRCode from 'qrcode';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { encrypt, decrypt } from '@/lib/crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 200;
const MAX_PAYLOAD_SIZE = 1024;
const APP_NAME = process.env.APP_NAME || 'CodeSync';

// Custom authenticator doesn't need global options

// =============================================================================
// SCHEMAS
// =============================================================================

const VerifySetupSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
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

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8 character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

// =============================================================================
// GET - Get 2FA Setup Status / Initialize Setup
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `2fa-setup:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        429,
        requestId
      );
    }

    // Get user and 2FA status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        twoFactorAuth: {
          select: {
            isEnabled: true,
            isPending: true,
            verifiedAt: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!user) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        404,
        requestId
      );
    }

    // Check if user has password (required for 2FA)
    if (!user.password) {
      return secureResponse(
        { 
          success: false, 
          error: 'Please set a password before enabling 2FA', 
          code: 'PASSWORD_REQUIRED' 
        },
        400,
        requestId
      );
    }

    // If 2FA is already enabled
    if (user.twoFactorAuth?.isEnabled) {
      await constantTimeDelay(start);
      return secureResponse(
        {
          success: true,
          isEnabled: true,
          isPending: false,
          verifiedAt: user.twoFactorAuth.verifiedAt,
          lastUsedAt: user.twoFactorAuth.lastUsedAt,
          message: 'Two-factor authentication is already enabled',
        },
        200,
        requestId
      );
    }

    // Generate new TOTP secret
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(
      user.email || user.id,
      APP_NAME,
      secret
    );

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Store pending 2FA setup (encrypted)
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      update: {
        secret: encrypt(secret),
        isPending: true,
        isEnabled: false,
        verifiedAt: null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        secret: encrypt(secret),
        isPending: true,
        isEnabled: false,
      },
    });

    logger.info('2FA setup initiated', { userId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        isEnabled: false,
        isPending: true,
        secret, // Only shown once during setup
        qrCode: qrCodeDataUrl,
        otpAuthUrl,
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('2FA setup GET error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Verify and Enable 2FA
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `2fa-verify-setup:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 5, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many attempts', code: 'RATE_LIMIT_EXCEEDED' },
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

    const parsed = VerifySetupSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid code format', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { code } = parsed.data;

    // Get pending 2FA setup
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return secureResponse(
        { success: false, error: 'No pending 2FA setup. Please initiate setup first.', code: 'NO_PENDING_SETUP' },
        400,
        requestId
      );
    }

    if (twoFactorAuth.isEnabled) {
      return secureResponse(
        { success: false, error: '2FA is already enabled', code: 'ALREADY_ENABLED' },
        400,
        requestId
      );
    }

    if (!twoFactorAuth.isPending) {
      return secureResponse(
        { success: false, error: 'No pending 2FA setup', code: 'NO_PENDING_SETUP' },
        400,
        requestId
      );
    }

    // Decrypt and verify the code
    const secret = decrypt(twoFactorAuth.secret);
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      logger.warn('Invalid 2FA setup code', { userId, ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid verification code', code: 'INVALID_CODE' },
        400,
        requestId
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(async (code) => {
        const bcrypt = await import('bcryptjs');
        return bcrypt.hash(code.replace('-', ''), 10);
      })
    );

    // Enable 2FA and create backup codes
    await prisma.$transaction(async (tx) => {
      // Update 2FA status
      await tx.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: true,
          isPending: false,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Delete old backup codes
      await tx.backupCode.deleteMany({ where: { userId } });

      // Create new backup codes
      await tx.backupCode.createMany({
        data: hashedBackupCodes.map((hashedCode) => ({
          userId,
          code: hashedCode,
        })),
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TWO_FACTOR_ENABLE',
          category: 'auth',
          entityType: 'two_factor_auth',
          entityId: twoFactorAuth.id,
          description: 'Two-factor authentication enabled',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    logger.info('2FA enabled successfully', { userId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: 'Two-factor authentication enabled successfully',
        backupCodes, // Only shown once!
        backupCodesCount: backupCodes.length,
        warning: 'Save these backup codes in a secure place. They will not be shown again.',
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('2FA setup POST error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// DELETE - Cancel Pending 2FA Setup
// =============================================================================

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
        401,
        requestId
      );
    }

    const userId = session.user.id;

    // Delete pending 2FA setup (only if not enabled)
    const result = await prisma.twoFactorAuth.deleteMany({
      where: {
        userId,
        isEnabled: false,
        isPending: true,
      },
    });

    if (result.count === 0) {
      return secureResponse(
        { success: false, error: 'No pending setup to cancel', code: 'NO_PENDING_SETUP' },
        404,
        requestId
      );
    }

    logger.info('2FA setup cancelled', { userId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'Two-factor authentication setup cancelled' },
      200,
      requestId
    );

  } catch (error) {
    logger.error('2FA setup DELETE error', { ip: clientIP, requestId }, error);
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

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';