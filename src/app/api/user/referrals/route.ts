// src/app/api/user/referrals/route.ts
// =============================================================================
// USER REFERRALS ROUTES
// =============================================================================
// Description: Manage user referrals and referral rewards
// Methods: GET, POST, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_REWARD_POINTS = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=300',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const generateCodeSchema = z.object({
  action: z.literal('generate'),
  regenerate: z.boolean().default(false),
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
  const rateLimitKey = `user-referrals:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  const session = await getServerSession(authOptions);

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

async function generateUniqueReferralCode(): Promise<string> {
  let code: string;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    code = nanoid(REFERRAL_CODE_LENGTH).toUpperCase();
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    exists = !!existing;
    attempts++;
  }

  if (exists) {
    throw new Error('Failed to generate unique referral code');
  }

  return code!;
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
// HEAD - Check Referral Status
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const [user, referralCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { referralCode: true },
      }),
      prisma.user.count({
        where: { referredBy: session.user.id },
      }),
    ]);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Has-Referral-Code': String(!!user?.referralCode),
        'X-Referral-Count': String(referralCount),
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD referrals failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get Referrals List and Stats
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid query parameters', queryValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { page, limit } = queryValidation.data;

    // Get user's referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    // Get referrals
    const [referrals, total] = await Promise.all([
      prisma.user.findMany({
        where: { referredBy: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({
        where: { referredBy: userId },
      }),
    ]);

    // Calculate stats
    const stats = await prisma.user.aggregate({
      where: { referredBy: userId },
      _count: { id: true },
    });

    const activeReferrals = await prisma.user.count({
      where: { referredBy: userId, isActive: true },
    });

    const verifiedReferrals = await prisma.user.count({
      where: { referredBy: userId, isVerified: true },
    });

    // Calculate rewards earned
    const rewardsEarned = verifiedReferrals * REFERRAL_REWARD_POINTS;

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
    const referralLink = user?.referralCode
      ? `${baseUrl}/register?ref=${user.referralCode}`
      : null;

    logger.debug('Referrals fetched', {
      userId,
      total,
      page,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.paginated(
      referrals.map((r) => ({
        id: r.id,
        name: r.name,
        username: r.username,
        image: r.image,
        status: r.isActive ? (r.isVerified ? 'verified' : 'active') : 'inactive',
        joinedAt: r.createdAt,
      })),
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      {
        meta: {
          requestId,
          referralCode: user?.referralCode,
          referralLink,
          stats: {
            total: stats._count.id,
            active: activeReferrals,
            verified: verifiedReferrals,
            rewardsEarned,
            pointsPerReferral: REFERRAL_REWARD_POINTS,
          },
        },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET referrals failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch referrals', requestId), requestId);
  }
}

// =============================================================================
// POST - Generate or Regenerate Referral Code
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
      body = { action: 'generate' };
    }

    const bodyValidation = generateCodeSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { regenerate } = bodyValidation.data;

    // Check existing code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode && !regenerate) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
      
      return addHeaders(
        apiResponse.success(
          {
            referralCode: user.referralCode,
            referralLink: `${baseUrl}/register?ref=${user.referralCode}`,
            message: 'Referral code already exists. Use regenerate: true to create a new one.',
          },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Generate new code
    const newCode = await generateUniqueReferralCode();

    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: newCode },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        category: 'referral',
        description: regenerate ? 'Referral code regenerated' : 'Referral code generated',
        oldValue: user?.referralCode ? { code: user.referralCode } : undefined,
        newValue: { code: newCode },
        ipAddress: ip,
        userAgent,
        status: 'success',
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

    logger.info('Referral code generated', {
      userId,
      regenerate,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        referralCode: newCode,
        referralLink: `${baseUrl}/register?ref=${newCode}`,
        message: regenerate ? 'Referral code regenerated successfully' : 'Referral code generated successfully',
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST referrals failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to generate referral code', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';