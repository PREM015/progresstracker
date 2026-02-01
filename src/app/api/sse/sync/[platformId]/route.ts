// src/app/api/sse/sync/[platformId]/route.ts
/**
 * Platform-specific Sync Route
 * 
 * GET     /api/sse/sync/[platformId] - Get platform sync status
 * POST    /api/sse/sync/[platformId] - Trigger sync for specific platform
 * PUT     /api/sse/sync/[platformId] - Update platform sync settings
 * PATCH   /api/sse/sync/[platformId] - Partial update
 * DELETE  /api/sse/sync/[platformId] - Cancel platform sync
 * HEAD    /api/sse/sync/[platformId] - Check platform sync status
 * OPTIONS /api/sse/sync/[platformId] - CORS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SSEEventTypes, generateEventId } from '@/lib/sse';
import { sseConnectionManager } from '@/services/sseConnectionManager';
import {
  UnauthorizedError,
  NotFoundError,
  
  ValidationError,
  ApiError,
  toApiError,
} from '@/lib/apiError';
import { rateLimiters, checkRateLimit } from '@/lib/rateLimiter';

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ route: 'api/sse/sync/[platformId]' });
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// =============================================================================
// VALIDATION
// =============================================================================

const platformIdSchema = z.string().cuid();

const triggerSyncSchema = z.object({
  force: z.boolean().default(false),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

const updateSettingsSchema = z.object({
  autoSync: z.boolean(),
  syncPriority: z.number().int().min(0).max(10),
  notifyOnSync: z.boolean(),
  notifyOnError: z.boolean(),
});

const patchSettingsSchema = updateSettingsSchema.partial();

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ platformId: string }>;
}

// =============================================================================
// HELPERS
// =============================================================================

function getRequestContext(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function errorResponse(error: unknown, requestId: string): NextResponse {
  const apiError = toApiError(error, requestId);
  apiError.log();
  return NextResponse.json(
    { success: false, error: apiError.message, code: apiError.code, requestId },
    { status: apiError.statusCode, headers: { 'X-Request-ID': requestId } }
  );
}

function successResponse<T>(data: T, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(
    { success: true, data, timestamp: new Date().toISOString() },
    { status, headers: { 'Content-Type': 'application/json', ...headers } }
  );
}

async function validatePlatformAccess(platformId: string, userId: string) {
  const userPlatform = await prisma.userPlatform.findFirst({
    where: { platformId, userId },
    include: {
      platform: {
        select: { id: true, name: true, displayName: true, slug: true },
      },
    },
  });

  if (!userPlatform) {
    throw new NotFoundError('Platform connection');
  }

  return userPlatform;
}

async function getPlatformSyncHistory(platformId: string, userId: string, limit: number = 10) {
  return prisma.syncLog.findMany({
    where: { platformId, userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      duration: true,
      itemsCreated: true,
      itemsUpdated: true,
      itemsSkipped: true,
      itemsFailed: true,
      hasError: true,
      errorMessage: true,
    },
  });
}

// =============================================================================
// GET - Get Platform Sync Status
// =============================================================================

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { platformId } = await params;
    const validatedId = platformIdSchema.safeParse(platformId);
    if (!validatedId.success) throw new ValidationError('Invalid platform ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    const userPlatform = await validatePlatformAccess(validatedId.data, userId);

    // Get sync history
    const syncHistory = await getPlatformSyncHistory(validatedId.data, userId);

    // Get current sync if any
    const currentSync = await prisma.syncLog.findFirst({
      where: {
        platformId: validatedId.data,
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        itemsFound: true,
        itemsCreated: true,
        itemsUpdated: true,
      },
    });

    // Calculate stats
    const totalSyncs = syncHistory.length;
    const successfulSyncs = syncHistory.filter(s => s.status === 'SUCCESS').length;
    const avgDuration = syncHistory.length > 0
      ? Math.round(syncHistory.reduce((sum, s) => sum + (s.duration || 0), 0) / syncHistory.length)
      : 0;

    return successResponse({
      platform: {
        id: userPlatform.platform.id,
        name: userPlatform.platform.displayName || userPlatform.platform.name,
        slug: userPlatform.platform.slug,
      },
      connection: {
        id: userPlatform.id,
        username: userPlatform.username,
        isActive: userPlatform.isActive,
        isVerified: userPlatform.isVerified,
        connectionStatus: userPlatform.connectionStatus,
      },
      sync: {
        status: userPlatform.syncStatus,
        lastSyncedAt: userPlatform.lastSyncedAt,
        lastSyncError: userPlatform.lastSyncError,
        nextSyncAt: userPlatform.nextSyncAt,
        consecutiveFailures: userPlatform.consecutiveFailures,
      },
      settings: {
        autoSync: userPlatform.autoSync,
        syncPriority: userPlatform.syncPriority,
        notifyOnSync: userPlatform.notifyOnSync,
        notifyOnError: userPlatform.notifyOnError,
      },
      currentSync: currentSync ? {
        syncId: currentSync.id,
        status: currentSync.status,
        startedAt: currentSync.startedAt,
        progress: currentSync.itemsFound 
          ? Math.round(((currentSync.itemsCreated || 0) + (currentSync.itemsUpdated || 0)) / currentSync.itemsFound * 100)
          : 0,
      } : null,
      stats: {
        totalSyncs,
        successfulSyncs,
        successRate: totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 100,
        avgDuration,
      },
      history: syncHistory,
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// POST - Trigger Platform Sync
// =============================================================================

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { requestId, ip } = getRequestContext(req);

  try {
    const { platformId } = await params;
    const validatedId = platformIdSchema.safeParse(platformId);
    if (!validatedId.success) throw new ValidationError('Invalid platform ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`sse:sync:platform:${userId}:${platformId}`, rateLimiters.sync);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many sync requests for this platform', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: { 'Retry-After': '3600', 'X-Request-ID': requestId } }
      );
    }

    const userPlatform = await validatePlatformAccess(validatedId.data, userId);

    // Check if platform is connected
    if (userPlatform.connectionStatus !== 'connected') {
      throw new ApiError('Platform is not connected', 400, 'VALIDATION_ERROR');
    }

    // Check if sync is already in progress
    let body: unknown;
    try { body = await req.json(); } catch { body = {}; }

    const validated = triggerSyncSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const { force } = validated.data;

    if (!force && ['PENDING', 'IN_PROGRESS'].includes(userPlatform.syncStatus)) {
      throw new ApiError('Sync already in progress', 409, 'CONFLICT');
    }

    // Update platform status
    await prisma.userPlatform.update({
      where: { id: userPlatform.id },
      data: { syncStatus: 'PENDING', nextSyncAt: null },
    });

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId: validatedId.data,
        userPlatformId: userPlatform.id,
        status: 'PENDING',
        triggeredBy: 'manual',
        triggerSource: ip,
        dataFromDate: validated.data.fromDate ? new Date(validated.data.fromDate) : undefined,
        dataToDate: validated.data.toDate ? new Date(validated.data.toDate) : undefined,
      },
    });

    // Send SSE notification
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.SYNC_STARTED,
      data: {
        syncId: syncLog.id,
        platformId: validatedId.data,
        platformName: userPlatform.platform.displayName || userPlatform.platform.name,
        status: 'pending',
        progress: 0,
        itemsProcessed: 0,
        totalItems: 0,
        startedAt: new Date().toISOString(),
      },
    });

    log.info('Platform sync triggered', { userId, platformId: validatedId.data, syncId: syncLog.id });

    return successResponse({
      message: 'Sync triggered successfully',
      syncId: syncLog.id,
      platformId: validatedId.data,
      platformName: userPlatform.platform.displayName || userPlatform.platform.name,
      status: 'pending',
    }, 202, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PUT - Update Platform Sync Settings
// =============================================================================

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { platformId } = await params;
    const validatedId = platformIdSchema.safeParse(platformId);
    if (!validatedId.success) throw new ValidationError('Invalid platform ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    const userPlatform = await validatePlatformAccess(validatedId.data, userId);

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = updateSettingsSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    const updated = await prisma.userPlatform.update({
      where: { id: userPlatform.id },
      data: {
        autoSync: validated.data.autoSync,
        syncPriority: validated.data.syncPriority,
        notifyOnSync: validated.data.notifyOnSync,
        notifyOnError: validated.data.notifyOnError,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        autoSync: true,
        syncPriority: true,
        notifyOnSync: true,
        notifyOnError: true,
      },
    });

    log.info('Platform sync settings updated', { userId, platformId: validatedId.data });

    return successResponse({ settings: updated }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// PATCH - Partial Update
// =============================================================================

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { platformId } = await params;
    const validatedId = platformIdSchema.safeParse(platformId);
    if (!validatedId.success) throw new ValidationError('Invalid platform ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    const userPlatform = await validatePlatformAccess(validatedId.data, userId);

    let body: unknown;
    try { body = await req.json(); } catch { throw new ValidationError('Invalid JSON'); }

    const validated = patchSettingsSchema.safeParse(body);
    if (!validated.success) {
      throw new ValidationError('Validation failed', validated.error.errors.map(e => ({
        field: e.path.join('.'), message: e.message,
      })));
    }

    if (Object.keys(validated.data).length === 0) {
      throw new ValidationError('At least one field required');
    }

    const updated = await prisma.userPlatform.update({
      where: { id: userPlatform.id },
      data: {
        ...validated.data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        autoSync: true,
        syncPriority: true,
        notifyOnSync: true,
        notifyOnError: true,
      },
    });

    log.info('Platform sync settings patched', { userId, platformId: validatedId.data, fields: Object.keys(validated.data) });

    return successResponse({ settings: updated }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// DELETE - Cancel Platform Sync
// =============================================================================

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { platformId } = await params;
    const validatedId = platformIdSchema.safeParse(platformId);
    if (!validatedId.success) throw new ValidationError('Invalid platform ID');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError('Authentication required');

    const userId = session.user.id;
    const userPlatform = await validatePlatformAccess(validatedId.data, userId);

    // Find and cancel active syncs
    const activeSyncs = await prisma.syncLog.findMany({
      where: {
        platformId: validatedId.data,
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });

    if (activeSyncs.length === 0) {
      return successResponse({ message: 'No active syncs to cancel', cancelledCount: 0 }, 200, { 'X-Request-ID': requestId });
    }

    // Cancel syncs
    await prisma.syncLog.updateMany({
      where: { id: { in: activeSyncs.map(s => s.id) } },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    // Update platform status
    await prisma.userPlatform.update({
      where: { id: userPlatform.id },
      data: { syncStatus: 'CANCELLED' },
    });

    // Send SSE notification
    sseConnectionManager.sendToUser(userId, {
      id: generateEventId(),
      event: SSEEventTypes.SYNC_CANCELLED,
      data: {
        platformId: validatedId.data,
        platformName: userPlatform.platform.displayName || userPlatform.platform.name,
        cancelledSyncs: activeSyncs.map(s => s.id),
        cancelledAt: new Date().toISOString(),
      },
    });

    log.info('Platform sync cancelled', { userId, platformId: validatedId.data, cancelledCount: activeSyncs.length });

    return successResponse({
      message: 'Sync cancelled',
      cancelledCount: activeSyncs.length,
      cancelledSyncs: activeSyncs.map(s => s.id),
    }, 200, { 'X-Request-ID': requestId });

  } catch (error) {
    return errorResponse(error, requestId);
  }
}

// =============================================================================
// HEAD - Check Platform Sync Status
// =============================================================================

export async function HEAD(req: NextRequest, { params }: RouteParams) {
  const { requestId } = getRequestContext(req);

  try {
    const { platformId } = await params;
    const validatedId = platformIdSchema.safeParse(platformId);
    if (!validatedId.success) {
      return new NextResponse(null, { status: 400, headers: { 'X-Request-ID': requestId } });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const userPlatform = await prisma.userPlatform.findFirst({
      where: { platformId: validatedId.data, userId: session.user.id },
      select: {
        syncStatus: true,
        lastSyncedAt: true,
        connectionStatus: true,
        consecutiveFailures: true,
      },
    });

    if (!userPlatform) {
      return new NextResponse(null, { status: 404, headers: { 'X-Request-ID': requestId } });
    }

    const isSyncing = ['PENDING', 'IN_PROGRESS'].includes(userPlatform.syncStatus);

    return new NextResponse(null, {
      status: isSyncing ? 202 : 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Sync-Status': userPlatform.syncStatus,
        'X-Connection-Status': userPlatform.connectionStatus,
        'X-Last-Sync': userPlatform.lastSyncedAt?.toISOString() || 'never',
        'X-Consecutive-Failures': String(userPlatform.consecutiveFailures),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}

// =============================================================================
// OPTIONS
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