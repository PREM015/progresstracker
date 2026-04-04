// =============================================================================
// webhooks/email/bounce/route.ts
// =============================================================================
// Description: Handle email bounce webhook
// Methods: POST
// Auth Required: False
// Rate Limit: 100 requests/minute
// Tags: webhook, email, bounce
// Generated: 2026-02-02T11:57:44.614483
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { sendEmail } from '@/lib/email';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const bodySchema = z.object({
  event: z.enum(['bounce']),
  email: z.string().email(),
  ts: z.number(),
  messageId: z.string(),
  bounceType: z.string().optional(),
  bounceSubType: z.string().optional(),
  timestamp: z.number().optional(),
});


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract client IP from request
 */
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Add standard headers to response
 */
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

/**
 * Validate session and check rate limits
 */
async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `webhooks-email-bounce:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult
    };
  }


  return { error: null, session: null, rateLimitResult };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Resource metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    // Get total bounce events logged
    const total = await prisma.emailLog.count({
      where: { status: 'BOUNCED' },
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(total));
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD request failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * POST - Handle email bounce webhook
 * 
 * Processes email bounce events from the email provider:
 * - Verifies webhook signature and parses bounce event data
 * - Maps bounced email to user and marks as invalid
 * - Disables email notifications for hard bounces
 * - Logs bounce event for monitoring and admin alerts
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }



    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Mark email as bounced in EmailLog
    const emailLog = await prisma.emailLog.updateMany({
      where: { email: data.email, messageId: data.messageId } as any,
      data: { status: 'BOUNCED' as any, failureReason: data.bounceType } as any,
    });

    // Update user email status if hard bounce
    if (data.bounceSubType === 'Permanent') {
      await prisma.user.updateMany({
        where: { email: data.email },
        data: { emailVerified: null, email: null },
      });
    }

    const result = { processed: emailLog.count, email: data.email }














    logger.info('POST webhooks/email/bounce completed', {

      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(result, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST webhooks/email/bounce failed', { requestId, error: String(error) });
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}


// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Uncomment if route segment config is needed:
// export const revalidate = 0;
// export const fetchCache = 'force-no-store';

