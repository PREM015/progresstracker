// =============================================================================
// FILE: app/api/tracker/import/route.ts
// PURPOSE: Import tracker entries from CSV or JSON
// Methods: POST
// Auth Required: True
// Rate Limit: 10 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
// We assume trackerImportService handles validating and executing import.
import { trackerImportService } from '@/services/trackerImportService';
import { z } from 'zod';

const RATE_LIMIT = 10;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

const payloadSchema = z.object({
  data: z.any(), // Can be string (csv content) or array (json data)
  format: z.enum(['json', 'csv']).default('json'),
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-import:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
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
        apiResponse.validationError('Invalid import payload', validation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    // Process the import directly 
    let importResult;
    if (validation.data.format === 'csv') {
      const csvStr = typeof validation.data.data === 'string' ? validation.data.data : String(validation.data.data);
      importResult = await trackerImportService.importFromCSV(userId, csvStr);
    } else {
      const jsonStr = typeof validation.data.data === 'string' ? validation.data.data : JSON.stringify(validation.data.data);
      importResult = await trackerImportService.importFromJSON(userId, jsonStr);
    }

    logger.info('POST /tracker/import completed', {
      userId,
      importedCount: importResult.imported,
      failedCount: importResult.failed,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(importResult, { meta: { requestId }, status: 201 });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker/import failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to import entries', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
