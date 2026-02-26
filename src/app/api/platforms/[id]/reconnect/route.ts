// src/app/api/platforms/[id]/reconnect/route.ts
/**
 * Platform Reconnect API
 * 
 * Re-establishes connection for previously disconnected or errored platforms.
 * 
 * @route POST /api/platforms/[id]/reconnect - Reconnect to platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@/lib/apiError';
import PlatformService from '@/services/platformService';
import { auditLogService } from '@/services/auditLogService';
import { encrypt, encryptJSON } from '@/lib/encryption';
import { AuditAction, Prisma } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 10;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const ReconnectSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.coerce.date().optional(),
  apiKey: z.string().optional(),
  credentials: z.record(z.unknown()).optional(),
  clearErrors: z.boolean().default(true),
  verify: z.boolean().default(true),
  triggerSync: z.boolean().default(false),
});

type ReconnectInput = z.infer<typeof ReconnectSchema>;

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

export async function POST(
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
    const rateLimitKey = `platforms:reconnect:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse options
    let body: ReconnectInput = { clearErrors: true, verify: true, triggerSync: false };
    try {
      const parsed = await request.json();
      const validation = ReconnectSchema.safeParse(parsed);
      if (validation.success) {
        body = validation.data;
      }
    } catch {
      // Use defaults
    }

    // Get existing connection
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
            isActive: true,
            maintenanceMode: true,
            supportsAutoSync: true,
            profileUrlPattern: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    if (!connection.platform.isActive || connection.platform.maintenanceMode) {
      throw new ValidationError(`${connection.platform.name} is currently unavailable`);
    }

    // Check if already connected and active
    if (connection.isActive && connection.connectionStatus === 'connected' && !body.clearErrors) {
      throw new ConflictError('Platform is already connected');
    }

    // Build update data
    const updateData: Prisma.UserPlatformUpdateInput = {
      isActive: true,
      connectionStatus: 'connected',
      updatedAt: new Date(),
    };

    // Clear errors if requested
    if (body.clearErrors) {
      updateData.connectionError = null;
      updateData.lastSyncError = null;
      updateData.consecutiveFailures = 0;
    }

    // Update username if provided
    if (body.username) {
      updateData.username = body.username;
      
      // Update profile URL
      if (connection.platform.profileUrlPattern) {
        updateData.profileUrl = connection.platform.profileUrlPattern.replace(
          '{username}',
          body.username
        );
      }
    }

    // Update credentials if provided
    if (body.accessToken) {
      updateData.accessToken = encrypt(body.accessToken);
    }

    if (body.refreshToken) {
      updateData.refreshToken = encrypt(body.refreshToken);
    }

    if (body.tokenExpiresAt) {
      updateData.tokenExpiresAt = body.tokenExpiresAt;
    }

    if (body.apiKey) {
      updateData.apiKey = encrypt(body.apiKey);
    }

    if (body.credentials) {
      updateData.credentials = encryptJSON(body.credentials) as unknown as Prisma.InputJsonValue;
    }

    // Update connection
    const updated = await prisma.userPlatform.update({
      where: {
        userId_platformId: { userId, platformId },
      },
      data: updateData,
    });

    // Verify if requested
    let verificationResult: { verified: boolean; error?: string } = { verified: false };
    if (body.verify) {
      try {
        await PlatformService.verifyConnection(userId, platformId);
        verificationResult = { verified: true };
      } catch (error) {
        verificationResult = {
          verified: false,
          error: error instanceof Error ? error.message : 'Verification failed',
        };
      }
    }

    // Trigger sync if requested
    let syncTriggered = false;
    if (body.triggerSync && connection.platform.supportsAutoSync) {
      try {
        const SyncService = (await import('@/services/syncService')).default;
        SyncService.syncPlatform(userId, platformId, { triggeredBy: 'manual' })
          .catch(err => logger.error('Background sync failed', { userId, platformId }, err));
        syncTriggered = true;
      } catch {
        // Ignore sync errors
      }
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.UPDATE,
      category: 'platform',
      entityType: 'user_platform',
      entityId: updated.id,
      description: `Reconnected to ${connection.platform.name}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
    });

    logger.info('Platform reconnected', {
      requestId,
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      verified: verificationResult.verified,
      syncTriggered,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          reconnected: true,
          platform: {
            id: connection.platform.id,
            name: connection.platform.name,
            slug: connection.platform.slug,
          },
          connection: {
            id: updated.id,
            username: updated.username,
            isActive: updated.isActive,
            connectionStatus: updated.connectionStatus,
          },
          verification: verificationResult,
          syncTriggered,
        },
        {
          meta: {
            requestId,
            message: `Successfully reconnected to ${connection.platform.name}`,
            duration: Date.now() - startTime,
          },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('POST /api/platforms/[id]/reconnect failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';