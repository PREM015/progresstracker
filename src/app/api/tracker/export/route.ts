// =============================================================================
// FILE: app/api/tracker/export/route.ts
// PURPOSE: Export tracker entries
// Methods: GET, POST
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
import { ExportService } from '@/services/exportService';

const RATE_LIMIT = 10;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-export:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const format = request.nextUrl.searchParams.get('format') || 'json';

    // Call export service
    const exportData = await ExportService.exportData(userId, { 
      format: format as 'json' | 'csv',
      type: 'tracker',
      dateRange: 'all_time'
    });

    logger.info('GET /tracker/export completed', {
      userId,
      format,
      duration: Date.now() - startTime,
      requestId,
    });

    const headers = new Headers(SECURITY_HEADERS);
    headers.set('X-Request-ID', requestId);
    headers.set('Content-Disposition', `attachment; filename=tracker-export-${new Date().toISOString()}.${format}`);
    headers.set('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');

    return new NextResponse(typeof exportData === 'string' ? exportData : JSON.stringify(exportData, null, 2), {
      status: 200,
      headers
    });
  } catch (error) {
    logger.error('GET /tracker/export failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to export data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
