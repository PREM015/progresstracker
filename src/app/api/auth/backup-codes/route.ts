// src/app/api/auth/backup-codes/route.ts
// Manage backup codes for 2FA recovery

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { emailService } from '@/lib/email';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 200;
const MAX_PAYLOAD_SIZE = 1024;
const BACKUP_CODES_COUNT = 10;

// =============================================================================
// SCHEMAS
// =============================================================================

const RegenerateSchema = z.object({
  password: z.string().min(1, 'Password is required').max(128),
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

function generateBackupCodes(count: number = BACKUP_CODES_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

// =============================================================================
// GET - Get Backup Codes Status
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

    // Check if 2FA is enabled
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });

    if (!twoFactorAuth?.isEnabled) {
      return secureResponse(
        { success: false, error: '2FA is not enabled', code: '2FA_NOT_ENABLED' },
        400,
        requestId
      );
    }

    // Get backup codes status
    const [totalCodes, usedCodes] = await Promise.all([
      prisma.backupCode.count({ where: { userId } }),
      prisma.backupCode.count({ where: { userId, usedAt: { not: null } } }),
    ]);

    const remainingCodes = totalCodes - usedCodes;

    // Get recently used codes (for display)
    const recentlyUsed = await prisma.backupCode.findMany({
      where: { userId, usedAt: { not: null } },
      orderBy: { usedAt: 'desc' },
      take: 5,
      select: {
        usedAt: true,
        usedIpAddress: true,
      },
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        totalCodes,
        usedCodes,
        remainingCodes,
        recentlyUsed: recentlyUsed.map((code) => ({
          usedAt: code.usedAt,
          ipAddress: code.usedIpAddress ? `${code.usedIpAddress.slice(0, 8)}...` : null,
        })),
        warning: remainingCodes <= 2 ? 'You are running low on backup codes. Consider regenerating.' : null,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get backup codes error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Regenerate Backup Codes
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
    const rateLimitKey = `backup-codes:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 3, rateLimitKey);

    if (!rateLimitResult.success) {
      await constantTimeDelay(start);
      return secureResponse(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
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

    const parsed = RegenerateSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Password is required', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { password } = parsed.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        twoFactorAuth: {
          select: { isEnabled: true },
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
      logger.warn('Backup codes regenerate failed - invalid password', { userId, ip: clientIP, requestId });
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

    // Generate new backup codes
    const newCodes = generateBackupCodes(BACKUP_CODES_COUNT);
    const hashedCodes = await Promise.all(
      newCodes.map(async (code) => {
        return bcrypt.hash(code.replace('-', ''), 10);
      })
    );

    // Replace old codes with new ones
    await prisma.$transaction(async (tx) => {
      // Delete old codes
      await tx.backupCode.deleteMany({ where: { userId } });

      // Create new codes
      await tx.backupCode.createMany({
        data: hashedCodes.map((hashedCode) => ({
          userId,
          code: hashedCode,
        })),
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          category: 'auth',
          entityType: 'backup_codes',
          description: 'Backup codes regenerated',
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
        },
      });
    });

    // Send notification email
    if (user.email) {
      const emailResult = await emailService.sendBackupCodesGenerated(user.email, {
        ipAddress: clientIP,
        generatedAt: new Date().toISOString(),
        codesCount: BACKUP_CODES_COUNT,
      });
      if (!emailResult.success) {
        console.error(`[BACKUP-CODES] ❌ Failed to send backup codes notification:`, emailResult.error);
        logger.error('Failed to send backup codes notification', { userId, requestId, error: emailResult.error });
      } else {
        console.log(`[BACKUP-CODES] ✅ Backup codes notification sent to ${user.email}`);
      }
    }

    logger.info('Backup codes regenerated', { userId, ip: clientIP, requestId });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: 'Backup codes regenerated successfully',
        codes: newCodes,
        codesCount: newCodes.length,
        warning: 'Save these codes in a secure place. They will not be shown again.',
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Regenerate backup codes error', { ip: clientIP, requestId }, error);
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
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
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