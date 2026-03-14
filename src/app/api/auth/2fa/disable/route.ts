/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/auth/2fa/disable/route.ts
// Disable Two-Factor Authentication

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { decrypt } from '@/lib/crypto';
import { emailService } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 1024;

// =============================================================================
// SCHEMAS
// =============================================================================

const Disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required').max(128),
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code is too long')
    .optional(),
  useBackupCode: z.boolean().optional().default(false),
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

// =============================================================================
// POST - Disable 2FA
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
    const rateLimitKey = `2fa-disable:${userId}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 3, rateLimitKey);

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

    const parsed = Disable2FASchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid request', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { password, code, useBackupCode } = parsed.data;

    // Get user with 2FA
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        twoFactorAuth: {
          select: {
            id: true,
            secret: true,
            isEnabled: true,
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

    if (!user.password) {
      return secureResponse(
        { success: false, error: 'Password not set', code: 'NO_PASSWORD' },
        400,
        requestId
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('2FA disable failed - invalid password', { userId, ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Incorrect password', code: 'INVALID_PASSWORD' },
        401,
        requestId
      );
    }

    // Check if 2FA is enabled
    if (!user.twoFactorAuth?.isEnabled) {
      return secureResponse(
        { success: false, error: '2FA is not enabled', code: '2FA_NOT_ENABLED' },
        400,
        requestId
      );
    }

    // Verify 2FA code or backup code
    let isCodeValid = false;

    if (code) {
      if (useBackupCode) {
        // Verify backup code
        const normalizedCode = code.replace('-', '').toUpperCase();
        const backupCodes = await prisma.backupCode.findMany({
          where: { userId, usedAt: null },
        });

        for (const backupCode of backupCodes) {
          const matches = await bcrypt.compare(normalizedCode, backupCode.code);
          if (matches) {
            isCodeValid = true;
            break;
          }
        }
      } else {
        // Verify TOTP code
        const secret = decrypt(user.twoFactorAuth.secret);
        isCodeValid = authenticator.verify({ token: code, secret });
      }

      if (!isCodeValid) {
        logger.warn('2FA disable failed - invalid code', { userId, ip: clientIP, requestId });
        await constantTimeDelay(start);
        return secureResponse(
          { success: false, error: 'Invalid verification code', code: 'INVALID_CODE' },
          401,
          requestId
        );
      }
    }

    // Disable 2FA
    await prisma.$transaction(async (tx) => {
      // Delete 2FA record
      await tx.twoFactorAuth.delete({
        where: { userId },
      });

      // Delete all backup codes
      await tx.backupCode.deleteMany({
        where: { userId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TWO_FACTOR_DISABLE',
          category: 'auth',
          entityType: 'two_factor_auth',
          entityId: user.twoFactorAuth!.id,
          description: 'Two-factor authentication disabled',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    // Send notification email
    if (user.email) {
      const emailResult = await emailService.sendTwoFactorDisabled(user.email, {
        userName: user.name || 'there',
        ipAddress: clientIP,
        disabledAt: new Date().toISOString(),
      });
      if (!emailResult.success) {
        console.error(`[2FA-DISABLE] ❌ Failed to send 2FA disabled email:`, emailResult.error);
        logger.error('Failed to send 2FA disabled notification', { userId, requestId, error: emailResult.error });
      } else {
        console.log(`[2FA-DISABLE] ✅ 2FA disabled notification sent to ${user.email}`);
      }
    }

    logger.info('2FA disabled', { userId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      { success: true, message: 'Two-factor authentication has been disabled' },
      200,
      requestId
    );

  } catch (error) {
    logger.error('2FA disable error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// GET - Check 2FA Status
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

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
      select: {
        isEnabled: true,
        isPending: true,
        verifiedAt: true,
        lastUsedAt: true,
      },
    });

    const backupCodesCount = twoFactorAuth?.isEnabled
      ? await prisma.backupCode.count({
        where: { userId: session.user.id, usedAt: null },
      })
      : 0;

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        isEnabled: twoFactorAuth?.isEnabled || false,
        isPending: twoFactorAuth?.isPending || false,
        verifiedAt: twoFactorAuth?.verifiedAt,
        lastUsedAt: twoFactorAuth?.lastUsedAt,
        backupCodesRemaining: backupCodesCount,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('2FA status check error', { ip: clientIP, requestId }, error);
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
  return secureResponse({ error: 'Method not allowed. Use POST to disable 2FA.', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';