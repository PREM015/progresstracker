// src/app/api/support-tickets/categories/route.ts
// =============================================================================
// SUPPORT CATEGORIES API
// Methods: GET, OPTIONS, HEAD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  supportConfig,
} from '@/config/support';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 100;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function addHeaders(response: NextResponse, requestId: string): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);
  return response;
}

// =============================================================================
// OPTIONS
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  return addHeaders(new NextResponse(null, { status: 204 }), requestId);
}

// =============================================================================
// HEAD
// =============================================================================

export async function HEAD(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, {
    status: 200,
    headers: {
      'X-Categories-Count': String(SUPPORT_CATEGORIES.length),
      'X-Priorities-Count': String(SUPPORT_PRIORITIES.length),
      'X-Statuses-Count': String(SUPPORT_STATUSES.length),
    },
  });
  return addHeaders(response, requestId);
}

// =============================================================================
// GET - Get Categories, Priorities, and Statuses
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, `support-categories:${ip}`);

    if (!rateLimitResult.success) {
      return addHeaders(apiResponse.rateLimited(60, requestId), requestId);
    }

    // Optional auth check - categories can be public
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user?.id;
    const isAdmin = Boolean(session?.user?.isAdmin || session?.user?.role === 'admin');

    // Filter categories based on auth status
    const categories = SUPPORT_CATEGORIES.filter((category) => {
      if (category.requiresAuth && !isAuthenticated) {
        return false;
      }
      return true;
    }).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      order: category.order,
      requiresAuth: category.requiresAuth,
    }));

    // Public priorities info
    const priorities = SUPPORT_PRIORITIES.map((p) => ({
      value: p.value,
      name: p.name,
      description: p.description,
      color: p.color,
      responseTimeHours: p.responseTimeHours,
      resolutionTimeHours: p.resolutionTimeHours,
    }));

    // Public statuses info
    const statuses = SUPPORT_STATUSES.map((s) => ({
      value: s.value,
      name: s.name,
      description: s.description,
      color: s.color,
      isOpen: s.isOpen,
      order: s.order,
    }));

    const data = {
      categories,
      priorities,
      statuses,
      config: {
        enabled: supportConfig.enabled,
        maxAttachments: supportConfig.ticketSettings.maxAttachments,
        maxAttachmentSize: supportConfig.ticketSettings.maxAttachmentSize,
        allowedFileTypes: supportConfig.ticketSettings.allowedFileTypes,
        satisfactionSurveyEnabled: supportConfig.ticketSettings.satisfactionSurveyEnabled,
      },
      ...(isAdmin
        ? {
            sla: supportConfig.sla,
            autoResponse: supportConfig.autoResponse,
          }
        : {}),
    };

    logger.debug('Categories fetched', {
      requestId,
      isAuthenticated,
      categoriesCount: categories.length,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(data, { meta: { requestId, isAuthenticated } });
    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('GET categories failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to fetch categories', requestId), requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';