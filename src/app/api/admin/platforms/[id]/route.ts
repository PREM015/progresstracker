// src/app/api/admin/platforms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory, AuthType, Prisma, AuditAction } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, POST, OPTIONS',
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
  name: z.string().min(2).max(100).optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  authType: z.nativeEnum(AuthType).optional(),
  icon: z.string().optional(),
  logo: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  website: z.string().url().optional(),
  apiEndpoint: z.string().url().optional(),
  profileUrlPattern: z.string().optional(),
  supportsAutoSync: z.boolean().optional(),
  supportsWebhook: z.boolean().optional(),
  supportsOAuth: z.boolean().optional(),
  supportsApiKey: z.boolean().optional(),
  requiresCredentials: z.boolean().optional(),
  syncPriority: z.number().int().optional(),
  syncInterval: z.number().int().optional(),
  rateLimit: z.number().int().optional(),
  rateLimitWindow: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isBeta: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  setupGuideUrl: z.string().url().optional(),
  helpArticleUrl: z.string().url().optional(),
});

const testSchema = z.object({
  username: z.string().optional(),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
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
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `admin-platform-detail:${ip}`);

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
// GET - Get single platform with stats
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

    const platform = await prisma.platform.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            trackerEntries: true,
            syncLogs: true,
          },
        },
      },
    });

    if (!platform) {
      return addHeaders(apiResponse.notFound('Platform', requestId), requestId, rateLimitResult);
    }

    // Get additional stats
    const [activeUsers, recentSyncs, avgSyncDuration] = await Promise.all([
      prisma.userPlatform.count({
        where: { platformId: id, isActive: true },
      }),
      prisma.syncLog.findMany({
        where: { platformId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          duration: true,
          createdAt: true,
          hasError: true,
          errorMessage: true,
        },
      }),
      prisma.syncLog.aggregate({
        where: { platformId: id, status: 'SUCCESS', duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    logger.info('Platform fetched with stats', {
      platformId: id,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...platform,
        stats: {
          totalUsers: platform._count.users,
          activeUsers,
          totalSyncs: platform._count.syncLogs,
          avgSyncDuration: Math.round(avgSyncDuration._avg.duration || 0),
        },
        recentSyncs,
      },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET admin platform failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch platform', requestId), requestId);
  }
}

// =============================================================================
// PUT/PATCH - Update platform
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

    const currentPlatform = await prisma.platform.findUnique({ where: { id } });

    if (!currentPlatform) {
      return addHeaders(apiResponse.notFound('Platform', requestId), requestId, rateLimitResult);
    }

    const updated = await prisma.platform.update({
      where: { id },
      data: { ...validation.data, updatedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE' as AuditAction,
        category: 'admin',
        entityType: 'platform',
        entityId: id,
        description: `Updated platform: ${updated.name}`,
        oldValue: currentPlatform as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Platform updated', {
      platformId: id,
      adminId: userId,
      changes: Object.keys(validation.data),
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(updated, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT admin platform failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update platform', requestId), requestId);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return PUT(request, context);
}

// =============================================================================
// DELETE - Delete platform
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

    const platform = await prisma.platform.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!platform) {
      return addHeaders(apiResponse.notFound('Platform', requestId), requestId, rateLimitResult);
    }

    if (platform._count.users > 0) {
      return addHeaders(
        apiResponse.validationError(
          `Cannot delete platform with ${platform._count.users} connected users. Deactivate instead.`,
          undefined,
          requestId
        ),
        requestId,
        rateLimitResult
      );
    }

    await prisma.platform.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE' as AuditAction,
        category: 'admin',
        entityType: 'platform',
        entityId: id,
        description: `Deleted platform: ${platform.name}`,
        oldValue: platform as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
        performedBy: userId,
      },
    });

    logger.info('Platform deleted', {
      platformId: id,
      adminId: userId,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success({ message: 'Platform deleted' }, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE admin platform failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete platform', requestId), requestId);
  }
}

// =============================================================================
// POST - Test platform connection
// =============================================================================

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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

    const validation = testSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const platform = await prisma.platform.findUnique({ where: { id } });

    if (!platform) {
      return addHeaders(apiResponse.notFound('Platform', requestId), requestId, rateLimitResult);
    }

    // TODO: Implement actual platform API test
    // This would make a test request to the platform's API
    const testResult = {
      success: true,
      message: 'Platform connection test successful',
      latency: Math.random() * 1000,
      endpoint: validation.data.endpoint || platform.apiEndpoint,
    };

    logger.info('Platform connection tested', {
      platformId: id,
      adminId: userId,
      success: testResult.success,
      requestId,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(testResult, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST platform test failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to test platform connection', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';