// =============================================================================
// FILE: app/api/tracker/validate/route.ts
// PURPOSE: Validate tracker entry data before submission
// Methods: POST
// Auth Required: True
// Rate Limit: 100 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { getClientIp, generateRequestId } from '@/lib/utils';

const RATE_LIMIT = 100;
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// Common schema for tracker entry validation
const trackerEntrySchema = z.object({
  date: z.string().datetime().or(z.date()),
  platformId: z.string().optional().nullable(),
  customPlatformId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  problemsSolved: z.coerce.number().int().min(0).optional(),
  problemsAttempted: z.coerce.number().int().min(0).optional(),
  easyProblems: z.coerce.number().int().min(0).optional(),
  mediumProblems: z.coerce.number().int().min(0).optional(),
  hardProblems: z.coerce.number().int().min(0).optional(),
  commits: z.coerce.number().int().min(0).optional(),
  pullRequests: z.coerce.number().int().min(0).optional(),
  timeSpent: z.coerce.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
}).refine((data) => {
  // At least one metric should be provided
  return (
    (data.problemsSolved ?? 0) > 0 ||
    (data.problemsAttempted ?? 0) > 0 ||
    (data.commits ?? 0) > 0 ||
    (data.pullRequests ?? 0) > 0 ||
    (data.timeSpent ?? 0) > 0
  );
}, {
  message: "At least one metric (problems, commits, PRs, or time spent) must be greater than 0",
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
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `tracker-validate:${ip}`);
    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    const body = await request.json();
    const validation = trackerEntrySchema.safeParse(body);

    const data = {
      valid: validation.success,
      errors: validation.success ? null : validation.error.errors,
    };

    logger.info('POST /tracker/validate completed', {
      userId: session.user.id,
      valid: data.valid,
      duration: Date.now() - startTime,
      requestId,
    });

    const response = apiResponse.success(data, { meta: { requestId } });
    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('POST /tracker/validate failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to validate data', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
