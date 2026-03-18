// =============================================================================
// FILE: app/api/tracker/[id]/verify/route.ts
// PURPOSE: Verify a specific tracker entry manually
// Methods: POST
// Auth Required: True
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';
import { CacheService } from '@/services/cacheService';

const RATE_LIMIT = 20;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return addHeaders(apiResponse.unauthorized('Authentication required', requestId), requestId);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-verify:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const userId = session.user.id;
    const { id } = await params;

    const existingEntry = await prisma.trackerEntry.findUnique({
      where: { id },
      select: { userId: true, isVerified: true },
    });

    if (!existingEntry) {
      return addHeaders(apiResponse.notFound('Tracker entry', requestId), requestId, rateLimitResult);
    }

    if (existingEntry.userId !== userId) {
      return addHeaders(apiResponse.forbidden('Unauthorized to verify this entry', requestId), requestId, rateLimitResult);
    }

    if (existingEntry.isVerified) {
      return addHeaders(apiResponse.success({ message: 'Entry is already verified' }, { meta: { requestId } }), requestId, rateLimitResult);
    }

    const updatedEntry = await prisma.trackerEntry.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Invalidate stats cache since a verified state changed
    await CacheService.invalidateStats(userId);

    logger.info('POST /tracker/[id]/verify completed', {
      userId,
      entryId: id,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(updatedEntry, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker/[id]/verify failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to verify entry', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
