// src/app/api/platforms/[id]/settings/route.ts
/**
 * Platform Settings API
 * 
 * Manages user-specific settings for a platform connection.
 * 
 * @route GET   /api/platforms/[id]/settings - Get connection settings
 * @route PATCH /api/platforms/[id]/settings - Update connection settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, NotFoundError } from '@/lib/apiError';
import { auditLogService } from '@/services/auditLogService';
import { AuditAction, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const UpdateSettingsSchema = z.object({
  // Profile
  username: z.string().min(1).max(100).optional(),
  profileUrl: z.string().url().optional(),
  
  // Sync settings
  autoSync: z.boolean().optional(),
  syncPriority: z.number().int().min(0).max(10).optional(),
  
  // Notifications
  notifyOnSync: z.boolean().optional(),
  notifyOnError: z.boolean().optional(),
  
  // Status
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one setting must be provided',
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
  }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  return response;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const rateLimitKey = `platforms:settings:get:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            supportsAutoSync: true,
            syncInterval: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    logger.info('Platform settings fetched', {
      requestId,
      userId,
      platformId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          platform: {
            id: connection.platform.id,
            name: connection.platform.name,
            slug: connection.platform.slug,
            supportsAutoSync: connection.platform.supportsAutoSync,
            defaultSyncInterval: connection.platform.syncInterval,
          },
          settings: {
            // Profile
            username: connection.username,
            profileUrl: connection.profileUrl,
            
            // Sync
            autoSync: connection.autoSync,
            syncPriority: connection.syncPriority,
            
            // Notifications
            notifyOnSync: connection.notifyOnSync,
            notifyOnError: connection.notifyOnError,
            
            // Status
            isActive: connection.isActive,
            isVerified: connection.isVerified,
            connectionStatus: connection.connectionStatus,
          },
          metadata: {
            connectedAt: connection.createdAt,
            lastUpdated: connection.updatedAt,
            lastSyncedAt: connection.lastSyncedAt,
            nextSyncAt: connection.nextSyncAt,
          },
        },
        {
          meta: { requestId, duration: Date.now() - startTime },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('GET /api/platforms/[id]/settings failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { id: platformId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:settings:patch:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    const validation = UpdateSettingsSchema.safeParse(body);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Validation failed',
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const updates = validation.data;

    // Get existing connection
    const existing = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: { name: true, slug: true, supportsAutoSync: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Platform connection');
    }

    // Validate autoSync if platform doesn't support it
    if (updates.autoSync === true && !existing.platform.supportsAutoSync) {
      return addHeaders(
        apiResponse.validationError(
          'This platform does not support auto-sync',
          [{ field: 'autoSync', message: 'Auto-sync not supported' }],
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    // Build update data
    const updateData: Prisma.UserPlatformUpdateInput = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update connection
    const updated = await prisma.userPlatform.update({
      where: {
        userId_platformId: { userId, platformId },
      },
      data: updateData,
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.SETTINGS_CHANGE,
      category: 'platform',
      entityType: 'user_platform',
      entityId: updated.id,
      description: `Updated settings for ${existing.platform.name}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      changes: Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [
          key,
          { old: (existing as Record<string, unknown>)[key], new: value },
        ])
      ),
    });

    logger.info('Platform settings updated', {
      requestId,
      userId,
      platformId,
      platformSlug: existing.platform.slug,
      updatedFields: Object.keys(updates),
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          updated: true,
          settings: {
            username: updated.username,
            profileUrl: updated.profileUrl,
            autoSync: updated.autoSync,
            syncPriority: updated.syncPriority,
            notifyOnSync: updated.notifyOnSync,
            notifyOnError: updated.notifyOnError,
            isActive: updated.isActive,
          },
        },
        {
          meta: {
            requestId,
            message: 'Settings updated successfully',
            duration: Date.now() - startTime,
          },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('PATCH /api/platforms/[id]/settings failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';