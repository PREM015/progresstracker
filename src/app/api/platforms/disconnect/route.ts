// src/app/api/platforms/disconnect/route.ts
/**
 * Platform Disconnection API
 * 
 * @route POST /api/platforms/disconnect - Disconnect a platform
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { UnauthorizedError, ValidationError, NotFoundError } from '@/lib/apiError';
import { checkRateLimit, rateLimiters } from '@/lib/rateLimiter';
import PlatformService from '@/services/platformService';

const log = logger.child({ route: 'platforms/disconnect' });

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const DisconnectSchema = z.object({
  platformId: z.string().cuid('Invalid platform ID'),
  deleteData: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

// =============================================================================
// POST /api/platforms/disconnect
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Authenticate
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = token.id as string;

    // Rate limit
    const rateLimitResult = await checkRateLimit(`platforms:disconnect:${userId}`, rateLimiters.api);
    
    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Validate
    const validationResult = DisconnectSchema.safeParse(body);
    if (!validationResult.success) {
      return apiResponse.validationError(
        'Validation failed',
        validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId
      );
    }

    const { platformId, deleteData, reason } = validationResult.data;

    // Check if connection exists
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      include: {
        platform: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Platform connection');
    }

    // Get entry count before deletion
    const entryCount = await prisma.trackerEntry.count({
      where: {
        userId,
        platformId,
      },
    });

    // Disconnect platform
    await PlatformService.disconnectPlatform(userId, platformId);

    // Delete tracker data if requested
    if (deleteData && entryCount > 0) {
      await prisma.trackerEntry.deleteMany({
        where: {
          userId,
          platformId,
        },
      });

      log.info('Tracker data deleted', {
        userId,
        platformId,
        entriesDeleted: entryCount,
      });
    }

    // Update subscription count
    await prisma.subscription.updateMany({
      where: { userId },
      data: {
        currentPlatformCount: { decrement: 1 },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        category: 'platform',
        entityType: 'user_platform',
        entityId: connection.id,
        description: `Disconnected platform: ${connection.platform.name}${reason ? ` - Reason: ${reason}` : ''}`,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      },
    });

    log.info('Platform disconnected', {
      userId,
      platformId,
      platformName: connection.platform.name,
      dataDeleted: deleteData,
      entriesDeleted: deleteData ? entryCount : 0,
      duration: Date.now() - startTime,
    });

    return apiResponse.success(
      {
        disconnected: true,
        platform: {
          id: platformId,
          name: connection.platform.name,
          slug: connection.platform.slug,
        },
        dataDeleted: deleteData,
        entriesDeleted: deleteData ? entryCount : 0,
      },
      {
        status: 200,
        meta: {
          requestId,
          message: `Successfully disconnected ${connection.platform.name}`,
        },
      }
    );

  } catch (error) {
    log.error('Error disconnecting platform', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}