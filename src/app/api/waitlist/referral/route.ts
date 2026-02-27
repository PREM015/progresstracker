// src/app/api/waitlist/referral/route.ts
// =============================================================================
// WAITLIST REFERRAL ROUTES - Handle referral tracking and rewards
// Handles: GET, POST, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;
const REFERRAL_POSITION_BOOST = 5; // Move up 5 positions per referral

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getReferralSchema = z.object({
  email: z.string().email('Invalid email').transform((val) => val.toLowerCase().trim()),
});

const generateReferralSchema = z.object({
  email: z.string().email('Invalid email').transform((val) => val.toLowerCase().trim()),
});

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

function addSecurityHeaders(response: NextResponse, requestId: string): NextResponse {
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
  const requestId = generateRequestId();
  return addSecurityHeaders(new NextResponse(null, { status: 204, headers: CORS_HEADERS }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      return addSecurityHeaders(new NextResponse(null, { status: 429 }), requestId);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return addSecurityHeaders(new NextResponse(null, { status: 400 }), requestId);
    }

    const entry = await prisma.waitlist.findFirst({
      where: {
        OR: [{ id: code }, { inviteCode: code }],
      },
      select: { id: true },
    });

    const response = new NextResponse(null, {
      status: entry ? 200 : 404,
      headers: {
        'X-Valid-Code': String(!!entry),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD waitlist/referral failed', { requestId }, error);
    return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get referral stats for an email
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for referral stats', { ip, requestId });
      return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const code = searchParams.get('code');

    if (!email && !code) {
      return addSecurityHeaders(
        apiResponse.validationError('Email or code query parameter is required', undefined, requestId),
        requestId
      );
    }

    let entry;

    if (email) {
      const validation = getReferralSchema.safeParse({ email });
      if (!validation.success) {
        return addSecurityHeaders(
          apiResponse.validationError('Invalid email format', validation.error.errors, requestId),
          requestId
        );
      }

      entry = await prisma.waitlist.findUnique({
        where: { email: validation.data.email },
      });
    } else if (code) {
      entry = await prisma.waitlist.findFirst({
        where: {
          OR: [{ id: code }, { inviteCode: code }],
        },
      });
    }

    if (!entry) {
      return addSecurityHeaders(
        apiResponse.notFound('Waitlist entry', requestId),
        requestId
      );
    }

    // Get referral count (people who used this person's referral code)
    const referralCode = entry.inviteCode || entry.id;
    const referralCount = await prisma.waitlist.count({
      where: { referralCode },
    });

    // Calculate position boost from referrals
    const positionBoost = referralCount * REFERRAL_POSITION_BOOST;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const referralLink = `${baseUrl}?ref=${referralCode}`;

    logger.debug('Referral stats fetched', {
      email: entry.email,
      referralCount,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        email: maskEmail(entry.email),
        referralCode,
        referralLink,
        referralCount,
        positionBoost,
        currentPosition: entry.position,
        effectivePosition: entry.position ? Math.max(1, entry.position - positionBoost) : null,
        message: referralCount > 0
          ? `You've referred ${referralCount} friend${referralCount > 1 ? 's' : ''} and moved up ${positionBoost} spots!`
          : 'Share your referral link to move up the waitlist!',
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('GET waitlist/referral failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to fetch referral stats', requestId),
      requestId
    );
  }
}

// =============================================================================
// POST - Generate or get referral code for email
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for referral generation', { ip, requestId });
      return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    const validation = generateReferralSchema.safeParse(body);

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { email } = validation.data;

    const entry = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (!entry) {
      return addSecurityHeaders(
        apiResponse.notFound('Waitlist entry', requestId),
        requestId
      );
    }

    let referralCode = entry.inviteCode;

    // Generate referral code if not exists
    if (!referralCode) {
      referralCode = nanoid(8);
      await prisma.waitlist.update({
        where: { id: entry.id },
        data: { inviteCode: referralCode },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const referralLink = `${baseUrl}?ref=${referralCode}`;

    // Get current referral count
    const referralCount = await prisma.waitlist.count({
      where: { referralCode },
    });

    logger.info('Referral code generated/retrieved', {
      email,
      referralCode,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        referralCode,
        referralLink,
        referralCount,
        shareText: `Join me on ProgressTracker - the ultimate coding progress tracker! Use my referral link: ${referralLink}`,
        shareLinks: {
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm on the ProgressTracker waitlist! Join me: ${referralLink}`)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(`Join me on ProgressTracker waitlist: ${referralLink}`)}`,
          email: `mailto:?subject=${encodeURIComponent('Join me on ProgressTracker!')}&body=${encodeURIComponent(`Hey! I'm on the ProgressTracker waitlist and thought you might be interested. Use my referral link to join: ${referralLink}`)}`,
        },
      },
      {
        meta: { requestId },
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('POST waitlist/referral failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to generate referral', requestId),
      requestId
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';

  const maskedLocal =
    local.length > 2 ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}` : '***';

  return `${maskedLocal}@${domain}`;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';