import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import { NotificationType } from '@prisma/client';

const RATE_LIMIT = 50;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return addHeaders(apiResponse.unauthorized('Unauthorized', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `notifications:list:${session.user.id}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type') // Optional: filter by notification type

    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
      isArchived: false, // Don't show archived by default?
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    // Map frontend filters to Prisma Enum types
    if (type) {
      switch (type) {
        case 'ACHIEVEMENT':
          where.type = 'ACHIEVEMENT_UNLOCKED';
          break;
        case 'GOAL':
          where.type = { in: ['GOAL_REMINDER', 'GOAL_COMPLETED', 'GOAL_FAILED'] };
          break;
        case 'STREAK':
          where.type = { in: ['STREAK_AT_RISK', 'STREAK_BROKEN', 'STREAK_MILESTONE'] };
          break;
        case 'SYSTEM':
          where.type = { in: ['SYSTEM', 'NEW_FEATURE', 'SECURITY_ALERT', 'BILLING_ALERT', 'WELCOME'] };
          break;
        case 'PLATFORM':
          where.type = { in: ['SYNC_COMPLETE', 'SYNC_FAILED'] };
          break;
        default:
          // If it matches a valid enum, use it, otherwise ignore or return empty
          // For safety, let's ignore invalid types to avoid Prisma errors
          const isValidEnum = Object.values(NotificationType).includes(type as any);
          if (isValidEnum) {
            where.type = type;
          }
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where })
    ]);

    // Also get unread count for badge
    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false, isArchived: false }
    });

    logger.info('GET notifications list completed', { userId: session.user.id, count: notifications.length, requestId, duration: Date.now() - startTime });

    return addHeaders(
      apiResponse.paginated(
        notifications,
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
        },
        { meta: { requestId, unreadCount } }
      ),
      requestId,
      rateLimitResult
    );

  } catch (error) {
    logger.error('GET notifications list failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Operation failed', requestId), requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SECURITY_HEADERS });
}