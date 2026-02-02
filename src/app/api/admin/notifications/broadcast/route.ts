// src/app/api/admin/notifications/broadcast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { NotificationType, NotificationPriority, Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50; // Lower rate limit for broadcasts

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION
// =============================================================================

const broadcastSchema = z.object({
  type: z.nativeEnum(NotificationType).default('SYSTEM'),
  priority: z.nativeEnum(NotificationPriority).default('NORMAL'),
  title: z.string().min(5).max(300),
  message: z.string().min(10).max(2000),
  shortMessage: z.string().max(200).optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  targetAudience: z.enum(['all', 'active', 'premium', 'free', 'custom']).default('all'),
  userIds: z.array(z.string().cuid()).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])).min(1).default(['in_app']),
});

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(response: NextResponse, requestId: string, rateLimitResult?: { limit: number; remaining: number }): NextResponse {
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

async function validateAdminSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-broadcast:${ip}`);

  if (!rateLimitResult.success) {
    return { error: apiResponse.rateLimited(60, requestId), session: null, rateLimitResult };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId), session: null, rateLimitResult };
  }

  const isAdmin = Boolean(session.user.isAdmin || session.user.role === 'admin');

  if (!isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId), session: null, rateLimitResult };
  }

  return { error: null, session, rateLimitResult };
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// POST - Broadcast notification
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

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

    const validation = broadcastSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const {
      type,
      priority,
      title,
      message,
      shortMessage,
      actionUrl,
      actionLabel,
      imageUrl,
      metadata,
      targetAudience,
      userIds,
      scheduledFor,
      expiresAt,
      channels,
    } = validation.data;

    logger.info('Broadcasting notification', {
      targetAudience,
      channels,
      adminId: userId,
      requestId,
    });

    // Get target users
    let targetUserIds: string[] = [];

    if (targetAudience === 'custom' && userIds) {
      targetUserIds = userIds;
    } else {
      const whereClause: Prisma.UserWhereInput = { isActive: true };

      switch (targetAudience) {
        case 'active':
          whereClause.lastActiveAt = {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          };
          break;
        case 'premium':
          whereClause.subscription = {
            tier: { not: 'FREE' },
            status: 'ACTIVE',
          };
          break;
        case 'free':
          whereClause.OR = [
            { subscription: null },
            { subscription: { tier: 'FREE' } },
          ];
          break;
        case 'all':
        default:
          // No additional filters
          break;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      targetUserIds = users.map((u) => u.id);
    }

    if (targetUserIds.length === 0) {
      return addHeaders(
        apiResponse.validationError('No users match the target audience', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Create notifications
    const notificationData = targetUserIds.map((uid) => ({
      userId: uid,
      type,
      priority,
      channel: 'IN_APP' as const,
      title,
      message,
      shortMessage,
      actionUrl,
      actionLabel,
      imageUrl,
      metadata: metadata as Prisma.InputJsonValue,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    }));

    // Batch create (limit to avoid timeouts)
    const BATCH_SIZE = 1000;
    let totalCreated = 0;

    for (let i = 0; i < notificationData.length; i += BATCH_SIZE) {
      const batch = notificationData.slice(i, i + BATCH_SIZE);
      const result = await prisma.notification.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalCreated += result.count;
    }

    // TODO: Send email/push notifications if channels include them
    // This would typically be done in a background job

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_ACTION' as AuditAction,
        category: 'admin',
        entityType: 'notification',
        description: `Broadcast notification to ${totalCreated} users`,
        newValue: {
          title,
          targetAudience,
          userCount: totalCreated,
          channels,
        } as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Notification broadcast completed', {
      totalCreated,
      targetAudience,
      channels,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        message: `Notification broadcast to ${totalCreated} users`,
        totalCreated,
        targetAudience,
        channels,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST broadcast notification failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to broadcast notification', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';