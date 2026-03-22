// =============================================================================
// FILE: app/api/tracker/duplicate/route.ts
// PURPOSE: Duplicate an existing tracker entry
// Methods: POST
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { TrackerService } from '@/services/trackerService';
import { parseISO, isValid } from 'date-fns';

const RATE_LIMIT = 30;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const payloadSchema = z.object({
  entryId: z.string().min(1),
  date: z.string().refine((val) => isValid(parseISO(val)), { message: "Invalid date" }).optional(),
});

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }
  return response;
}

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-duplicate:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(30, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    let payload;

    try {
      payload = await request.json();
    } catch {
      return addHeaders(apiResponse.validationError('Invalid JSON format', undefined, requestId), requestId, rateLimitResult);
    }

    const validation = payloadSchema.safeParse(payload);
    if (!validation.success) {
      return addHeaders(
        apiResponse.validationError('Invalid payload', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { entryId, date } = validation.data;

    const originalEntry = await TrackerService.getEntryById(entryId, userId);
    
    if (!originalEntry) {
      return addHeaders(apiResponse.notFound('Entry', requestId), requestId, rateLimitResult);
    }

    // Prepare duplicate data, removing IDs and timestamps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...duplicateData } = originalEntry;
    
    // Set to new date if provided, otherwise today
    const newDate = date ? parseISO(date) : new Date();
    
    const newEntry = await TrackerService.createEntry({
      ...duplicateData,
      customFields: duplicateData.customFields as Record<string, unknown> | null,
      date: newDate,
      isVerified: false, // reset verification on duplicate
      source: 'duplicate',
    });

    logger.info('POST /tracker/duplicate completed', {
      userId,
      originalId: entryId,
      newId: newEntry.id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(newEntry, { meta: { requestId }, status: 201 });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker/duplicate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to duplicate entry', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
