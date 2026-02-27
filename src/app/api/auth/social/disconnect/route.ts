// src/app/api/auth/social/disconnect/route.ts
// Disconnect a social account from user

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 200;
const MAX_PAYLOAD_SIZE = 1024;

const SUPPORTED_PROVIDERS = ['google', 'github', 'discord', 'twitter'] as const;

// =============================================================================
// SCHEMAS
// =============================================================================

const DisconnectSocialSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  password: z.string().min(1).max(128).optional(), // Required if it's the last auth method
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
// POST - Disconnect social account
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
    const rateLimitKey = `social-disconnect:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 10, rateLimitKey);

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

    const parsed = DisconnectSocialSchema.safeParse(body);
    if (!parsed.success) {
      return secureResponse(
        { success: false, error: 'Invalid provider', code: 'VALIDATION_ERROR' },
        400,
        requestId
      );
    }

    const { provider, password } = parsed.data;

    // Get user with accounts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        accounts: {
          select: {
            id: true,
            provider: true,
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

    // Find the account to disconnect
    const accountToDisconnect = user.accounts.find((acc) => acc.provider === provider);

    if (!accountToDisconnect) {
      return secureResponse(
        { success: false, error: `${provider} account is not connected`, code: 'NOT_CONNECTED' },
        404,
        requestId
      );
    }

    // Check if this is the last authentication method
    const hasPassword = !!user.password;
    const otherAccounts = user.accounts.filter((acc) => acc.provider !== provider);
    const hasOtherAuth = hasPassword || otherAccounts.length > 0;

    if (!hasOtherAuth) {
      return secureResponse(
        {
          success: false,
          error: 'Cannot disconnect the last authentication method. Please set a password or connect another account first.',
          code: 'LAST_AUTH_METHOD',
        },
        400,
        requestId
      );
    }

    // If user has password, verify it before disconnecting (extra security)
    if (hasPassword && !password) {
      return secureResponse(
        { success: false, error: 'Password required to disconnect account', code: 'PASSWORD_REQUIRED' },
        400,
        requestId
      );
    }

    if (hasPassword && password) {
      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password!);
      
      if (!isValidPassword) {
        logger.warn('Social disconnect failed - invalid password', { userId, provider, ip: clientIP, requestId });
        await constantTimeDelay(start);
        return secureResponse(
          { success: false, error: 'Incorrect password', code: 'INVALID_PASSWORD' },
          401,
          requestId
        );
      }
    }

    // Disconnect the account
    await prisma.$transaction(async (tx) => {
      await tx.account.delete({
        where: { id: accountToDisconnect.id },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          category: 'auth',
          entityType: 'account',
          entityId: accountToDisconnect.id,
          description: `Disconnected ${provider} account`,
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
          oldValue: { provider },
        },
      });
    });

    logger.info('Social account disconnected', {
      userId,
      provider,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: `${provider} account disconnected successfully`,
        remainingAccounts: otherAccounts.map((acc) => acc.provider),
        hasPassword,
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Disconnect social account error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// DELETE - Alternative method for disconnecting
// =============================================================================

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  // Redirect to POST handler
  return POST(req);
}

// =============================================================================
// OTHER METHODS
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed. Use GET /api/auth/social/connect to list accounts', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PUT(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function PATCH(): Promise<NextResponse> {
  return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
}

export async function OPTIONS(): Promise<NextResponse> {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';