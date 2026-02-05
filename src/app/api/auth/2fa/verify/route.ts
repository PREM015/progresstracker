// src/app/api/auth/2fa/verify/route.ts
// Verify 2FA code during login

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { signJwt } from '@/lib/jwt';
import { authRateLimiter, checkLimit } from '@/lib/rateLimit';
import { decrypt } from '@/lib/crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 300;
const MAX_PAYLOAD_SIZE = 1024;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// Configure authenticator
authenticator.options = {
  window: 1,
};

// =============================================================================
// SCHEMAS
// =============================================================================

const Verify2FASchema = z.object({
  tempToken: z.string().min(64).max(128),
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code is too long'),
  isBackupCode: z.boolean().optional().default(false),
  rememberDevice: z.boolean().optional().default(false),
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

function parseUserAgent(userAgent: string | null): { device: string; browser: string; os: string } {
  if (!userAgent) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);

  let browser = 'Unknown';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

  return {
    device: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop',
    browser,
    os,
  };
}

// =============================================================================
// POST - Verify 2FA Code
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent');
  const deviceInfo = parseUserAgent(userAgent);

  try {
    // Rate limiting
    const rateLimitKey = `2fa-verify:${clientIP}`;
    const rateLimitResult = await checkLimit(authRateLimiter, 5, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
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

    const parsed = Verify2FASchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid request', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { tempToken, code, isBackupCode, rememberDevice } = parsed.data;
    const tempTokenHash = hashToken(tempToken);

    // Find the temporary token
    const tempTokenRecord = await prisma.passwordReset.findUnique({
      where: { token: tempTokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            image: true,
            role: true,
            isAdmin: true,
            isActive: true,
            isBanned: true,
            twoFactorAuth: {
              select: {
                id: true,
                secret: true,
                isEnabled: true,
              },
            },
          },
        },
      },
    });

    // Validate token
    if (!tempTokenRecord) {
      logger.warn('Invalid 2FA temp token', { ip: clientIP, requestId });
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid or expired session. Please login again.', code: 'INVALID_TOKEN' },
        401,
        requestId
      );
    }

    if (tempTokenRecord.usedAt) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Session already used. Please login again.', code: 'TOKEN_USED' },
        401,
        requestId
      );
    }

    if (tempTokenRecord.expiresAt < new Date()) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Session expired. Please login again.', code: 'TOKEN_EXPIRED' },
        401,
        requestId
      );
    }

    const user = tempTokenRecord.user;

    if (!user || !user.isActive || user.isBanned) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Account not available', code: 'ACCOUNT_INACTIVE' },
        403,
        requestId
      );
    }

    if (!user.twoFactorAuth?.isEnabled) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: '2FA is not enabled for this account', code: '2FA_NOT_ENABLED' },
        400,
        requestId
      );
    }

    let isValid = false;
    let usedBackupCode = false;

    if (isBackupCode) {
      // Verify backup code
      const normalizedCode = code.replace('-', '').toUpperCase();
      
      const backupCodes = await prisma.backupCode.findMany({
        where: { userId: user.id, usedAt: null },
      });

      for (const backupCode of backupCodes) {
        const matches = await bcrypt.compare(normalizedCode, backupCode.code);
        if (matches) {
          // Mark backup code as used
          await prisma.backupCode.update({
            where: { id: backupCode.id },
            data: { usedAt: new Date(), usedIpAddress: clientIP },
          });
          isValid = true;
          usedBackupCode = true;
          break;
        }
      }
    } else {
      // Verify TOTP code
      const secret = decrypt(user.twoFactorAuth.secret);
      isValid = authenticator.verify({ token: code, secret });
    }

    if (!isValid) {
      logger.warn('Invalid 2FA code', { userId: user.id, isBackupCode, ip: clientIP, requestId });

      // Record failed attempt
      await prisma.loginAttempt.create({
        data: {
          userId: user.id,
          email: user.email!,
          success: false,
          failureReason: isBackupCode ? '2fa_backup_invalid' : '2fa_code_invalid',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          twoFactorRequired: true,
          twoFactorPassed: false,
        },
      });

      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Invalid verification code', code: 'INVALID_CODE' },
        401,
        requestId
      );
    }

    // Generate tokens
    const accessToken = signJwt({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    // Complete login
    await prisma.$transaction(async (tx) => {
      // Mark temp token as used
      await tx.passwordReset.update({
        where: { id: tempTokenRecord.id },
        data: { usedAt: new Date() },
      });

      // Update 2FA last used
      await tx.twoFactorAuth.update({
        where: { id: user.twoFactorAuth!.id },
        data: { lastUsedAt: new Date() },
      });

      // Create refresh token
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenHash,
          family: tokenFamily,
          expiresAt: refreshExpiresAt,
          isValid: true,
        },
      });

      // Create active session
      await tx.activeSession.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          userAgent,
          ipAddress: clientIP,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          isValid: true,
          isCurrent: true,
          expiresAt: refreshExpiresAt,
          lastActiveAt: new Date(),
        },
      });

      // Update user login timestamp
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      // Record successful login
      await tx.loginAttempt.create({
        data: {
          userId: user.id,
          email: user.email!,
          success: true,
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          twoFactorRequired: true,
          twoFactorPassed: true,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          category: 'auth',
          description: `2FA login successful${usedBackupCode ? ' (backup code)' : ''}`,
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    // Check remaining backup codes if one was used
    let backupCodesRemaining: number | undefined;
    if (usedBackupCode) {
      backupCodesRemaining = await prisma.backupCode.count({
        where: { userId: user.id, usedAt: null },
      });
    }

    logger.info('2FA login successful', {
      userId: user.id,
      usedBackupCode,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
          role: user.role,
          isAdmin: user.isAdmin,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: refreshExpiresAt.toISOString(),
        },
        ...(usedBackupCode && {
          warning: `Backup code used. ${backupCodesRemaining} codes remaining.`,
          backupCodesRemaining,
        }),
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('2FA verify error', { ip: clientIP, requestId }, error);
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

export async function GET(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

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
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';