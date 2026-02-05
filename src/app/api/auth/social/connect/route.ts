// src/app/api/auth/social/connect/route.ts
// Connect a social account to existing user

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import crypto from 'crypto';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { encrypt } from '@/lib/crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONSTANT_TIME_MS = 200;
const MAX_PAYLOAD_SIZE = 4096;

const SUPPORTED_PROVIDERS = ['google', 'github', 'discord', 'twitter'] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

// =============================================================================
// SCHEMAS
// =============================================================================

const ConnectSocialSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  providerAccountId: z.string().min(1).max(255),
  accessToken: z.string().min(1).max(2048).optional(),
  refreshToken: z.string().min(1).max(2048).optional(),
  expiresAt: z.number().optional(),
  tokenType: z.string().optional(),
  scope: z.string().optional(),
  providerUsername: z.string().max(255).optional(),
  providerEmail: z.string().email().optional(),
  providerAvatar: z.string().url().optional(),
  providerProfileUrl: z.string().url().optional(),
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
// GET - List connected social accounts
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

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        providerUsername: true,
        providerEmail: true,
        providerAvatar: true,
        providerProfileUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        accounts: accounts.map((acc) => ({
          id: acc.id,
          provider: acc.provider,
          providerAccountId: acc.providerAccountId,
          username: acc.providerUsername,
          email: acc.providerEmail,
          avatar: acc.providerAvatar,
          profileUrl: acc.providerProfileUrl,
          connectedAt: acc.createdAt,
        })),
        availableProviders: SUPPORTED_PROVIDERS.filter(
          (p) => !accounts.some((a) => a.provider === p)
        ),
      },
      200,
      requestId
    );

  } catch (error) {
    logger.error('Get connected accounts error', { ip: clientIP, requestId }, error);
    await constantTimeDelay(start);
    return secureResponse(
      { success: false, error: 'Something went wrong', code: 'INTERNAL_ERROR' },
      500,
      requestId
    );
  }
}

// =============================================================================
// POST - Connect social account
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
    const rateLimitKey = `social-connect:${userId}`;
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

    const parsed = ConnectSocialSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return secureResponse(
        { success: false, error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors },
        400,
        requestId
      );
    }

    const data = parsed.data;

    // Check if this provider is already connected to current user
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId,
        provider: data.provider,
      },
    });

    if (existingAccount) {
      return secureResponse(
        { success: false, error: `${data.provider} account is already connected`, code: 'ALREADY_CONNECTED' },
        409,
        requestId
      );
    }

    // Check if this social account is connected to another user
    const accountOnOtherUser = await prisma.account.findFirst({
      where: {
        provider: data.provider,
        providerAccountId: data.providerAccountId,
      },
    });

    if (accountOnOtherUser) {
      return secureResponse(
        { success: false, error: 'This social account is already linked to another user', code: 'ACCOUNT_LINKED_TO_OTHER' },
        409,
        requestId
      );
    }

    // Create account connection
    const account = await prisma.$transaction(async (tx) => {
      const newAccount = await tx.account.create({
        data: {
          userId,
          type: 'oauth',
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          access_token: data.accessToken ? encrypt(data.accessToken) : null,
          refresh_token: data.refreshToken ? encrypt(data.refreshToken) : null,
          expires_at: data.expiresAt,
          token_type: data.tokenType,
          scope: data.scope,
          providerUsername: data.providerUsername,
          providerEmail: data.providerEmail,
          providerAvatar: data.providerAvatar,
          providerProfileUrl: data.providerProfileUrl,
        },
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          providerUsername: true,
          providerEmail: true,
          createdAt: true,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          category: 'auth',
          entityType: 'account',
          entityId: newAccount.id,
          description: `Connected ${data.provider} account`,
          ipAddress: clientIP,
          userAgent: userAgent?.slice(0, 255),
          status: 'success',
          newValue: {
            provider: data.provider,
            providerAccountId: data.providerAccountId,
            providerUsername: data.providerUsername,
          },
        },
      });

      return newAccount;
    });

    logger.info('Social account connected', {
      userId,
      provider: data.provider,
      ip: clientIP,
      requestId,
    });

    await constantTimeDelay(start);
    return secureResponse(
      {
        success: true,
        message: `${data.provider} account connected successfully`,
        account: {
          id: account.id,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          username: account.providerUsername,
          email: account.providerEmail,
          connectedAt: account.createdAt,
        },
      },
      201,
      requestId
    );

  } catch (error) {
    logger.error('Connect social account error', { ip: clientIP, requestId }, error);
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
  return secureResponse({ error: 'Method not allowed. Use /api/auth/social/disconnect', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
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