// src/app/api/tracker/[id]/route.ts
// =============================================================================
// Single Tracker Entry CRUD API
// Methods: GET, PUT, PATCH, DELETE, HEAD, OPTIONS
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
import { auditLogService } from '@/services/auditLogService';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateEntrySchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  platformId: z.string().optional(),
  customPlatformId: z.string().optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  subcategory: z.string().optional(),

  // Metrics
  problemsSolved: z.number().int().min(0).optional(),
  problemsAttempted: z.number().int().min(0).optional(),
  easyProblems: z.number().int().min(0).optional(),
  mediumProblems: z.number().int().min(0).optional(),
  hardProblems: z.number().int().min(0).optional(),
  commits: z.number().int().min(0).optional(),
  pullRequests: z.number().int().min(0).optional(),
  pullRequestsMerged: z.number().int().min(0).optional(),
  issuesOpened: z.number().int().min(0).optional(),
  issuesClosed: z.number().int().min(0).optional(),
  codeReviews: z.number().int().min(0).optional(),
  linesOfCode: z.number().int().min(0).optional(),
  projectsStarted: z.number().int().min(0).optional(),
  projectsCompleted: z.number().int().min(0).optional(),
  coursesStarted: z.number().int().min(0).optional(),
  coursesCompleted: z.number().int().min(0).optional(),
  lessonsCompleted: z.number().int().min(0).optional(),
  modulesCompleted: z.number().int().min(0).optional(),
  certificationsEarned: z.number().int().min(0).optional(),
  timeSpent: z.number().int().min(0).optional(),
  focusTime: z.number().int().min(0).optional(),
  rating: z.number().int().optional(),
  rank: z.number().int().optional(),
  points: z.number().int().optional(),
  streak: z.number().int().min(0).optional(),
  mood: z.string().optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  productivityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

type UpdateEntryData = z.infer<typeof updateEntrySchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `tracker-entry:${ip}`;
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

/**
 * Convert validated Zod data to the format TrackerService expects,
 * converting date string to Date object if present.
 */
function prepareUpdateData(data: UpdateEntryData): Omit<UpdateEntryData, 'date'> & { date?: Date } {
  const { date, ...rest } = data;
  if (date) {
    return { ...rest, date: new Date(date) };
  }
  return rest;
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
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, HEAD, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return addHeaders(response, requestId);
}

/**
 * HEAD - Get entry metadata
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const { id } = await params;
    const userId = session!.user.id;

    const entry = await TrackerService.getEntryById(id, userId);

    if (!entry) {
      return addHeaders(new NextResponse(null, { status: 404 }), requestId, rateLimitResult);
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set('X-Entry-Date', entry.date.toISOString());
    response.headers.set('X-Entry-Status', entry.isVerified ? 'verified' : 'unverified');
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /tracker/[id] failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

/**
 * GET - Get single tracker entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const { id } = await params;
    const userId = session!.user.id;

    const entry = await TrackerService.getEntryById(id, userId);

    if (!entry) {
      logger.warn('Entry not found', { userId, entryId: id, requestId });
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId, rateLimitResult);
    }

    logger.info('GET /tracker/[id] completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(entry, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/[id] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch entry', requestId), requestId);
  }
}

/**
 * PUT - Full update tracker entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const { id } = await params;
    const userId = session!.user.id;

    // Parse body
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

    const validation = updateEntrySchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;
    const updateData = prepareUpdateData(data);

    // Update entry
    const entry = await TrackerService.updateEntry(id, updateData, userId);

    // Audit log
    auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'tracker',
      entityType: 'tracker_entry',
      entityId: id,
      description: 'Updated tracker entry',
      newValue: data as unknown as Record<string, unknown>,
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);

    logger.info('PUT /tracker/[id] completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(entry, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /tracker/[id] failed', { requestId }, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId);
    }

    return addHeaders(apiResponse.internalError('Failed to update entry', requestId), requestId);
  }
}

/**
 * PATCH - Partial update tracker entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const { id } = await params;
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

    const validation = updateEntrySchema.partial().safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const data = validation.data;
    const updateData = prepareUpdateData(data);

    const entry = await TrackerService.updateEntry(id, updateData, userId);

    // Build changes record for audit log
    const changesRecord: Record<string, { old: unknown; new: unknown }> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        changesRecord[key] = { old: undefined, new: value };
      }
    }

    auditLogService.create({
      userId,
      action: 'UPDATE',
      category: 'tracker',
      entityType: 'tracker_entry',
      entityId: id,
      description: 'Patched tracker entry',
      changes: changesRecord,
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);

    logger.info('PATCH /tracker/[id] completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(entry, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH /tracker/[id] failed', { requestId }, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId);
    }

    return addHeaders(apiResponse.internalError('Failed to patch entry', requestId), requestId);
  }
}

/**
 * DELETE - Delete tracker entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { error, session, rateLimitResult } = await validateSession(request, requestId);
    if (error) return addHeaders(error, requestId, rateLimitResult);

    const { id } = await params;
    const userId = session!.user.id;

    const result = await TrackerService.deleteEntry(id, userId);

    if (!result.deleted) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId, rateLimitResult);
    }

    auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'tracker',
      entityType: 'tracker_entry',
      entityId: id,
      description: 'Deleted tracker entry',
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);

    logger.info('DELETE /tracker/[id] completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(
      { deleted: true, id },
      { meta: { requestId }, message: 'Entry deleted successfully' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /tracker/[id] failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to delete entry', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';