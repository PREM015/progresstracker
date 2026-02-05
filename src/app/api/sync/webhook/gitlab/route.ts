// =============================================================================
// src/app/api/sync/webhook/gitlab/route.ts
// =============================================================================
// Description: GitLab-specific webhook handler
// Methods: POST, HEAD, OPTIONS
// Auth Required: Via GitLab token verification
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

const log = logger.child({ route: 'api/sync/webhook/gitlab' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Gitlab-Token, X-Gitlab-Event',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// Events that should trigger a sync
const SYNC_TRIGGER_EVENTS = [
  'Push Hook',
  'Merge Request Hook',
  'Issue Hook',
  'Note Hook',
  'Pipeline Hook',
  'Job Hook',
  'Tag Push Hook',
];

// =============================================================================
// TYPES
// =============================================================================

interface GitLabWebhookPayload {
  object_kind: string;
  event_name?: string;
  user?: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  project?: {
    id: number;
    name: string;
    path_with_namespace: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  }>;
  object_attributes?: {
    id: number;
    state?: string;
    action?: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `gl_webhook_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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

function verifyGitLabToken(token: string | null): boolean {
  const expectedToken = process.env.GITLAB_WEBHOOK_SECRET;
  
  if (!expectedToken) {
    log.warn('GITLAB_WEBHOOK_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }
  
  return token === expectedToken;
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
  response.headers.set('X-Platform', 'gitlab');
  return addHeaders(response, requestId);
}

// =============================================================================
// POST - Handle GitLab Webhook
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 200, `webhook:gitlab:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('GitLab webhook rate limit exceeded', { ip, requestId });
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Get headers
    const token = request.headers.get('x-gitlab-token');
    const event = request.headers.get('x-gitlab-event');

    log.info('GitLab webhook received', { event, requestId });

    // Verify token
    if (!verifyGitLabToken(token)) {
      log.warn('Invalid GitLab webhook token', { requestId });
      return addHeaders(
        apiResponse.error(
          { message: 'Invalid token', statusCode: 401, code: 'INVALID_TOKEN' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Parse payload
    let payload: GitLabWebhookPayload;
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
    if (!event || !SYNC_TRIGGER_EVENTS.includes(event)) {
      log.debug('GitLab event ignored', { event, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: `Event '${event}' does not trigger sync` },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Find user by GitLab username
    const gitlabUsername = payload.user?.username;
    if (!gitlabUsername) {
      log.warn('No user in GitLab webhook', { requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'No user information' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Look up user by GitLab account
    const account = await prisma.account.findFirst({
      where: {
        provider: 'gitlab',
        providerUsername: gitlabUsername,
      },
      select: { userId: true },
    });

    const userId = account?.userId;

    if (!userId) {
      log.debug('No user found for GitLab username', { gitlabUsername, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'User not registered' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Get user's GitLab platform connection
    const userPlatform = await prisma.userPlatform.findFirst({
      where: {
        userId,
        platform: { slug: 'gitlab' },
        isActive: true,
      },
    });

    if (!userPlatform) {
      log.debug('GitLab platform not connected for user', { userId, requestId });
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
      triggerSource: `gitlab:${payload.object_kind}`,
    });

    // Send SSE notification
    sseSyncService.sendSyncQueued(userId, syncLogId, userPlatform.platformId, 'GitLab');

    const duration = Date.now() - startTime;
    log.info('GitLab webhook processed', {
      event,
      userId,
      syncLogId,
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
          event,
          project: payload.project?.path_with_namespace,
        },
        { meta: { requestId, duration } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('GitLab webhook failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Webhook processing failed', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';