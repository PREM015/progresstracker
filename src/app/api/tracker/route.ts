// src/app/api/tracker/route.ts
// =============================================================================
// Main Tracker Entry CRUD API
// Methods: GET (list), POST (create), PUT (bulk update), PATCH (bulk partial), DELETE (bulk delete)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { TrackerService } from '@/services/trackerService';
import { AchievementService } from '@/services/achievementService';
import { GoalService } from '@/services/goalService';
import { CacheService } from '@/services/cacheService';
import { auditLogService } from '@/services/auditLogService';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100; // requests per minute

// =============================================================================
// TYPES
// =============================================================================

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TrackerEntriesResult {
  data: Record<string, unknown>[];
  pagination: PaginationInfo;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createEntrySchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  platformId: z.string().optional(),
  customPlatformId: z.string().optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  subcategory: z.string().optional(),

  // Primary Metrics
  problemsSolved: z.number().int().min(0).optional().default(0),
  problemsAttempted: z.number().int().min(0).optional().default(0),
  easyProblems: z.number().int().min(0).optional().default(0),
  mediumProblems: z.number().int().min(0).optional().default(0),
  hardProblems: z.number().int().min(0).optional().default(0),

  // Code & Development
  commits: z.number().int().min(0).optional().default(0),
  pullRequests: z.number().int().min(0).optional().default(0),
  pullRequestsMerged: z.number().int().min(0).optional().default(0),
  issuesOpened: z.number().int().min(0).optional().default(0),
  issuesClosed: z.number().int().min(0).optional().default(0),
  codeReviews: z.number().int().min(0).optional().default(0),
  linesOfCode: z.number().int().min(0).optional().default(0),

  // Projects
  projectsStarted: z.number().int().min(0).optional().default(0),
  projectsCompleted: z.number().int().min(0).optional().default(0),

  // Learning
  coursesStarted: z.number().int().min(0).optional().default(0),
  coursesCompleted: z.number().int().min(0).optional().default(0),
  lessonsCompleted: z.number().int().min(0).optional().default(0),
  modulesCompleted: z.number().int().min(0).optional().default(0),
  certificationsEarned: z.number().int().min(0).optional().default(0),
  quizzesTaken: z.number().int().min(0).optional().default(0),
  quizzesPassed: z.number().int().min(0).optional().default(0),

  // Time
  timeSpent: z.number().int().min(0).optional().default(0),
  focusTime: z.number().int().min(0).optional().default(0),

  // Platform-specific
  rating: z.number().int().optional(),
  rank: z.number().int().optional(),
  points: z.number().int().optional(),
  streak: z.number().int().min(0).optional(),

  // Mood & Notes
  mood: z.string().optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  productivityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),

  // Tags
  tags: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default([]),

  // Custom fields
  customFields: z.record(z.unknown()).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  platformId: z.string().optional(),
  customPlatformId: z.string().optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  source: z.string().optional(),
  sortBy: z.string().optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  data: createEntrySchema.partial(),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `tracker:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
    };
  }

  return { error: null, session, rateLimitResult };
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store');

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

// =============================================================================
// HTTP METHOD HANDLERS
// =============================================================================

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return addHeaders(response, requestId);
}

/**
 * HEAD - Get metadata
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Get count without fetching data
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!queryValidation.success) {
      return addHeaders(new NextResponse(null, { status: 400 }), requestId, rateLimitResult);
    }

    const { startDate, endDate, platformId, category } = queryValidation.data;

    const count = await TrackerService.getEntries(
      userId,
      startDate ? new Date(startDate) : new Date(0),
      endDate ? new Date(endDate) : new Date(),
      { platformId, category: category ?? undefined },
      { page: 1, limit: 1 }
    ) as TrackerEntriesResult;

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Total-Count', String(count.pagination?.total || 0));
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /tracker failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

/**
 * GET - List tracker entries
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Parse and validate query params
    const { searchParams } = new URL(request.url);

    const {
      page,
      limit,
      startDate,
      endDate,
      platformId,
      customPlatformId,
      category,
      source,
      sortBy,
      sortOrder,
    } = querySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      platformId: searchParams.get('platformId') || undefined,
      customPlatformId: searchParams.get('customPlatformId') || undefined,
      category: searchParams.get('category') || undefined,
      source: searchParams.get('source') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    // Get entries
    const result = await TrackerService.getEntries(
      userId,
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date(),
      {
        platformId: platformId || undefined,
        customPlatformId: customPlatformId || undefined,
        categories: category ? [category] : undefined,
        source,
      },
      {
        page,
        limit,
        sortBy,
        sortOrder,
        select: {
          id: true,
          date: true,
          platformId: true,
          category: true,
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          points: true,
          isVerified: true,
          source: true,
          platform: {
            select: { id: true, name: true, icon: true, color: true }
          },
          customPlatform: {
            select: { id: true, name: true, icon: true, color: true }
          }
          // notes: false - excluded by default for list view performance
        }
      }
    ) as TrackerEntriesResult;

    logger.info('GET /tracker completed', {
      userId,
      page,
      total: result.pagination?.total,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.paginated(
      result.data,
      result.pagination || { page: 1, limit: 50, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      { meta: { requestId } }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch entries', requestId), requestId);
  }
}

/**
 * POST - Create new tracker entry
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Parse and validate body
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

    const validation = createEntrySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;

    // Create entry
    const entry = await TrackerService.createEntry({
      userId,
      date: new Date(data.date),
      platformId: data.platformId,
      customPlatformId: data.customPlatformId,
      category: data.category,
      subcategory: data.subcategory,
      problemsSolved: data.problemsSolved,
      problemsAttempted: data.problemsAttempted,
      easyProblems: data.easyProblems,
      mediumProblems: data.mediumProblems,
      hardProblems: data.hardProblems,
      commits: data.commits,
      pullRequests: data.pullRequests,
      pullRequestsMerged: data.pullRequestsMerged,
      issuesOpened: data.issuesOpened,
      issuesClosed: data.issuesClosed,
      codeReviews: data.codeReviews,
      linesOfCode: data.linesOfCode,
      projectsStarted: data.projectsStarted,
      projectsCompleted: data.projectsCompleted,
      coursesStarted: data.coursesStarted,
      coursesCompleted: data.coursesCompleted,
      lessonsCompleted: data.lessonsCompleted,
      modulesCompleted: data.modulesCompleted,
      certificationsEarned: data.certificationsEarned,
      quizzesTaken: data.quizzesTaken,
      quizzesPassed: data.quizzesPassed,
      timeSpent: data.timeSpent,
      focusTime: data.focusTime,
      rating: data.rating,
      rank: data.rank,
      points: data.points,
      streak: data.streak,
      mood: data.mood,
      energyLevel: data.energyLevel,
      productivityRating: data.productivityRating,
      notes: data.notes,
      tags: data.tags,
      topics: data.topics,
      languages: data.languages,
      customFields: data.customFields,
      source: 'manual',
      isAutoGenerated: false,
    });

    // Background tasks (don't block response)
    Promise.all([
      AchievementService.checkAndUnlockAchievements(userId).catch(console.error),
      GoalService.autoUpdateGoals(userId).catch(console.error),
      CacheService.invalidateStats(userId, 'daily').catch(console.error),
    ]);

    // Audit log
    auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'tracker',
      entityType: 'tracker_entry',
      entityId: entry.id,
      description: 'Created tracker entry',
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);

    logger.info('POST /tracker completed', {
      userId,
      entryId: entry.id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.created(entry, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker failed', { requestId }, error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return addHeaders(
        apiResponse.error({ message: error.message, code: 'DUPLICATE_ENTRY', statusCode: 409 }, requestId),
        requestId
      );
    }

    return addHeaders(apiResponse.internalError('Failed to create entry', requestId), requestId);
  }
}

/**
 * PUT - Bulk update entries (full replacement)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

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

    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { ids, data } = validation.data;

    // Convert date string to Date object if present
    const updateData: Record<string, unknown> = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    // Bulk update
    const result = await TrackerService.bulkUpdateEntries(ids, updateData, userId);

    // Audit log + cache invalidation
    auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'tracker',
      entityType: 'tracker_entry',
      description: `Bulk updated ${result.updated} entries`,
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);
    CacheService.invalidateStats(userId, 'entry').catch(console.error);

    logger.info('PUT /tracker completed', {
      userId,
      updated: result.updated,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(result, {});
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /tracker failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update entries', requestId), requestId);
  }
}

/**
 * PATCH - Bulk partial update entries
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

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

    const validation = bulkUpdateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { ids, data } = validation.data;

    // Convert date string to Date object if present
    const updateData: Record<string, unknown> = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const result = await TrackerService.bulkUpdateEntries(ids, updateData, userId);

    auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'tracker',
      entityType: 'tracker_entry',
      description: `Bulk patched ${result.updated} entries`,
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);
    CacheService.invalidateStats(userId, 'entry').catch(console.error);

    logger.info('PATCH /tracker completed', {
      userId,
      updated: result.updated,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(result, {});
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH /tracker failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to patch entries', requestId), requestId);
  }
}

/**
 * DELETE - Bulk delete entries
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const userId = session!.user.id;

    // Try to get IDs from query params or body
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    let ids: string[] = [];

    if (idsParam) {
      ids = idsParam.split(',').map(id => id.trim());
    } else {
      try {
        const body = await request.json();
        const validation = bulkDeleteSchema.safeParse(body);
        if (validation.success) {
          ids = validation.data.ids;
        }
      } catch {
        // Body parsing failed, continue with empty ids
      }
    }

    if (ids.length === 0) {
      return addHeaders(
        apiResponse.validationError('No entry IDs provided', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const result = await TrackerService.bulkDeleteEntries(ids, userId);

    auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'tracker',
      entityType: 'tracker_entry',
      description: `Bulk deleted ${result.deleted} entries`,
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);
    CacheService.invalidateStats(userId, 'entry').catch(console.error);

    logger.info('DELETE /tracker completed', {
      userId,
      deleted: result.deleted,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(result, { message: `Deleted ${result.deleted} entries` });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /tracker failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete entries', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';