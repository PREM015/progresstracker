// =============================================================================
// src/app/api/sync/webhook/github/route.ts
// =============================================================================
// Description: GitHub-specific webhook handler
// Methods: POST, HEAD, OPTIONS
// Auth Required: Via GitHub signature verification
// Rate Limit: 200/min
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncQueue } from '@/services/sync/syncQueue';
import { sseSyncService } from '@/services/sseSyncService';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import crypto from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sync/webhook/github' });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Delivery',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

// Events that should trigger a sync
const SYNC_TRIGGER_EVENTS = [
  'push',
  'pull_request',
  'pull_request_review',
  'issues',
  'issue_comment',
  'create',
  'delete',
  'fork',
  'star',
  'release',
];

// =============================================================================
// TYPES
// =============================================================================

interface GitHubWebhookPayload {
  action?: string;
  sender?: {
    id: number;
    login: string;
  };
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  installation?: {
    id: number;
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  }>;
  ref?: string;
  pull_request?: {
    id: number;
    number: number;
    state: string;
    merged: boolean;
  };
  issue?: {
    id: number;
    number: number;
    state: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `gh_webhook_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
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

function verifyGitHubSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!secret) {
    log.warn('GITHUB_WEBHOOK_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }
  
  if (!signature) {
    return false;
  }

  try {
    const expectedSignature = 'sha256=' + crypto
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
  response.headers.set('X-Platform', 'github');
  return addHeaders(response, requestId);
}

// =============================================================================
// POST - Handle GitHub Webhook
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, 200, `webhook:github:${ip}`);
    
    if (!rateLimitResult.success) {
      log.warn('GitHub webhook rate limit exceeded', { ip, requestId });
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Get headers
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    log.info('GitHub webhook received', { event, deliveryId, requestId });

    // Get raw body
    const rawBody = await request.text();

    // Verify signature
    if (!verifyGitHubSignature(rawBody, signature)) {
      log.warn('Invalid GitHub webhook signature', { requestId, deliveryId });
      return addHeaders(
        apiResponse.error(
          { message: 'Invalid signature', statusCode: 401, code: 'INVALID_SIGNATURE' },
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    // Parse payload
    let payload: GitHubWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON payload', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Handle ping event (GitHub sends this when webhook is set up)
    if (event === 'ping') {
      log.info('GitHub webhook ping received', { requestId });
      return addHeaders(
        apiResponse.success({ message: 'pong', event: 'ping' }, { meta: { requestId } }),
        requestId,
        rateLimitResult
      );
    }

    // Check if this event should trigger a sync
    if (!event || !SYNC_TRIGGER_EVENTS.includes(event)) {
      log.debug('GitHub event ignored', { event, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: `Event '${event}' does not trigger sync` },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Find user by GitHub username
    const githubUsername = payload.sender?.login;
    if (!githubUsername) {
      log.warn('No sender in GitHub webhook', { requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'No sender information' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Look up user by GitHub account
    const account = await prisma.account.findFirst({
      where: {
        provider: 'github',
        providerUsername: githubUsername,
      },
      select: { userId: true },
    });

    // Also try by username in user table
    let userId = account?.userId;
    if (!userId) {
      const user = await prisma.user.findFirst({
        where: { githubUsername },
        select: { id: true },
      });
      userId = user?.id;
    }

    if (!userId) {
      log.debug('No user found for GitHub username', { githubUsername, requestId });
      return addHeaders(
        apiResponse.success(
          { received: true, processed: false, reason: 'User not registered' },
          { meta: { requestId } }
        ),
        requestId,
        rateLimitResult
      );
    }

    // Get user's GitHub platform connection
    const userPlatform = await prisma.userPlatform.findFirst({
      where: {
        userId,
        platform: { slug: 'github' },
        isActive: true,
      },
    });

    if (!userPlatform) {
      log.debug('GitHub platform not connected for user', { userId, requestId });
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
      triggerSource: `github:${event}`,
    });

    // Send SSE notification
    sseSyncService.sendSyncQueued(userId, syncLogId, userPlatform.platformId, 'GitHub');

    const duration = Date.now() - startTime;
    log.info('GitHub webhook processed', {
      event,
      userId,
      syncLogId,
      deliveryId,
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
          repository: payload.repository?.full_name,
        },
        { meta: { requestId, duration, deliveryId } }
      ),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    log.error('GitHub webhook failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Webhook processing failed', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';