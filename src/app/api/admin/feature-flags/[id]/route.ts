// =============================================================================
// api/admin/feature-flags/[id]/route.ts
// =============================================================================
// Description: Admin feature flag management by ID
// Methods: GET, PUT, PATCH, DELETE, OPTIONS
// Auth Required: Yes (Admin only)
// Rate Limit: 50 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { SubscriptionTier } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const paramsSchema = z.object({
  id: z.string().cuid()
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  isEnabled: z.boolean().optional(),
  enabledForAll: z.boolean().optional(),
  enabledUserIds: z.array(z.string()).optional(),
  enabledTiers: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  enabledPercentage: z.number().int().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function checkAdminAuth(request: NextRequest, requestId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { error: apiResponse.unauthorized('Authentication required', requestId) };
  }

  if (!session.user.isAdmin) {
    return { error: apiResponse.forbidden('Admin access required', requestId) };
  }

  return { session };
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

/**
 * GET - Get feature flag details (Admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Auth check
    const { error, session } = await checkAdminAuth(request, requestId);
    if (error) return error;

    // Validate params
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid feature flag ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    // Fetch feature flag
    const flag = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!flag) {
      return apiResponse.notFound('Feature flag', requestId);
    }

    // Get usage stats
    const [userCount, recentLogs] = await Promise.all([
      prisma.user.count({
        where: {
          id: { in: flag.enabledUserIds }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: 'feature_flag',
          entityId: id
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          description: true,
          userId: true,
          createdAt: true,
        }
      })
    ]);

    logger.info('Admin fetched feature flag', {
      requestId,
      adminId: session!.user.id,
      flagId: id
    });

    return apiResponse.success({
      ...flag,
      stats: {
        enabledUserCount: flag.enabledUserIds.length,
        validUserCount: userCount,
        enabledTierCount: flag.enabledTiers.length,
      },
      recentActivity: recentLogs
    }, { meta: { requestId } });
  } catch (error) {
    logger.error('GET admin/feature-flags/[id] failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch feature flag', requestId);
  }
}

/**
 * PUT - Replace feature flag (Admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Auth check
    const { error, session } = await checkAdminAuth(request, requestId);
    if (error) return error;

    // Validate params
    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return apiResponse.validationError(
        'Invalid feature flag ID',
        paramsValidation.error.errors,
        requestId
      );
    }

    const { id } = paramsValidation.data;

    // Parse body (requires all fields for PUT)
    const body = await request.json();
    const fullUpdateSchema = updateSchema.required();
    const validation = fullUpdateSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid request body - all fields required for PUT',
        validation.error.errors,
        requestId
      );
    }

    const data = validation.data;

    // Check if exists
    const existing = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiResponse.notFound('Feature flag', requestId);
    }

    // Update feature flag
    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isEnabled: data.isEnabled,
        enabledForAll: data.enabledForAll,
        enabledUserIds: data.enabledUserIds,
        enabledTiers: data.enabledTiers,
        enabledPercentage: data.enabledPercentage,
        metadata: data.metadata || {},
      }
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'UPDATE',
        category: 'feature_flags',
        entityType: 'feature_flag',
        entityId: id,
        description: `Updated feature flag: ${existing.key}`,
        oldValue: existing,
        newValue: flag,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flag updated (PUT)', {
      requestId,
      adminId: session!.user.id,
      flagId: id
    });

    return apiResponse.success(flag, { meta: { requestId } });
  } catch (error) {
    logger.error('PUT admin/feature-flags/[id] failed', { requestId }, error);
    return apiResponse.internalError('Failed to update feature flag', requestId);
  }
}

/**
 * PATCH - Partially update feature flag (Admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Auth check
    const { error, session } = await checkAdminAuth(request, requestId);
    if (error) return error;

    // Validate params
    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return apiResponse.validationError(
        'Invalid feature flag ID',
        paramsValidation.error.errors,
        requestId
      );
    }

    const { id } = paramsValidation.data;

    // Parse body
    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid request body',
        validation.error.errors,
        requestId
      );
    }

    const data = validation.data;

    // Check if exists
    const existing = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiResponse.notFound('Feature flag', requestId);
    }

    // Update feature flag
    const flag = await prisma.featureFlag.update({
      where: { id },
      data
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'UPDATE',
        category: 'feature_flags',
        entityType: 'feature_flag',
        entityId: id,
        description: `Partially updated feature flag: ${existing.key}`,
        oldValue: existing,
        newValue: flag,
        changes: data,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flag updated (PATCH)', {
      requestId,
      adminId: session!.user.id,
      flagId: id,
      changes: Object.keys(data)
    });

    return apiResponse.success(flag, { meta: { requestId } });
  } catch (error) {
    logger.error('PATCH admin/feature-flags/[id] failed', { requestId }, error);
    return apiResponse.internalError('Failed to update feature flag', requestId);
  }
}

/**
 * DELETE - Delete feature flag (Admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Auth check
    const { error, session } = await checkAdminAuth(request, requestId);
    if (error) return error;

    // Validate params
    const validation = paramsSchema.safeParse(params);
    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid feature flag ID',
        validation.error.errors,
        requestId
      );
    }

    const { id } = validation.data;

    // Check if exists
    const existing = await prisma.featureFlag.findUnique({
      where: { id }
    });

    if (!existing) {
      return apiResponse.notFound('Feature flag', requestId);
    }

    // Delete feature flag
    await prisma.featureFlag.delete({
      where: { id }
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'DELETE',
        category: 'feature_flags',
        entityType: 'feature_flag',
        entityId: id,
        description: `Deleted feature flag: ${existing.key}`,
        oldValue: existing,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Feature flag deleted', {
      requestId,
      adminId: session!.user.id,
      flagId: id,
      key: existing.key
    });

    return apiResponse.success(
      { message: 'Feature flag deleted successfully' },
      { meta: { requestId } }
    );
  } catch (error) {
    logger.error('DELETE admin/feature-flags/[id] failed', { requestId }, error);
    return apiResponse.internalError('Failed to delete feature flag', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';