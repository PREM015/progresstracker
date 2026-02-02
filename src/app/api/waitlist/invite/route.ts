// src/app/api/waitlist/invite/route.ts
// =============================================================================
// WAITLIST INVITE ROUTES - Handle invite verification and acceptance
// Handles: GET, POST, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;
const INVITE_EXPIRY_DAYS = 7;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const verifyInviteSchema = z.object({
  code: z.string().min(8, 'Invalid invite code').max(32),
});

const acceptInviteSchema = z.object({
  code: z.string().min(8, 'Invalid invite code').max(32),
  email: z.string().email('Invalid email').optional(),
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

function isInviteExpired(invitedAt: Date): boolean {
  const now = new Date();
  const expiryDate = new Date(invitedAt);
  expiryDate.setDate(expiryDate.getDate() + INVITE_EXPIRY_DAYS);
  return now > expiryDate;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addSecurityHeaders(new NextResponse(null, { status: 204, headers: CORS_HEADERS }), requestId);
}

// =============================================================================
// HEAD - Quick check if invite code is valid
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
      where: { inviteCode: code },
      select: { id: true, status: true, invitedAt: true },
    });

    if (!entry) {
      return addSecurityHeaders(new NextResponse(null, { status: 404 }), requestId);
    }

    const expired = entry.invitedAt ? isInviteExpired(entry.invitedAt) : true;
    const isValid = entry.status === 'invited' && !expired;

    const response = new NextResponse(null, {
      status: isValid ? 200 : 410, // 410 Gone if expired
      headers: {
        'X-Invite-Valid': String(isValid),
        'X-Invite-Status': entry.status,
        'X-Invite-Expired': String(expired),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD waitlist/invite failed', { requestId }, error);
    return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Verify invite code
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for invite verification', { ip, requestId });
      return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return addSecurityHeaders(
        apiResponse.validationError('Invite code is required', undefined, requestId),
        requestId
      );
    }

    const validation = verifyInviteSchema.safeParse({ code });

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid invite code format', validation.error.errors, requestId),
        requestId
      );
    }

    const entry = await prisma.waitlist.findFirst({
      where: { inviteCode: code },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        invitedAt: true,
        position: true,
      },
    });

    if (!entry) {
      return addSecurityHeaders(
        apiResponse.notFound('Invite', requestId),
        requestId
      );
    }

    // Check if already joined
    if (entry.status === 'joined') {
      return addSecurityHeaders(
        apiResponse.success(
          {
            valid: false,
            reason: 'already_joined',
            message: 'This invite has already been used',
          },
          { meta: { requestId } }
        ),
        requestId
      );
    }

    // Check if expired
    if (entry.invitedAt && isInviteExpired(entry.invitedAt)) {
      return addSecurityHeaders(
        apiResponse.success(
          {
            valid: false,
            reason: 'expired',
            message: 'This invite has expired',
            expiredAt: new Date(entry.invitedAt.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          },
          { meta: { requestId } }
        ),
        requestId
      );
    }

    // Check if not invited status
    if (entry.status !== 'invited') {
      return addSecurityHeaders(
        apiResponse.success(
          {
            valid: false,
            reason: 'invalid_status',
            message: 'This invite is not valid',
          },
          { meta: { requestId } }
        ),
        requestId
      );
    }

    // Valid invite
    const expiresAt = entry.invitedAt
      ? new Date(entry.invitedAt.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      : null;

    logger.debug('Invite verified', {
      code,
      email: entry.email,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        valid: true,
        email: maskEmail(entry.email),
        name: entry.name,
        invitedAt: entry.invitedAt,
        expiresAt,
        signupUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?invite=${code}`,
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
    logger.error('GET waitlist/invite failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to verify invite', requestId),
      requestId
    );
  }
}

// =============================================================================
// POST - Accept invite and mark as joined
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for invite acceptance', { ip, requestId });
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

    const validation = acceptInviteSchema.safeParse(body);

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { code, email } = validation.data;

    const entry = await prisma.waitlist.findFirst({
      where: { inviteCode: code },
    });

    if (!entry) {
      return addSecurityHeaders(
        apiResponse.notFound('Invite', requestId),
        requestId
      );
    }

    // Validate email matches if provided
    if (email && email.toLowerCase() !== entry.email.toLowerCase()) {
      return addSecurityHeaders(
        apiResponse.validationError('Email does not match invite', undefined, requestId),
        requestId
      );
    }

    // Check if already joined
    if (entry.status === 'joined') {
      return addSecurityHeaders(
        apiResponse.validationError('This invite has already been used', undefined, requestId),
        requestId
      );
    }

    // Check if expired
    if (entry.invitedAt && isInviteExpired(entry.invitedAt)) {
      return addSecurityHeaders(
        apiResponse.validationError('This invite has expired', undefined, requestId),
        requestId
      );
    }

    // Check if status is invited
    if (entry.status !== 'invited') {
      return addSecurityHeaders(
        apiResponse.validationError('This invite is not valid', undefined, requestId),
        requestId
      );
    }

    // Mark as joined
    const updated = await prisma.waitlist.update({
      where: { id: entry.id },
      data: {
        status: 'joined',
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info('Waitlist invite accepted', {
      email: entry.email,
      code,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: 'Welcome! Your invite has been accepted.',
        email: updated.email,
        joinedAt: updated.joinedAt,
        nextStep: `${process.env.NEXT_PUBLIC_APP_URL || ''}/register?email=${encodeURIComponent(updated.email)}`,
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
    logger.error('POST waitlist/invite failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to accept invite', requestId),
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