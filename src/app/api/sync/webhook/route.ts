// =============================================================================
// src/app/api/sync/webhook/route.ts
// =============================================================================
// Description: Generic webhook handler for sync triggers
// Methods: POST, HEAD, OPTIONS
// Auth Required: Via signature verification
// Rate Limit: 100/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { WebhookHandler } from '@/services/sync/webhookHandler';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import crypto from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/webhook' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256, X-Gitlab-Token, X-Hook-UUID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const webhookPayloadSchema = z.object({
  platform: z.enum(['github', 'gitlab', 'bitbucket', 'custom']),
  userId: z.string().cuid().optional(),
  event: z.string(),
  data: z.record(z.unknown()),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `webhook_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const sigBuffer = Buffer.from(signature.replace('sha256=', ''));
    const expectedBuffer = Buffer.from(expectedSignature);
    
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return addHeaders(new NextResponse(null, { status: 204 }), generateRequestId());
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('X-Webhook-Status', 'active');
  return addHeaders(response, requestId);
}

// =============================================================================
// POST - Handle Webhook
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 100, `webhook:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('Webhook rate limit exceeded', { ip, requestId });
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const validation = webhookPayloadSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid webhook payload', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { platform, userId, event, data } = validation.data;

    // Verify signature based on platform
    let isValid = false;
    const signature = request.headers.get('x-hub-signature-256') || 
                     request.headers.get('x-gitlab-token') ||
                     request.headers.get('x-hook-secret');

    if (platform === 'custom' && !signature) {
      // Custom webhooks without signature require userId
      if (!userId) {
        return addHeaders(
          apiResponse.error(
            { message: 'userId required for custom webhooks', statusCode: 400, code: 'MISSING_USER_ID' },
            requestId
          ),
          requestId,
          rateLimitResult
        );
      }
      isValid = true;
    } else {
      const secret = process.env[`${platform.toUpperCase()}_WEBHOOK_SECRET`];
      if (secret) {
        isValid = verifyWebhookSignature(rawBody, signature, secret);
      } else {
        log.warn('No webhook secret configured for platform', { platform });
        isValid = true; // Allow if no secret configured (development)
      }
    }

    if (!isValid) {
      log.warn('Invalid webhook signature', { platform, requestId });
      return addHeaders(
        apiResponse.error(
          { message: 'Invalid webhook signature', statusCode: 401, code: 'INVALID_SIGNATURE' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Process webhook
    if (!userId) {
      // For platform webhooks without userId, we need to look up the user
      // This would typically be done by matching the repository/account
      log.info('Webhook received without userId', { platform, event, requestId });
      
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'userId not provided' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    const result = await WebhookHandler.handle(
      {
        platform: platform as 'github' | 'gitlab' | 'bitbucket',
        event,
        data,
        signature: signature || undefined,
      },
      userId
    );

    const duration = Date.now() - startTime;
    log.info('Webhook processed', { platform, event, userId, result: result.success, duration });

    return addHeaders(
      apiResponse.success(
        {
          received: true,
          processed: result.success,
          syncTriggered: result.syncTriggered,
          syncLogId: result.syncLogId,
          message: result.message,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Webhook processing failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Webhook processing failed', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';