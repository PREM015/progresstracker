// src/app/api/platforms/[id]/disconnect/route.ts
/**
 * Platform Disconnect API
 * 
 * @route POST   /api/platforms/[id]/disconnect - Disconnect platform
 * @route DELETE /api/platforms/[id]/disconnect - Same as POST (alias)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withTransaction } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, NotFoundError, ValidationError } from '@/lib/apiError';
import { auditLogService } from '@/services/auditLogService';
import { AuditAction } from '@prisma/client';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

const DisconnectOptionsSchema = z.object({
  deleteData: z.boolean().default(false),
  deleteSyncLogs: z.boolean().default(false),
  reason: z.string().max(500).optional(),
  confirm: z.boolean().optional(),
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

/**
 * Handle disconnect logic
 */
async function handleDisconnect(
  request: NextRequest,
  platformId: string
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:disconnect:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse options
    let options = { deleteData: false, deleteSyncLogs: false };
    try {
      const body = await request.json();
      const validation = DisconnectOptionsSchema.safeParse(body);
      if (validation.success) {
        options = validation.data;
      }
    } catch {
      // Use defaults
    }

    // Get connection
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: { userId, platformId },
      },
      include: {
        platform: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    // Get counts before deletion
    const [entryCount, syncLogCount] = await Promise.all([
      prisma.trackerEntry.count({
        where: { userId, platformId },
      }),
      prisma.syncLog.count({
        where: { userId, platformId },
      }),
    ]);

    // Require confirmation if deleting data
    if ((options.deleteData || options.deleteSyncLogs) && entryCount > 0) {
      const { confirm } = options as { confirm?: boolean };
      if (!confirm) {
        return addHeaders(
          apiResponse.validationError(
            'Confirmation required',
            [{
              field: 'confirm',
              message: `This will delete ${entryCount} entries. Set confirm: true to proceed.`,
            }],
            requestId
          ),
          requestId,
          { rateLimitResult }
        );
      }
    }

    // Execute disconnect in transaction
    const result = await withTransaction(async (tx) => {
      let entriesDeleted = 0;
      let syncLogsDeleted = 0;

      if (options.deleteData) {
        const deleted = await tx.trackerEntry.deleteMany({
          where: { userId, platformId },
        });
        entriesDeleted = deleted.count;
      }

      if (options.deleteSyncLogs) {
        const deleted = await tx.syncLog.deleteMany({
          where: { userId, platformId },
        });
        syncLogsDeleted = deleted.count;
      }

      // Delete connection
      await tx.userPlatform.delete({
        where: {
          userId_platformId: { userId, platformId },
        },
      });

      // Update platform stats
      await tx.platform.update({
        where: { id: platformId },
        data: { totalUsers: { decrement: 1 } },
      });

      // Update subscription count
      await tx.subscription.update({
        where: { userId },
        data: { currentPlatformCount: { decrement: 1 } },
      }).catch(() => {
        // Ignore if no subscription
      });

      return {
        entriesDeleted,
        syncLogsDeleted,
        entriesPreserved: options.deleteData ? 0 : entryCount,
        syncLogsPreserved: options.deleteSyncLogs ? 0 : syncLogCount,
      };
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.DELETE,
      category: 'platform',
      entityType: 'user_platform',
      entityId: connection.id,
      description: `Disconnected from ${connection.platform.name}${options.reason ? `: ${options.reason}` : ''}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      oldValue: {
        platformId,
        platformName: connection.platform.name,
        entriesDeleted: result.entriesDeleted,
        syncLogsDeleted: result.syncLogsDeleted,
      },
    });

    logger.info('Platform disconnected', {
      requestId,
      userId,
      platformId,
      platformSlug: connection.platform.slug,
      entriesDeleted: result.entriesDeleted,
      syncLogsDeleted: result.syncLogsDeleted,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          disconnected: true,
          platform: {
            id: connection.platform.id,
            name: connection.platform.name,
            slug: connection.platform.slug,
          },
          dataDeleted: {
            entries: result.entriesDeleted,
            syncLogs: result.syncLogsDeleted,
          },
          dataPreserved: {
            entries: result.entriesPreserved,
            syncLogs: result.syncLogsPreserved,
          },
        },
        {
          meta: {
            requestId,
            message: `Successfully disconnected from ${connection.platform.name}`,
            duration: Date.now() - startTime,
          },
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('Disconnect failed', { requestId, platformId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
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
  const { id: platformId } = await params;
  return handleDisconnect(request, platformId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: platformId } = await params;
  return handleDisconnect(request, platformId);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';