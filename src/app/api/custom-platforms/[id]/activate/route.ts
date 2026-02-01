// src/app/api/custom-platforms/[id]/activate/route.ts
/**
 * Custom Platform Activation Routes
 * 
 * POST /api/custom-platforms/[id]/activate   - Activate/Reactivate platform
 * DELETE /api/custom-platforms/[id]/activate - Deactivate platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  ApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';
import { auditLogService } from '@/services/auditLogService';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/custom-platforms/[id]/activate' });

const ALLOWED_METHODS = ['POST', 'DELETE', 'OPTIONS'];

const MAX_ACTIVE_PLATFORMS_FREE = 5;
const MAX_ACTIVE_PLATFORMS_PRO = 50;

// =============================================================================
// VALIDATION
// =============================================================================

const idSchema = z.string().cuid({ message: 'Invalid platform ID format' });

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();

  return NextResponse.json(
    {
      success: false,
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: apiError.timestamp,
      requestId,
    },
    { 
      status: apiError.statusCode,
      headers: { 'X-Request-ID': requestId },
    }
  );
}

function successResponse<T>(
  data: T, 
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { 
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

async function checkActivePlatformLimit(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [subscription, currentCount] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true, platformLimit: true },
    }),
    prisma.customPlatform.count({
      where: { userId, isActive: true },
    }),
  ]);

  const limit = subscription?.platformLimit 
    || (subscription?.tier === 'PRO' || subscription?.tier === 'TEAM' || subscription?.tier === 'ENTERPRISE'
      ? MAX_ACTIVE_PLATFORMS_PRO 
      : MAX_ACTIVE_PLATFORMS_FREE);

  return {
    allowed: currentCount < limit,
    current: currentCount,
    limit,
  };
}

// =============================================================================
// POST - Activate Platform
// =============================================================================

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:activate:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Find platform
    const platform = await prisma.customPlatform.findFirst({
      where: { id: validatedId.data, userId },
      select: { 
        id: true, 
        name: true, 
        isActive: true,
      },
    });

    if (!platform) {
      throw new NotFoundError('Custom platform');
    }

    // 5. Check if already active
    if (platform.isActive) {
      return successResponse(
        {
          message: 'Platform is already active',
          platform: { id: platform.id, name: platform.name, isActive: true },
        },
        200,
        { 'X-Request-ID': requestId }
      );
    }

    // 6. Check platform limit
    const limitCheck = await checkActivePlatformLimit(userId);
    if (!limitCheck.allowed) {
      throw new ApiError(
        `You have reached your limit of ${limitCheck.limit} active custom platforms. Upgrade your plan or deactivate another platform.`,
        403,
        'SUBSCRIPTION_REQUIRED',
        [{ 
          field: 'subscription',
          value: { current: limitCheck.current, limit: limitCheck.limit },
        }]
      );
    }

    // 7. Activate platform
    const updatedPlatform = await prisma.customPlatform.update({
      where: { id: validatedId.data },
      data: { 
        isActive: true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // 8. Audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      entityId: updatedPlatform.id,
      description: `Activated custom platform: ${updatedPlatform.name}`,
      oldValue: { isActive: false },
      newValue: { isActive: true },
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Platform activated', { 
      platformId: validatedId.data, 
      userId, 
      duration,
    });

    return successResponse(
      {
        message: 'Platform activated successfully',
        platform: updatedPlatform,
        activePlatforms: {
          current: limitCheck.current + 1,
          limit: limitCheck.limit,
        },
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Deactivate Platform
// =============================================================================

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip, userAgent } = getRequestContext(req);
  const startTime = Date.now();

  try {
    // 1. Validate ID
    const { id } = await params;
    const validatedId = idSchema.safeParse(id);
    if (!validatedId.success) {
      throw new ValidationError('Invalid platform ID', [{ field: 'id', message: validatedId.error.errors[0].message }]);
    }

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // 3. Rate limiting
    const rateLimitResult = await checkRateLimit(`custom-platforms:activate:${userId}`, rateLimiters.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '60', 'X-Request-ID': requestId } }
      );
    }

    // 4. Find platform
    const platform = await prisma.customPlatform.findFirst({
      where: { id: validatedId.data, userId },
      select: { 
        id: true, 
        name: true, 
        isActive: true,
      },
    });

    if (!platform) {
      throw new NotFoundError('Custom platform');
    }

    // 5. Check if already inactive
    if (!platform.isActive) {
      return successResponse(
        {
          message: 'Platform is already deactivated',
          platform: { id: platform.id, name: platform.name, isActive: false },
        },
        200,
        { 'X-Request-ID': requestId }
      );
    }

    // 6. Deactivate platform
    const updatedPlatform = await prisma.customPlatform.update({
      where: { id: validatedId.data },
      data: { 
        isActive: false,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // 7. Audit log
    await auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'custom-platform',
      entityType: 'CustomPlatform',
      entityId: updatedPlatform.id,
      description: `Deactivated custom platform: ${updatedPlatform.name}`,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      ipAddress: ip,
      userAgent,
      requestId,
      status: 'success',
    });

    const duration = Date.now() - startTime;
    log.info('Platform deactivated', { 
      platformId: validatedId.data, 
      userId, 
      duration,
    });

    return successResponse(
      {
        message: 'Platform deactivated successfully',
        platform: updatedPlatform,
      },
      200,
      {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`,
      }
    );

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// OPTIONS - Return allowed methods
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}