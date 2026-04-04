// =============================================================================
// notifications/test/route.ts
// =============================================================================
// Description: Send test notification
// Methods: POST
// Auth Required: True
// Rate Limit: 10 requests/minute
// Tags: notification, test
// Generated: 2026-02-02T11:57:44.622064
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;

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
  type: z.enum(['email', 'push', 'in-app']).default('email'),
  templateId: z.string().optional(),
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
  const rateLimitKey = `notifications-test:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return { 
      error: apiResponse.rateLimited(60, requestId), 
      session: null, 
      rateLimitResult 
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { 
      error: apiResponse.unauthorized('Authentication required', requestId), 
      session: null, 
      rateLimitResult 
    };
  }

  return { error: null, session, rateLimitResult };
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
  const response = new NextResponse(null, { status: 200 });
  return addHeaders(response, requestId);
}

/**
 * POST - Send test notification
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }
    
    const userId = session!.user.id;

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

    // Create test notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        title: 'Test Notification',
        message: `This is a test ${data.type} notification`,
        type: 'CUSTOM' as any,
        channel: 'IN_APP',
      },
    });

    // Queue notification sending
    try {
      const { sendNotification } = await import('@/trigger/notifications/sendNotification');
      await sendNotification.trigger({
        userId,
        type: 'CUSTOM',
        title: 'Test Notification',
        message: `This is a test notification`,
      });
    } catch (err) {
      logger.warn('Failed to queue notification', { notificationId: notification.id, error: String(err) });
    }

    const result = { notificationId: notification.id, status: 'PENDING' };
    
    
    
    
    
    
    
    
    
    
    

    logger.info('POST notifications/test completed', {
      userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.created(result, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST notifications/test failed', { requestId }, error);
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

