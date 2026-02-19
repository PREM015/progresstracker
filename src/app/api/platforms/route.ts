// src/app/api/platforms/route.ts
/**
 * Platform Verification API & List
 * 
 * Verifies platform connection by testing credentials and updating status.
 * List all available platforms.
 * 
 * @route GET /api/platforms - List all platforms
 * @route POST /api/platforms/verify - Verify platform connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import PlatformService from '@/services/platformService';
import { decrypt, decryptJSON } from '@/lib/encryption';
import { ScraperFactory } from '@/services/scrapers';
import type { ScraperCredentials } from '@/services/scrapers/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/platforms
 *
 * List all available platforms
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // Authentication (optional — allow listing platforms even if not logged in)
    const session = await getServerSession(authOptions);

    // Rate limiting
    const rateLimitKey = `platforms:list:${session?.user?.id || getClientIp(request)}`;
    const rateLimitResult = await checkLimit(apiRateLimiter, 60, rateLimitKey);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId, rateLimitResult);
    }

    // Fetch all active platforms
    const { data: platforms } = await PlatformService.getAllPlatforms(
      { isActive: true },
      { limit: 100, sortBy: 'syncPriority', sortOrder: 'desc' }
    );

    logger.child({ route: 'platforms' }).info('Platforms listed', {
      count: platforms.length,
      requestId,
      duration: Date.now() - startTime,
    });

    return addHeaders(
      apiResponse.success(platforms, {
        meta: { requestId, total: platforms.length, duration: Date.now() - startTime },
      }),
      requestId,
      rateLimitResult
    );
  } catch (error) {
    logger.child({ route: 'platforms' }).error('Error listing platforms', { requestId }, error);
    return addHeaders(apiResponse.error(error, requestId), requestId);
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';