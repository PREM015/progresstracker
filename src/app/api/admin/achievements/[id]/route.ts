// src/app/api/admin/achievements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory, Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
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

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(1000).optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  icon: z.string().max(200).optional(),
  color: z.string().max(50).optional(),
  badgeImage: z.string().url().optional(),
  points: z.number().int().min(0).max(10000).optional(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  requirement: z.record(z.unknown()).optional(),
  requirementText: z.string().max(500).optional(),
  thresholds: z.array(z.record(z.unknown())).optional(),
  isHidden: z.boolean().optional(),
  isSecret: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-achievement:${ip}`);

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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// GET - Get single achievement
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        users: {
          take: 10,
          orderBy: { unlockedAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true, username: true, image: true },
            },
          },
        },
      },
    });

    if (!achievement) {
      return addHeaders(apiResponse.notFound('Achievement', requestId), requestId, rateLimitResult);
    }

    logger.info('Achievement fetched', {
      achievementId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(achievement, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin achievement failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch achievement', requestId), requestId);
  }
}

// =============================================================================
// PUT/PATCH - Update achievement
// =============================================================================

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
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

    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const currentAchievement = await prisma.achievement.findUnique({ where: { id } });

    if (!currentAchievement) {
      return addHeaders(apiResponse.notFound('Achievement', requestId), requestId, rateLimitResult);
    }

    const updated = await prisma.achievement.update({
      where: { id },
      data: { ...(validation.data as any), updatedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'admin',
        entityType: 'achievement',
        entityId: id,
        description: `Updated achievement: ${updated.title}`,
        oldValue: currentAchievement as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Achievement updated', {
      achievementId: id,
      adminId: userId,
      changes: Object.keys(validation.data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT admin achievement failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update achievement', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete achievement
// =============================================================================

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const { error, session, rateLimitResult } = await validateAdminSession(request, requestId);

    if (error) {
      return addHeaders(error, requestId, rateLimitResult);
    }

    const userId = session!.user.id;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!achievement) {
      return addHeaders(apiResponse.notFound('Achievement', requestId), requestId, rateLimitResult);
    }

    if (achievement._count.users > 0) {
      return addHeaders(
        apiResponse.validationError(
          `Cannot delete achievement with ${achievement._count.users} users. Deactivate instead.`,
          undefined,
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    await prisma.achievement.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as AuditAction,
        category: 'admin',
        entityType: 'achievement',
        entityId: id,
        description: `Deleted achievement: ${achievement.title}`,
        oldValue: achievement as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Achievement deleted', {
      achievementId: id,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ message: 'Achievement deleted' }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE admin achievement failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete achievement', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';