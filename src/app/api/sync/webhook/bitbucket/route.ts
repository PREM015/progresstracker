// =============================================================================
// src/app/api/sync/webhook/bitbucket/route.ts
// =============================================================================
// Description: Bitbucket-specific webhook handler
// Methods: POST, HEAD, OPTIONS
// Auth Required: Via Bitbucket signature/secret verification
// Rate Limit: 200/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncQueue } from '@/services/sync/syncQueue';
import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/webhook/bitbucket' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hook-UUID, X-Event-Key, X-Request-UUID',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// Events that should trigger a sync
const SYNC_TRIGGER_EVENTS = [
  'repo:push',
  'repo:fork',
  'repo:commit_comment_created',
  'pullrequest:created',
  'pullrequest:updated',
  'pullrequest:fulfilled',
  'pullrequest:rejected',
  'issue:created',
  'issue:updated',
];

// =============================================================================
// TYPES
// =============================================================================

interface BitbucketWebhookPayload {
  actor?: {
    uuid: string;
    username?: string;
    nickname?: string;
    display_name: string;
  };
  repository?: {
    uuid: string;
    name: string;
    full_name: string;
  };
  push?: {
    changes: Array<{
      new?: {
        type: string;
        name: string;
        target: {
          hash: string;
          message: string;
        };
      };
      commits?: Array<{
        hash: string;
        message: string;
        author: {
          raw: string;
        };
      }>;
    }>;
  };
  pullrequest?: {
    id: number;
    title: string;
    state: string;
  };
  issue?: {
    id: number;
    title: string;
    state: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `bb_webhook_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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

// Bitbucket uses IP allowlisting, but we can add a secret header check
function verifyBitbucketSecret(request: NextRequest): boolean {
  const secret = process.env.BITBUCKET_WEBHOOK_SECRET;
  
  if (!secret) {
    log.warn('BITBUCKET_WEBHOOK_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }
  
  // Check custom secret header if configured
  const headerSecret = request.headers.get('x-hook-secret');
  return headerSecret === secret;
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
  response.headers.set('X-Platform', 'bitbucket');
  return addHeaders(response, requestId);
}

// =============================================================================
// POST - Handle Bitbucket Webhook
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 200, `webhook:bitbucket:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('Bitbucket webhook rate limit exceeded', { ip, requestId });
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Get headers
    const eventKey = request.headers.get('x-event-key');
    const hookUuid = request.headers.get('x-hook-uuid');
    const requestUuid = request.headers.get('x-request-uuid');

    log.info('Bitbucket webhook received', { eventKey, hookUuid, requestId });

    // Verify secret if configured
    if (process.env.BITBUCKET_WEBHOOK_SECRET && !verifyBitbucketSecret(request)) {
      log.warn('Invalid Bitbucket webhook secret', { requestId });
      return addHeaders(
        apiResponse.error(
          { message: 'Invalid secret', statusCode: 401, code: 'INVALID_SECRET' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Parse payload
    let payload: BitbucketWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON payload', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Check if this event should trigger a sync
    if (!eventKey || !SYNC_TRIGGER_EVENTS.includes(eventKey)) {
      log.debug('Bitbucket event ignored', { eventKey, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: `Event '${eventKey}' does not trigger sync` },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Find user by Bitbucket username
    const bitbucketUsername = payload.actor?.username || payload.actor?.nickname;
    if (!bitbucketUsername) {
      log.warn('No actor in Bitbucket webhook', { requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'No actor information' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Look up user by Bitbucket account
    const account = await prisma.account.findFirst({
      where: {
        provider: 'bitbucket',
        providerUsername: bitbucketUsername,
      },
      select: { userId: true },
    });

    const userId = account?.userId;

    if (!userId) {
      log.debug('No user found for Bitbucket username', { bitbucketUsername, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'User not registered' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Get user's Bitbucket platform connection
    const userPlatform = await prisma.userPlatform.findFirst({
      where: {
        userId,
        platform: { slug: 'bitbucket' },
        isActive: true,
      },
    });

    if (!userPlatform) {
      log.debug('Bitbucket platform not connected for user', { userId, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'Platform not connected' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Enqueue sync
    const syncLogId = await SyncQueue.enqueue({
      userId,
      platformId: userPlatform.platformId,
      userPlatformId: userPlatform.id,
      triggeredBy: 'webhook',
      triggerSource: `bitbucket:${eventKey}`,
    });

    // Send SSE notification
    sseSyncService.sendSyncQueued(userId, syncLogId, userPlatform.platformId, 'Bitbucket');

    const duration = Date.now() - startTime;
    log.info('Bitbucket webhook processed', {
      eventKey,
      userId,
      syncLogId,
      hookUuid,
      duration,
      requestId,
    });

    return addHeaders(
      apiResponse.success(
        {
          received: true,
          processed: true,
          syncTriggered: true,
          syncLogId,
          event: eventKey,
          repository: payload.repository?.full_name,
        },
        { meta: { requestId, duration, hookUuid, requestUuid } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('Bitbucket webhook failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Webhook processing failed', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';