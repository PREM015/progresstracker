// src/app/api/platforms/[id]/webhook/route.ts
/**
 * Platform Webhook API
 * 
 * Receives webhook notifications from external platforms.
 * 
 * @route POST /api/platforms/[id]/webhook - Receive webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { NotFoundError, ValidationError, UnauthorizedError } from '@/lib/apiError';
import crypto from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100; // 100 webhooks per minute

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const WebhookPayloadSchema = z.object({
  event: z.string(),
  timestamp: z.coerce.date().optional(),
  data: z.record(z.unknown()),
  signature: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `webhook_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Process webhook event
 */
async function processWebhookEvent(
  platformId: string,
  platformSlug: string,
  event: string,
  data: Record<string, unknown>
): Promise<{ processed: boolean; action?: string }> {
  // Import sync service dynamically
  const SyncService = (await import('@/services/syncService')).default;

  switch (event) {
    case 'push':
    case 'commit':
    case 'repository.push':
      // Trigger sync for push events
      const pushConnections = await prisma.userPlatform.findMany({
        where: {
          platformId,
          isActive: true,
          autoSync: true,
        },
        take: 10,
      });

      for (const conn of pushConnections) {
        SyncService.syncPlatform(conn.userId, platformId, { triggeredBy: 'webhook' })
          .catch(err => logger.error('Webhook sync failed', { userId: conn.userId }, err));
      }

      return { processed: true, action: `Triggered sync for ${pushConnections.length} users` };

    case 'submission':
    case 'accepted':
      // Handle submission events
      return { processed: true, action: 'Submission recorded' };

    case 'ping':
    case 'test':
      return { processed: true, action: 'Webhook verified' };

    default:
      logger.info('Unhandled webhook event', { platformSlug, event });
      return { processed: false, action: 'Event not handled' };
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256, X-Signature');
  return addHeaders(response, requestId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    // Rate limiting by platform
    const rateLimitKey = `webhook:${platformId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId
      );
    }

    // Get platform
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        slug: true,
        name: true,
        supportsWebhook: true,
        isActive: true,
      },
    });

    if (!platform) {
      throw new NotFoundError('Platform');
    }

    if (!platform.supportsWebhook) {
      throw new ValidationError(`${platform.name} does not support webhooks`);
    }

    if (!platform.isActive) {
      throw new ValidationError(`${platform.name} is currently unavailable`);
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Check for signature
    const signature = 
      request.headers.get('x-hub-signature-256')?.replace('sha256=', '') ||
      request.headers.get('x-signature') ||
      request.headers.get('x-webhook-signature');

    // Parse body
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Invalid JSON payload');
    }

    const validation = WebhookPayloadSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid webhook payload',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId
      );
    }

    const { event, data } = validation.data;

    // Process webhook
    const result = await processWebhookEvent(platformId, platform.slug, event, data);

    logger.info('Webhook received', {
      requestId,
      platformId,
      platformSlug: platform.slug,
      event,
      processed: result.processed,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          received: true,
          event,
          processed: result.processed,
          action: result.action,
        },
        {
          meta: { requestId, duration: Date.now() - startTime },
        }
      ),
      requestId
    );
  } catch (error) {
    logger.error('POST /api/platforms/[id]/webhook failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';