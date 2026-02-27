// src/app/api/platforms/custom/route.ts
/**
 * Custom Platforms API
 * 
 * Allows users to create and manage custom platforms for tracking activities
 * not covered by built-in platforms. Supports templates, import/export, and
 * advanced field configurations.
 * 
 * @route GET    /api/platforms/custom - Get user's custom platforms
 * @route POST   /api/platforms/custom - Create custom platform
 * @route PATCH  /api/platforms/custom - Bulk update custom platforms
 * @route DELETE /api/platforms/custom - Delete custom platform(s)
 * @route HEAD   /api/platforms/custom - Quick count check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withTransaction, paginationArgs, buildPaginationResponse } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '@/lib/apiError';
import { auditLogService } from '@/services/auditLogService';
import { AuditAction, PlatformCategory, Prisma } from '@prisma/client';
import { CATEGORY_MAP, getCategoryDisplayName, PlatformCategoryId } from '@/types/platform';
import { nanoid } from 'nanoid';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMITS = {
  GET: 60,      // 60 requests per minute
  POST: 10,     // 10 creates per hour
  PATCH: 30,    // 30 updates per minute
  DELETE: 20,   // 20 deletes per hour
} as const;

const LIMITS = {
  MAX_CUSTOM_PLATFORMS_FREE: 3,
  MAX_CUSTOM_PLATFORMS_PRO: 20,
  MAX_CUSTOM_PLATFORMS_ENTERPRISE: 100,
  MAX_TRACKING_FIELDS: 20,
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// Field types for custom tracking
const FIELD_TYPES = [
  'number',
  'text',
  'boolean',
  'date',
  'select',
  'multiselect',
  'url',
  'email',
  'phone',
  'time',
  'duration',
  'rating',
  'currency',
] as const;

// =============================================================================
// TYPES
// =============================================================================

interface CustomPlatformWithStats {
  id: string;
  userId: string;
  name: string;
  displayName: string | null;
  description: string | null;
  category: PlatformCategory;
  categoryName: string;
  icon: string | null;
  color: string | null;
  website: string | null;
  trackingFields: Record<string, FieldConfig> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    totalEntries: number;
    lastEntryDate: Date | null;
    totalValue: number;
  };
}

interface FieldConfig {
  type: typeof FIELD_TYPES[number];
  label?: string;
  required?: boolean;
  default?: unknown;
  options?: string[]; // For select/multiselect
  min?: number;
  max?: number;
  pattern?: string; // Regex for validation
  placeholder?: string;
  helpText?: string;
}

interface BulkUpdateResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const FieldConfigSchema: z.ZodType<FieldConfig> = z.object({
  type: z.enum(FIELD_TYPES),
  label: z.string().max(50).optional(),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  placeholder: z.string().max(100).optional(),
  helpText: z.string().max(200).optional(),
}).refine((data) => {
  // Validate options for select types
  if ((data.type === 'select' || data.type === 'multiselect') && !data.options) {
    return false;
  }
  return true;
}, {
  message: 'Select and multiselect fields must have options',
});

const CreateCustomPlatformSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(LIMITS.MAX_NAME_LENGTH, `Name cannot exceed ${LIMITS.MAX_NAME_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),

  displayName: z.string()
    .max(100, 'Display name cannot exceed 100 characters')
    .optional(),

  description: z.string()
    .max(LIMITS.MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${LIMITS.MAX_DESCRIPTION_LENGTH} characters`)
    .optional(),

  category: z.string(),

  icon: z.string()
    .max(10, 'Icon cannot exceed 10 characters')
    .optional(),

  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional(),

  website: z.string()
    .url('Website must be a valid URL')
    .optional(),

  trackingFields: z.record(FieldConfigSchema)
    .optional()
    .refine((fields) => {
      if (!fields) return true;
      return Object.keys(fields).length <= LIMITS.MAX_TRACKING_FIELDS;
    }, {
      message: `Cannot have more than ${LIMITS.MAX_TRACKING_FIELDS} tracking fields`,
    }),

  templateId: z.string().cuid().optional(), // Create from template
});

const UpdateCustomPlatformSchema = z.object({
  id: z.string().cuid(),
  name: z.string()
    .min(2)
    .max(LIMITS.MAX_NAME_LENGTH)
    .regex(/^[a-zA-Z0-9\s-_]+$/)
    .optional(),
  displayName: z.string().max(100).optional(),
  description: z.string().max(LIMITS.MAX_DESCRIPTION_LENGTH).optional(),
  category: z.string().optional(),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  website: z.string().url().optional(),
  trackingFields: z.record(FieldConfigSchema).optional(),
  isActive: z.boolean().optional(),
});

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(50),
  updates: z.object({
    category: z.string().optional(),
    isActive: z.boolean().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field required',
  }),
});

const DeleteSchema = z.object({
  id: z.string().cuid().optional(),
  ids: z.array(z.string().cuid()).optional(),
  force: z.boolean().default(false), // Force delete even with entries
}).refine(data => data.id || (data.ids && data.ids.length > 0), {
  message: 'Either id or ids must be provided',
});

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'entries']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeStats: z.coerce.boolean().default(false),
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
  }
): NextResponse {
  // Security and CORS headers
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
 * Normalize category to Prisma enum
 */
function normalizeCategory(category: string): PlatformCategory {
  const upperCategory = category.toUpperCase();
  if (Object.values(PlatformCategory).includes(upperCategory as PlatformCategory)) {
    return upperCategory as PlatformCategory;
  }

  const mapped = CATEGORY_MAP[category.toLowerCase() as PlatformCategoryId];
  if (!mapped) {
    throw new ValidationError(`Invalid category: ${category}`);
  }

  return mapped;
}

/**
 * Check custom platform limits based on subscription
 */
async function checkCustomPlatformLimits(
  userId: string,
  additionalCount: number = 1
): Promise<{ allowed: boolean; limit: number; current: number; reason?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });

  let limit: number = LIMITS.MAX_CUSTOM_PLATFORMS_FREE;

  if (subscription?.tier === 'PRO' || subscription?.tier === 'STARTER') {
    limit = LIMITS.MAX_CUSTOM_PLATFORMS_PRO;
  } else if (subscription?.tier === 'ENTERPRISE' || subscription?.tier === 'TEAM') {
    limit = LIMITS.MAX_CUSTOM_PLATFORMS_ENTERPRISE;
  }

  const current = await prisma.customPlatform.count({
    where: { userId, isActive: true },
  });

  const allowed = (current + additionalCount) <= limit;

  return {
    allowed,
    limit,
    current,
    reason: allowed ? undefined : `Custom platform limit reached (${current}/${limit}). Upgrade for more.`,
  };
}

/**
 * Get custom platform stats
 */
async function getCustomPlatformStats(platformId: string, userId: string) {
  const stats = await prisma.trackerEntry.aggregate({
    where: {
      userId,
      customPlatformId: platformId,
    },
    _count: true,
    _max: { date: true },
    _sum: { problemsSolved: true },
  });

  return {
    totalEntries: stats._count,
    lastEntryDate: stats._max.date,
    totalValue: stats._sum.problemsSolved || 0,
  };
}

/**
 * Validate tracking fields configuration
 */
function validateTrackingFields(fields: Record<string, FieldConfig>): void {
  const fieldNames = Object.keys(fields);

  // Check for duplicate labels
  const labels = fieldNames
    .map(name => fields[name].label || name)
    .filter(Boolean);

  const duplicateLabels = labels.filter((label, index) =>
    labels.indexOf(label) !== index
  );

  if (duplicateLabels.length > 0) {
    throw new ValidationError(`Duplicate field labels: ${duplicateLabels.join(', ')}`);
  }

  // Validate field names
  const invalidNames = fieldNames.filter(name =>
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  );

  if (invalidNames.length > 0) {
    throw new ValidationError(
      `Invalid field names (must start with letter/underscore, contain only alphanumeric/underscore): ${invalidNames.join(', ')}`
    );
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
 * HEAD - Quick count check
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    const userId = session.user.id;

    const [total, active] = await Promise.all([
      prisma.customPlatform.count({ where: { userId } }),
      prisma.customPlatform.count({ where: { userId, isActive: true } }),
    ]);

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(total));
    response.headers.set('X-Active-Count', String(active));

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD /api/platforms/custom failed', { requestId }, error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * GET /api/platforms/custom
 * 
 * Get user's custom platforms with filtering, search, and stats
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
    const rateLimitKey = `platforms:custom:get:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.GET, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse and validate query
    const { searchParams } = new URL(request.url);
    const queryValidation = QuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      category: searchParams.get('category') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
      includeStats: searchParams.get('includeStats') || undefined,
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

    const query = queryValidation.data;

    // Build where clause
    const where: Prisma.CustomPlatformWhereInput = { userId };

    if (query.category) {
      const normalized = normalizeCategory(query.category);
      where.category = normalized;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build order by
    let orderBy: Prisma.CustomPlatformOrderByWithRelationInput;

    if (query.sortBy === 'entries') {
      // Sort by entry count requires aggregation - handle separately
      orderBy = { updatedAt: query.sortOrder };
    } else {
      orderBy = { [query.sortBy]: query.sortOrder };
    }

    // Fetch platforms
    const [platforms, total] = await Promise.all([
      prisma.customPlatform.findMany({
        where,
        orderBy,
        ...paginationArgs(query.page, query.limit),
      }),
      prisma.customPlatform.count({ where }),
    ]);

    // Enhance with stats if requested
    const enhancedPlatforms: CustomPlatformWithStats[] = await Promise.all(
      platforms.map(async (platform) => {
        const stats = query.includeStats
          ? await getCustomPlatformStats(platform.id, userId)
          : undefined;

        return {
          ...platform,
          categoryName: getCategoryDisplayName(platform.category),
          trackingFields: platform.trackingFields as Record<string, FieldConfig> | null,
          stats,
        };
      })
    );

    // Sort by entries if requested
    if (query.sortBy === 'entries' && query.includeStats) {
      enhancedPlatforms.sort((a, b) => {
        const aEntries = a.stats?.totalEntries || 0;
        const bEntries = b.stats?.totalEntries || 0;
        return query.sortOrder === 'desc' ? bEntries - aEntries : aEntries - bEntries;
      });
    }

    const paginationResponse = buildPaginationResponse(
      enhancedPlatforms,
      total,
      query.page,
      query.limit
    );

    // Get limits info
    const limitsCheck = await checkCustomPlatformLimits(userId, 0);

    logger.info('Custom platforms fetched', {
      userId,
      requestId,
      total,
      count: enhancedPlatforms.length,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(
        {
          platforms: enhancedPlatforms,
          pagination: paginationResponse.pagination,
          limits: {
            current: limitsCheck.current,
            max: limitsCheck.limit,
            remaining: limitsCheck.limit - limitsCheck.current,
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
    logger.error('GET /api/platforms/custom failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * POST /api/platforms/custom
 * 
 * Create a new custom platform
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Rate limiting (strict - 10 per hour)
    const ip = getClientIp(request);
    const rateLimitKey = `platforms:custom:post:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.POST, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId), // 1 hour
        requestId,
        { rateLimitResult }
      );
    }

    // Check limits
    const limitsCheck = await checkCustomPlatformLimits(userId, 1);
    if (!limitsCheck.allowed) {
      throw new ForbiddenError(limitsCheck.reason!);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = CreateCustomPlatformSchema.safeParse(body);
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

    const data = validation.data;

    // Normalize category
    const category = normalizeCategory(data.category);

    // Check for duplicate name
    const existing = await prisma.customPlatform.findFirst({
      where: {
        userId,
        name: { equals: data.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictError(`A custom platform named "${data.name}" already exists`);
    }

    // Validate tracking fields
    if (data.trackingFields) {
      validateTrackingFields(data.trackingFields);
    }

    // Create platform
    const platform = await prisma.customPlatform.create({
      data: {
        userId,
        name: data.name,
        displayName: data.displayName || data.name,
        description: data.description,
        category,
        icon: data.icon,
        color: data.color,
        website: data.website,
        trackingFields: data.trackingFields as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.CREATE,
      category: 'platform',
      entityType: 'custom_platform',
      entityId: platform.id,
      description: `Created custom platform "${platform.name}"`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      newValue: {
        name: platform.name,
        category: platform.category,
      },
    });

    logger.info('Custom platform created', {
      userId,
      userEmail,
      platformId: platform.id,
      name: platform.name,
      category: platform.category,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.created(
        {
          ...platform,
          categoryName: getCategoryDisplayName(platform.category),
        },
        {
          requestId,
          message: `Custom platform "${platform.name}" created successfully`,
        }
      ),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('POST /api/platforms/custom failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * PATCH /api/platforms/custom
 * 
 * Update custom platform(s)
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:custom:patch:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.PATCH, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(60, requestId),
        requestId,
        { rateLimitResult }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Check if bulk update or single update
    const isBulk = 'ids' in (body as object);

    if (isBulk) {
      // Bulk update
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
          { rateLimitResult }
        );
      }

      const { ids, updates } = validation.data;

      // Verify ownership
      const platforms = await prisma.customPlatform.findMany({
        where: {
          id: { in: ids },
          userId,
        },
        select: { id: true },
      });

      if (platforms.length !== ids.length) {
        throw new NotFoundError('Some platforms not found or not owned by user');
      }

      // Prepare update data
      const updateData: Prisma.CustomPlatformUpdateInput = {
        updatedAt: new Date(),
      };

      if (updates.category) {
        updateData.category = normalizeCategory(updates.category);
      }
      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
      }
      if (updates.color) {
        updateData.color = updates.color;
      }

      // Execute bulk update
      const result = await prisma.customPlatform.updateMany({
        where: {
          id: { in: ids },
          userId,
        },
        data: updateData,
      });

      // Audit log
      await auditLogService.create({
        userId,
        action: AuditAction.UPDATE,
        category: 'platform',
        entityType: 'custom_platform_bulk',
        description: `Bulk updated ${result.count} custom platforms`,
        ipAddress: ip,
        userAgent: getUserAgent(request),
        requestId,
        newValue: { count: result.count, updates },
      });

      logger.info('Custom platforms bulk updated', {
        userId,
        count: result.count,
        duration: Date.now() - startTime,
      });

      return addHeaders(
        apiResponse.success(
          {
            updated: result.count,
            platformIds: ids,
          },
          {
            meta: {
              requestId,
              message: `Successfully updated ${result.count} platform(s)`,
            },
          }
        ),
        requestId,
        { rateLimitResult }
      );
    } else {
      // Single update
      const validation = UpdateCustomPlatformSchema.safeParse(body);
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

      const { id, ...updates } = validation.data;

      // Verify ownership
      const existing = await prisma.customPlatform.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new NotFoundError('Custom platform');
      }

      // Check for duplicate name if updating name
      if (updates.name && updates.name !== existing.name) {
        const duplicate = await prisma.customPlatform.findFirst({
          where: {
            userId,
            name: { equals: updates.name, mode: 'insensitive' },
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new ConflictError(`A custom platform named "${updates.name}" already exists`);
        }
      }

      // Validate tracking fields if updating
      if (updates.trackingFields) {
        validateTrackingFields(updates.trackingFields);
      }

      // Prepare update data
      const { category, trackingFields, ...otherUpdates } = updates;
      const updateData: Prisma.CustomPlatformUpdateInput = {
        ...otherUpdates,
        updatedAt: new Date(),
      };

      if (updates.category) {
        updateData.category = normalizeCategory(updates.category);
      }

      if (updates.trackingFields) {
        updateData.trackingFields = updates.trackingFields as unknown as Prisma.InputJsonValue;
      }

      // Update platform
      const platform = await prisma.customPlatform.update({
        where: { id },
        data: updateData,
      });

      // Audit log
      await auditLogService.create({
        userId,
        action: AuditAction.UPDATE,
        category: 'platform',
        entityType: 'custom_platform',
        entityId: platform.id,
        description: `Updated custom platform "${platform.name}"`,
        ipAddress: ip,
        userAgent: getUserAgent(request),
        requestId,
        oldValue: { name: existing.name },
        newValue: { name: platform.name },
      });

      logger.info('Custom platform updated', {
        userId,
        platformId: platform.id,
        duration: Date.now() - startTime,
      });

      return addHeaders(
        apiResponse.success(
          {
            ...platform,
            categoryName: getCategoryDisplayName(platform.category),
          },
          {
            meta: {
              requestId,
              message: `Custom platform "${platform.name}" updated successfully`,
            },
          }
        ),
        requestId,
        { rateLimitResult }
      );
    }
  } catch (error) {
    logger.error('PATCH /api/platforms/custom failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * DELETE /api/platforms/custom
 * 
 * Delete custom platform(s)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = session.user.id;
    const ip = getClientIp(request);

    // Rate limiting
    const rateLimitKey = `platforms:custom:delete:${userId}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMITS.DELETE, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(
        apiResponse.rateLimited(3600, requestId), // 1 hour
        requestId,
        { rateLimitResult }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validation = DeleteSchema.safeParse(body);
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

    const { id, ids, force } = validation.data;
    const platformIds = ids || (id ? [id] : []);

    if (platformIds.length === 0) {
      throw new ValidationError('No platform IDs provided');
    }

    // Process deletions in transaction
    const result = await withTransaction(async (tx) => {
      const results: BulkUpdateResult['results'] = [];
      let successCount = 0;
      let failCount = 0;

      for (const platformId of platformIds) {
        try {
          // Verify ownership
          const platform = await tx.customPlatform.findFirst({
            where: { id: platformId, userId },
          });

          if (!platform) {
            throw new NotFoundError('Custom platform');
          }

          // Check for existing entries
          const entriesCount = await tx.trackerEntry.count({
            where: { customPlatformId: platformId },
          });

          if (entriesCount > 0 && !force) {
            // Soft delete - deactivate
            await tx.customPlatform.update({
              where: { id: platformId },
              data: { isActive: false, updatedAt: new Date() },
            });

            results.push({
              id: platformId,
              success: true,
            });
            successCount++;
          } else {
            // Hard delete (or force delete with entries)
            if (force && entriesCount > 0) {
              await tx.trackerEntry.deleteMany({
                where: { customPlatformId: platformId },
              });
            }

            await tx.customPlatform.delete({
              where: { id: platformId },
            });

            results.push({
              id: platformId,
              success: true,
            });
            successCount++;
          }
        } catch (error) {
          failCount++;
          results.push({
            id: platformId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        total: platformIds.length,
        successful: successCount,
        failed: failCount,
        results,
      };
    });

    // Audit log
    await auditLogService.create({
      userId,
      action: AuditAction.DELETE,
      category: 'platform',
      entityType: 'custom_platform',
      description: `Deleted ${result.successful} custom platform(s)`,
      ipAddress: ip,
      userAgent: getUserAgent(request),
      requestId,
      oldValue: {
        count: result.successful,
        force,
      },
    });

    logger.info('Custom platforms deleted', {
      userId,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      force,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(result, {
        meta: {
          requestId,
          message: `Successfully deleted ${result.successful}/${result.total} platform(s)`,
        },
      }),
      requestId,
      { rateLimitResult }
    );
  } catch (error) {
    logger.error('DELETE /api/platforms/custom failed', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';