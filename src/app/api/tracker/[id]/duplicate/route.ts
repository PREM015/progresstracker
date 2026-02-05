// src/app/api/tracker/[id]/duplicate/route.ts
// =============================================================================
// Duplicate Specific Tracker Entry
// Methods: POST, OPTIONS
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

const RATE_LIMIT = 20;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const duplicateSchema = z.object({
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  keepNotes: z.boolean().optional().default(true),
  resetMetrics: z.boolean().optional().default(false),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `tracker-duplicate:${ip}`;
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
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return addHeaders(response, requestId);
}

/**
 * POST - Duplicate tracker entry to a new date
 */
export async function POST(
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

    const validation = duplicateSchema.safeParse(body);

    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { targetDate, keepNotes, resetMetrics } = validation.data;

    // Duplicate entry
    const newEntry = await TrackerService.duplicateEntry(id, new Date(targetDate), userId);

    // Optionally remove notes
    if (!keepNotes && newEntry.notes) {
      await TrackerService.updateEntry(newEntry.id, { notes: null }, userId);
    }

    // Optionally reset metrics
    if (resetMetrics) {
      await TrackerService.updateEntry(
        newEntry.id,
        {
          problemsSolved: 0,
          commits: 0,
          timeSpent: 0,
          points: 0,
        },
        userId
      );
    }

    // Audit log
    auditLogService.create({
      userId,
      action: 'CREATE',
      category: 'tracker',
      entityType: 'tracker_entry',
      entityId: newEntry.id,
      description: `Duplicated entry ${id} to ${targetDate}`,
      ipAddress: getClientIp(request),
      requestId,
    }).catch(console.error);

    logger.info('POST /tracker/[id]/duplicate completed', {
      userId,
      originalId: id,
      newId: newEntry.id,
      targetDate,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.created(newEntry, { requestId });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker/[id]/duplicate failed', { requestId }, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return addHeaders(apiResponse.notFound('Entry', requestId), requestId);
      }
      if (error.message.includes('already exists')) {
        return addHeaders(
          apiResponse.error({ message: error.message, code: 'DUPLICATE_ENTRY', statusCode: 409 }, requestId),
          requestId
        );
      }
    }

    return addHeaders(apiResponse.internalError('Failed to duplicate entry', requestId), requestId);
  }
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';