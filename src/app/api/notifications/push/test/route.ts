import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import webpush from 'web-push';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';

const RATE_LIMIT = 5;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// Configure VAPID details
// In a real app, these should be checked.
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@progresstracker.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: any): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `notifications:push:test:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Get user subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: session.user.id, isActive: true }
    });

    if (subscriptions.length === 0) {
      return addHeaders(apiResponse.notFound('No active push subscriptions found', requestId), requestId, rateLimitResult);
    }

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'This is a test notification from Progress Tracker.',
      icon: '/icons/icon-192x192.png',
      data: {
        url: '/notifications'
      }
    });

    let successCount = 0;
    let failureCount = 0;

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        }, payload);

        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date(), successCount: { increment: 1 } }
        });
        successCount++;
      } catch (error) {
        logger.error('Failed to send push notification', { subscriptionId: sub.id }, error);
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { failureCount: { increment: 1 } } // Could deactivate if 410 Gone
        });
        failureCount++;
      }
    }));

    logger.info('POST push test completed', { userId: session.user.id, success: successCount, failures: failureCount, requestId, duration: Date.now() - startTime });

    return addHeaders(apiResponse.success({ message: `Sent ${successCount} notifications, ${failureCount} failed` }, { meta: { requestId } }), requestId, rateLimitResult);

  } catch (error) {
    logger.error('POST push test failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}
