// src/app/api/tracker/[id]/notes/route.ts
// =============================================================================
// Manage Tracker Entry Notes
// Methods: GET, PUT, PATCH, DELETE, HEAD, OPTIONS
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { TrackerService } from '@/services/trackerService';
import { auditLogService } from '@/services/auditLogService';
import { getClientIp, generateRequestId } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 50;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const notesSchema = z.object({
  notes: z.string().max(5000),
});

const partialNotesSchema = z.object({
  notes: z.string().max(5000).optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `tracker-notes:${ip}`;
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
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, HEAD, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return addHeaders(response, requestId);
}

/**
 * HEAD - Get notes metadata
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
    response.headers.set('X-Has-Notes', entry.notes ? 'true' : 'false');
    response.headers.set('X-Notes-Length', String(entry.notes?.length || 0));
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('HEAD /tracker/[id]/notes failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

/**
 * GET - Get entry notes
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
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId, rateLimitResult);
    }

    logger.info('GET /tracker/[id]/notes completed', {
      userId,
      entryId: id,
      hasNotes: !!entry.notes,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(
      {
        id: entry.id,
        notes: entry.notes || '',
        hasNotes: !!entry.notes,
        notesLength: entry.notes?.length || 0,
        updatedAt: entry.updatedAt,
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET /tracker/[id]/notes failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch notes', requestId), requestId);
  }
}

/**
 * PUT - Replace entry notes (full update)
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

    const validation = notesSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { notes } = validation.data;

    const entry = await TrackerService.updateEntry(id, { notes }, userId);

    logger.info('PUT /tracker/[id]/notes completed', {
      userId,
      entryId: id,
      notesLength: notes.length,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(
      {
        id: entry.id,
        notes: entry.notes,
        updatedAt: entry.updatedAt,
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT /tracker/[id]/notes failed', { requestId }, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId);
    }

    return addHeaders(apiResponse.internalError('Failed to update notes', requestId), requestId);
  }
}

/**
 * PATCH - Update entry notes (partial/append)
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

    const validation = partialNotesSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { notes } = validation.data;

    const entry = await TrackerService.updateEntry(id, { notes }, userId);

    logger.info('PATCH /tracker/[id]/notes completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(
      {
        id: entry.id,
        notes: entry.notes,
        updatedAt: entry.updatedAt,
      },
      {  }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH /tracker/[id]/notes failed', { requestId }, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId);
    }

    return addHeaders(apiResponse.internalError('Failed to patch notes', requestId), requestId);
  }
}

/**
 * DELETE - Clear entry notes
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

    const entry = await TrackerService.updateEntry(id, { notes: null }, userId);

    auditLogService.create({
      userId,
      action: 'DELETE',
      category: 'tracker',
      entityType: 'tracker_entry_notes',
      entityId: id,
      description: 'Cleared entry notes',
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);

    logger.info('DELETE /tracker/[id]/notes completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(
      {
        id: entry.id,
        notes: null,
        cleared: true,
      },
      {  message: 'Notes cleared successfully' }
    );
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('DELETE /tracker/[id]/notes failed', { requestId }, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId);
    }

    return addHeaders(apiResponse.internalError('Failed to clear notes', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';