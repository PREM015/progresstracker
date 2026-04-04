// src/app/api/platforms/bulk/route.ts
/**
 * Bulk Platform Operations API
 * 
 * Handles bulk operations on platform connections with transaction support,
 * audit logging, idempotency, and background job queuing.
 * 
 * @route GET    /api/platforms/bulk - Get bulk operation history
 * @route POST   /api/platforms/bulk - Bulk connect platforms
 * @route PATCH  /api/platforms/bulk - Bulk update platform settings
 * @route DELETE /api/platforms/bulk - Bulk disconnect platforms
 * @route HEAD   /api/platforms/bulk - Check bulk operation status
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { tasks } from '@trigger.dev/sdk/v3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withTransaction } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { 
  UnauthorizedError, 
  ValidationError, 
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from '@/lib/apiError';
import PlatformService from '@/services/platformService';
import { auditLogService } from '@/services/auditLogService';
import { encrypt, encryptJSON } from '@/lib/encryption';
import { AuditAction, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,           // 60 requests per minute for listing
  POST: 5,           // 5 bulk connects per hour (strict)
  PATCH: 30,         // 30 bulk updates per minute
  DELETE: 10,        // 10 bulk deletes per hour
} as const;

const OPERATION_LIMITS = {
  MAX_PLATFORMS_PER_CONNECT: 10,
  MAX_PLATFORMS_PER_UPDATE: 50,
  MAX_PLATFORMS_PER_DELETE: 20,
} as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// TYPES
// =============================================================================

interface BulkOperationResult {
  operationId: string;
  type: 'connect' | 'update' | 'delete';
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    platformId: string;
    platformName?: string;
    success: boolean;
    error?: string;
    data?: unknown;
  }>;
  duration: number;
  timestamp: string;
}

interface BulkOperationLog {
  id: string;
  userId: string;
  operationType: string;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  duration: number;
  createdAt: Date;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const BulkConnectItemSchema = z.object({
  platformId: z.string().cuid('Invalid platform ID'),
  username: z.string().min(1).max(100).optional(),
  profileUrl: z.string().url().optional(),
  externalUserId: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.coerce.date().optional(),
  apiKey: z.string().optional(),
  credentials: z.record(z.unknown()).optional(),
  autoSync: z.boolean().default(true),
  syncPriority: z.number().int().min(0).max(10).default(0),
  notifyOnSync: z.boolean().default(false),
  notifyOnError: z.boolean().default(true),
});

const BulkConnectSchema = z.object({
  platforms: z
    .array(BulkConnectItemSchema)
    .min(1, 'At least one platform required')
    .max(OPERATION_LIMITS.MAX_PLATFORMS_PER_CONNECT, 
      `Maximum ${OPERATION_LIMITS.MAX_PLATFORMS_PER_CONNECT} platforms allowed`),
  skipDuplicates: z.boolean().default(true),
  verifyConnections: z.boolean().default(false),
  scheduleSync: z.boolean().default(false),
});

const BulkUpdateSchema = z.object({
  platformIds: z
    .array(z.string().cuid())
    .min(1, 'At least one platform ID required')
    .max(OPERATION_LIMITS.MAX_PLATFORMS_PER_UPDATE, 
      `Maximum ${OPERATION_LIMITS.MAX_PLATFORMS_PER_UPDATE} platforms allowed`),
  updates: z.object({
    autoSync: z.boolean().optional(),
    syncPriority: z.number().int().min(0).max(10).optional(),
    notifyOnSync: z.boolean().optional(),
    notifyOnError: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field required',
  }),
});

const BulkDeleteSchema = z.object({
  platformIds: z
    .array(z.string().cuid())
    .min(1, 'At least one platform ID required')
    .max(OPERATION_LIMITS.MAX_PLATFORMS_PER_DELETE, 
      `Maximum ${OPERATION_LIMITS.MAX_PLATFORMS_PER_DELETE} platforms allowed`),
  deleteData: z.boolean().default(false),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Confirmation required for bulk delete' }),
  }),
});

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['connect', 'update', 'delete']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  options?: {
    rateLimitResult?: { limit: number; remaining: number };
    operationId?: string;
  }
): NextResponse {
  // Security and CORS headers
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('X-Request-ID', requestId);

  if (options?.operationId) {
    response.headers.set('X-Operation-ID', options.operationId);
  }

  if (options?.rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(options.rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(options.rateLimitResult.remaining));
  }

  return response;
}

/**
 * Check idempotency key to prevent duplicate operations
 */
async function checkIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<BulkOperationResult | null> {
  // Check if operation with this key already exists (last 24 hours)
  const existingOperation = await prisma.$queryRaw<Array<{ result: string }>>`
    SELECT result FROM bulk_operations 
    WHERE user_id = ${userId} 
      AND idempotency_key = ${idempotencyKey}
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1
  `.catch(() => null);

  if (existingOperation && existingOperation.length > 0) {
    return JSON.parse(existingOperation[0].result) as BulkOperationResult;
  }

  return null;
}

/**
 * Save bulk operation result for idempotency
 */
async function saveOperationResult(
  userId: string,
  idempotencyKey: string | null,
  result: BulkOperationResult
): Promise<void> {
  if (!idempotencyKey) return;

  try {
    await prisma.$executeRaw`
      INSERT INTO bulk_operations (user_id, idempotency_key, result, created_at)
      VALUES (${userId}, ${idempotencyKey}, ${JSON.stringify(result)}::jsonb, NOW())
      ON CONFLICT (user_id, idempotency_key) DO NOTHING
    `;
  } catch (error) {
    logger.warn('Failed to save idempotency result', { userId, idempotencyKey,error });
  }
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

/**
 * HEAD - Check bulk operation status
 * 
 * Returns headers indicating if there are pending bulk operations
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    // Count recent operations
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM bulk_operations 
      WHERE user_id = ${session.user.id}
        AND created_at > NOW() - INTERVAL '1 hour'
    `.then(rows => Number(rows[0]?.count || 0));

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Bulk-Operations-Count', String(count));
    response.headers.set('X-Has-Pending', String(count > 0));

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD /api/platforms/bulk failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/bulk
 * 
 * Get bulk operation history for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:bulk:get:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = QuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      type: searchParams.get('type') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    if (!queryValidation.success) {
      return addHeaders(
        apiResponse.validationError(
          'Invalid query parameters',
          queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId
        ),
        requestId,
        { rateLimitResult }
      );
    }

    const { page, limit, type, startDate, endDate } = queryValidation.data;

    // Build SQL query (assuming we have a bulk_operations table)
    const whereConditions: string[] = [`user_id = '${userId}'`];
    
    if (type) {
      whereConditions.push(`operation_type = '${type}'`);
    }
    
    if (startDate) {
      whereConditions.push(`created_at >= '${startDate.toISOString()}'`);
    }
    
    if (endDate) {
      whereConditions.push(`created_at <= '${endDate.toISOString()}'`);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    const [operations, totalCount] = await Promise.all([
      prisma.$queryRaw<Array<{
        id: string;
        operation_type: string;
        total_items: number;
        successful_items: number;
        failed_items: number;
        duration: number;
        created_at: Date;
      }>>`
        SELECT id, operation_type, total_items, successful_items, failed_items, duration, created_at
        FROM bulk_operations
        WHERE ${Prisma.raw(whereClause)}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `.catch(() => []),
      
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM bulk_operations
        WHERE ${Prisma.raw(whereClause)}
      `.then(rows => Number(rows[0]?.count || 0)),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    logger.info('Bulk operations history retrieved', {
      userId,
      requestId,
      page,
      count: operations.length,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          operations: operations.map(op => ({
            id: op.id,
            type: op.operation_type,
            totalItems: op.total_items,
            successfulItems: op.successful_items,
            failedItems: op.failed_items,
            duration: op.duration,
            createdAt: op.created_at,
          })),
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
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
    logger.error('GET /api/platforms/bulk failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * POST /api/platforms/bulk
 * 
 * Bulk connect multiple platforms
 * 
 * Supports:
 * - Idempotency via X-Idempotency-Key header
 * - Transaction rollback on failure
 * - Subscription limit checking
 * - Duplicate detection
 * - Optional connection verification
 * - Audit logging
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const operationId = nanoid();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Rate limiting (stricter for bulk connects)
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:bulk:connect:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId), // 1 hour
        requestId,
        { rateLimitResult, operationId }
      );
    }

    // Check idempotency
    const idempotencyKey = request.headers.get('x-idempotency-key');
    if (idempotencyKey) {
      const cachedResult = await checkIdempotency(userId, idempotencyKey);
      if (cachedResult) {
        logger.info('Returning cached bulk connect result', { userId, idempotencyKey });
        return addHeaders(
          apiResponse.success(cachedResult, {
            meta: { requestId, operationId, cached: true },
          }),
          requestId,
          { rateLimitResult, operationId }
        );
      }
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = BulkConnectSchema.safeParse(body);
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
        { rateLimitResult, operationId }
      );
    }

    const { platforms, skipDuplicates, verifyConnections, scheduleSync } = validation.data;

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        platformLimit: true,
        currentPlatformCount: true,
        tier: true,
      },
    });

    const currentCount = subscription?.currentPlatformCount || 0;
    const limit = subscription?.platformLimit || 5; // Default FREE tier limit

    if (currentCount + platforms.length > limit) {
      throw new ForbiddenError(
        `Cannot connect ${platforms.length} platforms. ` +
        `Limit: ${limit}, Current: ${currentCount}. ` +
        `Upgrade your plan for more connections.`
      );
    }

    // Execute bulk connect in transaction
    const result = await withTransaction(async (tx) => {
      const results: BulkOperationResult['results'] = [];
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;

      for (const platformData of platforms) {
        try {
          // Check if already connected
          const existingConnection = await tx.userPlatform.findUnique({
            where: {
              userId_platformId: {
                userId,
                platformId: platformData.platformId,
              },
            },
          });

          if (existingConnection) {
            if (skipDuplicates) {
              skippedCount++;
              results.push({
                platformId: platformData.platformId,
                success: false,
                error: 'Platform already connected',
              });
              continue;
            } else {
              throw new ConflictError('Platform already connected');
            }
          }

          // Get platform details
          const platform = await tx.platform.findUnique({
            where: { id: platformData.platformId },
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
              maintenanceMode: true,
              supportsAutoSync: true,
              profileUrlPattern: true,
            },
          });

          if (!platform) {
            throw new NotFoundError('Platform');
          }

          if (!platform.isActive || platform.maintenanceMode) {
            throw new ValidationError(`${platform.name} is currently unavailable`);
          }

          // Build profile URL
          let profileUrl = platformData.profileUrl;
          if (!profileUrl && platformData.username && platform.profileUrlPattern) {
            profileUrl = platform.profileUrlPattern.replace('{username}', platformData.username);
          }

          // Encrypt sensitive data
          const encryptedAccessToken = platformData.accessToken 
            ? encrypt(platformData.accessToken) 
            : null;
          
          const encryptedRefreshToken = platformData.refreshToken 
            ? encrypt(platformData.refreshToken) 
            : null;
          
          const encryptedApiKey = platformData.apiKey 
            ? encrypt(platformData.apiKey) 
            : null;

          const encryptedCredentials = platformData.credentials
            ? encryptJSON(platformData.credentials)
            : null;

          // Create connection
          const connection = await tx.userPlatform.create({
            data: {
              userId,
              platformId: platformData.platformId,
              username: platformData.username,
              profileUrl,
              externalUserId: platformData.externalUserId,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt: platformData.tokenExpiresAt,
              apiKey: encryptedApiKey,
              credentials: encryptedCredentials as Prisma.InputJsonValue,
              isActive: true,
              connectionStatus: 'connected',
              autoSync: platformData.autoSync && platform.supportsAutoSync,
              syncPriority: platformData.syncPriority,
              notifyOnSync: platformData.notifyOnSync,
              notifyOnError: platformData.notifyOnError,
              syncStatus: 'IDLE',
            },
          });

          // Update platform user count
          await tx.platform.update({
            where: { id: platformData.platformId },
            data: { totalUsers: { increment: 1 } },
          });

          successCount++;
          results.push({
            platformId: platformData.platformId,
            platformName: platform.name,
            success: true,
            data: {
              connectionId: connection.id,
              username: connection.username,
              profileUrl: connection.profileUrl,
            },
          });

        } catch (error) {
          failCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.push({
            platformId: platformData.platformId,
            success: false,
            error: errorMessage,
          });

          logger.error('Failed to connect platform in bulk', {
            userId,
            platformId: platformData.platformId,
          }, error);

          // Don't throw - continue with other platforms
        }
      }

      // Update subscription count
      if (subscription && successCount > 0) {
        await tx.subscription.update({
          where: { userId },
          data: {
            currentPlatformCount: { increment: successCount },
          },
        });
      }

      const duration = Date.now() - startTime;

      const operationResult: BulkOperationResult = {
        operationId,
        type: 'connect',
        total: platforms.length,
        successful: successCount,
        failed: failCount,
        skipped: skippedCount,
        results,
        duration,
        timestamp: new Date().toISOString(),
      };

      return operationResult;
    });

    // Save idempotency result
    if (idempotencyKey) {
      await saveOperationResult(userId, idempotencyKey, result);
    }

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.CREATE,
      category: 'platform',
      entityType: 'bulk_connect',
      description: `Bulk connected ${result.successful} platforms`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      newValue: {
        platformCount: result.successful,
        platformIds: result.results
          .filter(r => r.success)
          .map(r => r.platformId),
      },
    });

    logger.info('Bulk platform connect completed', {
      userId,
      userEmail,
      operationId,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      skipped: result.skipped,
      duration: result.duration,
    });

    // Schedule verification if requested
    if (verifyConnections && result.successful > 0) {
      try {
        const platformIds = result.results.filter(r => r.success).map(r => r.platformId);
        const verificationJob = await tasks.trigger('platform-verification', {
          userId,
          platformIds
        });
        logger.info('Verification scheduled for connected platforms', { userId, count: result.successful });
      } catch (err) {
        logger.warn('Failed to queue verification job', { userId, error: String(err) });
      }
    }

    // Schedule initial sync if requested
    if (scheduleSync && result.successful > 0) {
      try {
        const platformIds = result.results.filter(r => r.success).map(r => r.platformId);
        const syncJob = await tasks.trigger('platform-sync-all', {
          userId,
          platformIds,
          immediate: true
        });
        logger.info('Initial sync scheduled for connected platforms', { userId, count: result.successful });
      } catch (err) {
        logger.warn('Failed to queue sync job', { userId, error: String(err) });
      }
    }

    const statusCode = result.failed > 0 ? 207 : 201; // 207 Multi-Status if partial success

    return addHeaders(
      apiResponse.success(result, {
        status: statusCode,
        meta: {
          requestId,
          operationId,
          duration: result.duration,
        },
      }),
      requestId,
      { rateLimitResult, operationId }
    );

  } catch (error) {
    logger.error('POST /api/platforms/bulk failed', { requestId, operationId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId, { operationId });
  }
}

/**
 * PATCH /api/platforms/bulk
 * 
 * Bulk update platform connection settings
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const operationId = nanoid();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:bulk:update:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.PATCH, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult, operationId }
      );
    }

    // Parse and validate request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = BulkUpdateSchema.safeParse(body);
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
        { rateLimitResult, operationId }
      );
    }

    const { platformIds, updates } = validation.data;

    // Verify ownership of all platforms
    const userPlatforms = await prisma.userPlatform.findMany({
      where: {
        userId,
        platformId: { in: platformIds },
      },
      select: {
        platformId: true,
        platform: {
          select: { name: true },
        },
      },
    });

    if (userPlatforms.length !== platformIds.length) {
      const foundIds = new Set(userPlatforms.map(p => p.platformId));
      const notFound = platformIds.filter(id => !foundIds.has(id));
      
      throw new NotFoundError(
        `Platforms not found or not owned by user: ${notFound.join(', ')}`
      );
    }

    // Execute bulk update in transaction
    const result = await withTransaction(async (tx) => {
      const updateData: Prisma.UserPlatformUpdateInput = {
        ...updates,
        updatedAt: new Date(),
      };

      const updateResult = await tx.userPlatform.updateMany({
        where: {
          userId,
          platformId: { in: platformIds },
        },
        data: updateData,
      });

      return {
        operationId,
        type: 'update' as const,
        total: platformIds.length,
        successful: updateResult.count,
        failed: platformIds.length - updateResult.count,
        skipped: 0,
        results: platformIds.map(platformId => ({
          platformId,
          platformName: userPlatforms.find(p => p.platformId === platformId)?.platform.name,
          success: true,
        })),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.UPDATE,
      category: 'platform',
      entityType: 'bulk_update',
      description: `Bulk updated ${result.successful} platform connections`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      newValue: {
        platformCount: result.successful,
        updates,
      },
    });

    logger.info('Bulk platform update completed', {
      userId,
      operationId,
      platformCount: result.successful,
      updates,
      duration: result.duration,
    });

    return addHeaders(
      apiResponse.success(result, {
        meta: {
          requestId,
          operationId,
          message: `Successfully updated ${result.successful} platform(s)`,
        },
      }),
      requestId,
      { rateLimitResult, operationId }
    );

  } catch (error) {
    logger.error('PATCH /api/platforms/bulk failed', { requestId, operationId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId, { operationId });
  }
}

/**
 * DELETE /api/platforms/bulk
 * 
 * Bulk disconnect platforms
 * 
 * Requires explicit confirmation and supports optional data deletion
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const operationId = nanoid();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;

    // Rate limiting (strict for deletion)
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:bulk:delete:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.DELETE, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId), // 1 hour
        requestId,
        { rateLimitResult, operationId }
      );
    }

    // Parse and validate request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = BulkDeleteSchema.safeParse(body);
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
        { rateLimitResult, operationId }
      );
    }

    const { platformIds, deleteData } = validation.data;

    // Verify ownership
    const userPlatforms = await prisma.userPlatform.findMany({
      where: {
        userId,
        platformId: { in: platformIds },
      },
      select: {
        platformId: true,
        platform: {
          select: { name: true },
        },
      },
    });

    if (userPlatforms.length !== platformIds.length) {
      throw new NotFoundError('Some platforms not found or not owned by user');
    }

    // Execute bulk delete in transaction
    const result = await withTransaction(async (tx) => {
      const results: BulkOperationResult['results'] = [];
      let successCount = 0;
      let failCount = 0;

      for (const platformId of platformIds) {
        try {
          // Delete associated data if requested
          if (deleteData) {
            await tx.trackerEntry.deleteMany({
              where: { userId, platformId },
            });
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

          successCount++;
          results.push({
            platformId,
            platformName: userPlatforms.find(p => p.platformId === platformId)?.platform.name,
            success: true,
          });

        } catch (error) {
          failCount++;
          results.push({
            platformId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Update subscription count
      if (successCount > 0) {
        await tx.subscription.update({
          where: { userId },
          data: {
            currentPlatformCount: { decrement: successCount },
          },
        }).catch(() => {
          // Ignore if subscription doesn't exist
        });
      }

      return {
        operationId,
        type: 'delete' as const,
        total: platformIds.length,
        successful: successCount,
        failed: failCount,
        skipped: 0,
        results,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.DELETE,
      category: 'platform',
      entityType: 'bulk_disconnect',
      description: `Bulk disconnected ${result.successful} platforms${deleteData ? ' with data deletion' : ''}`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      oldValue: {
        platformCount: result.successful,
        platformIds: result.results.filter(r => r.success).map(r => r.platformId),
        deletedData: deleteData,
      },
    });

    logger.info('Bulk platform disconnect completed', {
      userId,
      operationId,
      platformCount: result.successful,
      deleteData,
      duration: result.duration,
    });

    return addHeaders(
      apiResponse.success(result, {
        meta: {
          requestId,
          operationId,
          message: `Successfully disconnected ${result.successful} platform(s)`,
        },
      }),
      requestId,
      { rateLimitResult, operationId }
    );

  } catch (error) {
    logger.error('DELETE /api/platforms/bulk failed', { requestId, operationId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId, { operationId });
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';