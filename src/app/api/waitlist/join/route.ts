// src/app/api/waitlist/join/route.ts
// =============================================================================
// WAITLIST JOIN ROUTES - Public endpoint to join waitlist
// Handles: GET, POST, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

import { nanoid } from 'nanoid';
/* eslint-disable @typescript-eslint/no-explicit-any */

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10; // 10 requests per minute for join

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

// Disposable email domains to block
const BLOCKED_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'trashmail.com',
  'yopmail.com',
  'getnada.com',
];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const joinSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email too long')
    .transform((val) => val.toLowerCase().trim()),
  name: z
    .string()
    .max(100, 'Name too long')
    .optional()
    .transform((val) => val?.trim()),
  source: z
    .enum(['landing', 'blog', 'social', 'referral', 'organic', 'paid', 'other'])
    .optional()
    .default('organic'),
  referralCode: z
    .string()
    .max(50, 'Referral code too long')
    .optional()
    .transform((val) => val?.trim()),
});

const checkEmailSchema = z.object({
  email: z.string().email('Invalid email address').transform((val) => val.toLowerCase().trim()),
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
    request.headers.get('cf-connecting-ip') ||
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

function isBlockedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return BLOCKED_EMAIL_DOMAINS.some((blocked) => domain?.includes(blocked));
}

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .trim();
}

async function getNextPosition(): Promise<number> {
  const highest = await prisma.waitlist.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (highest?.position || 0) + 1;
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();

  const response = new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });

  return addSecurityHeaders(response, requestId);
}

// =============================================================================
// HEAD - Check if waitlist is open
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      return addSecurityHeaders(new NextResponse(null, { status: 429 }), requestId);
    }

    // Check if waitlist is accepting new entries (could be controlled by feature flag)
    const isOpen = process.env.WAITLIST_OPEN !== 'false';
    const totalWaiting = await prisma.waitlist.count({ where: { status: 'waiting' } });

    const response = new NextResponse(null, {
      status: isOpen ? 200 : 503,
      headers: {
        'X-Waitlist-Open': String(isOpen),
        'X-Waiting-Count': String(totalWaiting),
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD waitlist/join failed', { requestId }, error);
    return addSecurityHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Check if email is already on waitlist
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for waitlist check', { ip, requestId });
      return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return addSecurityHeaders(
        apiResponse.validationError('Email query parameter is required', undefined, requestId),
        requestId
      );
    }

    const validation = checkEmailSchema.safeParse({ email });

    if (!validation.success) {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid email format', validation.error.errors, requestId),
        requestId
      );
    }

    const entry = await prisma.waitlist.findUnique({
      where: { email: validation.data.email },
      select: {
        id: true,
        email: true,
        status: true,
        position: true,
        createdAt: true,
      },
    });

    if (!entry) {
      const response = apiResponse.success(
        {
          exists: false,
          message: 'Email is not on the waitlist',
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
    }

    // Calculate approximate wait position
    const aheadCount = await prisma.waitlist.count({
      where: {
        status: 'waiting',
        position: { lt: entry.position || 0 },
      },
    });

    logger.debug('Waitlist email checked', {
      email: validation.data.email,
      exists: true,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        exists: true,
        status: entry.status,
        position: entry.position,
        aheadCount,
        joinedAt: entry.createdAt,
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
    logger.error('GET waitlist/join failed', { requestId }, error);
    return addSecurityHeaders(
      apiResponse.internalError('Failed to check waitlist status', requestId),
      requestId
    );
  }
}

// =============================================================================
// POST - Join the waitlist
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, ip);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for waitlist join', { ip, requestId });
      return addSecurityHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    // Check if waitlist is open
    if (process.env.WAITLIST_OPEN === 'false') {
      return addSecurityHeaders(
        apiResponse.validationError('Waitlist is currently closed', undefined, requestId),
        requestId
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addSecurityHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId
      );
    }

    // Validate input
    const validation = joinSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Waitlist join validation failed', {
        errors: validation.error.errors,
        requestId,
      });
      return addSecurityHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId
      );
    }

    const { email, name, source, referralCode } = validation.data;

    // Check for blocked email domains
    if (isBlockedEmailDomain(email)) {
      logger.warn('Blocked email domain attempted', { email, ip, requestId });
      return addSecurityHeaders(
        apiResponse.validationError('Please use a valid email address', undefined, requestId),
        requestId
      );
    }

    // Sanitize name if provided
    const sanitizedName = name ? sanitizeInput(name) : undefined;

    // Check if already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.status === 'joined') {
        return addSecurityHeaders(
          apiResponse.validationError('This email is already registered', undefined, requestId),
          requestId
        );
      }

      if (existing.status === 'invited') {
        return addSecurityHeaders(
          apiResponse.success(
            {
              message: 'You have already been invited! Check your email.',
              status: 'invited',
              position: existing.position,
            },
            { meta: { requestId } }
          ),
          requestId
        );
      }

      // Already on waitlist
      const aheadCount = await prisma.waitlist.count({
        where: {
          status: 'waiting',
          position: { lt: existing.position || 0 },
        },
      });

      return addSecurityHeaders(
        apiResponse.success(
          {
            message: 'You are already on the waitlist!',
            status: 'waiting',
            position: existing.position,
            aheadCount,
          },
          { meta: { requestId } }
        ),
        requestId
      );
    }

    // Validate referral code if provided
    let validReferral = false;
    if (referralCode) {
      const referrer = await prisma.waitlist.findFirst({
        where: {
          OR: [
            { id: referralCode },
            { inviteCode: referralCode },
          ],
        },
      });
      validReferral = !!referrer;
    }

    // Get next position
    const position = await getNextPosition();

    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        email,
        name: sanitizedName,
        source,
        referralCode: validReferral ? referralCode : null,
        status: 'waiting',
        position,
      },
    });

    // If valid referral, update referrer's position (move up)
    if (validReferral && referralCode) {
      const referrer = await prisma.waitlist.findFirst({
        where: {
          OR: [
            { id: referralCode },
            { inviteCode: referralCode },
          ],
          status: 'waiting',
        },
      });

      if (referrer && referrer.position && referrer.position > 5) {
        await prisma.waitlist.update({
          where: { id: referrer.id },
          data: { position: Math.max(1, referrer.position - 5) },
        });
      }
    }

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(email, sanitizedName, position).catch((err) => {
      logger.error('Failed to send waitlist welcome email', { email }, err);
    });

    logger.info('Waitlist entry created', {
      email,
      position,
      source,
      hasReferral: validReferral,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(
      {
        message: 'Successfully joined the waitlist!',
        email: entry.email,
        position: entry.position,
        status: entry.status,
        referralApplied: validReferral,
      },
      { requestId }
    );

    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

    return addSecurityHeaders(response, requestId);
  } catch (error) {
    logger.error('POST waitlist/join failed', { requestId }, error);

    // Handle unique constraint violation
    if ((error as any)?.code === 'P2002') {
      return addSecurityHeaders(
        apiResponse.validationError('This email is already on the waitlist', undefined, requestId),
        requestId
      );
    }

    return addSecurityHeaders(
      apiResponse.internalError('Failed to join waitlist', requestId),
      requestId
    );
  }
}

// =============================================================================
// EMAIL SENDING (async helper)
// =============================================================================

async function sendWelcomeEmail(email: string, name: string | undefined, position: number): Promise<void> {
  try {
    // Check if email service is configured
    if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
      logger.debug('Email service not configured, skipping welcome email');
      return;
    }

    // Generate referral code for this user
    const referralCode = nanoid(8);

    // Update entry with referral code (for sharing)
    await prisma.waitlist.update({
      where: { email },
      data: { inviteCode: referralCode },
    });

    // Import and send email
    // This would integrate with your email service
    // const { emailService } = await import('@/lib/email');
    // await emailService.sendWaitlistWelcome({ email, name, position, referralCode });

    logger.info('Waitlist welcome email sent', { email, position });
  } catch (error) {
    logger.error('Failed to send welcome email', { email }, error);
    // Don't throw - email failure shouldn't fail the join
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';