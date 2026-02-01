// src/app/api/achievements/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { AchievementService } from '@/services/achievementService';

// =============================================================================
// GET - Get Achievement Statistics
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized stats access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await apiRateLimiter.check(100, `achievements:stats:${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { ip, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    logger.debug('Fetching achievement stats', {
      userId: session.user.id,
      requestId,
    });

    // ✅ Get Statistics
    const stats = await AchievementService.getAchievementStats(session.user.id);

    const duration = Date.now() - startTime;

    logger.info('Achievement stats fetched', {
      userId: session.user.id,
      total: stats.total,
      unlocked: stats.unlocked,
      points: stats.points,
      duration,
      requestId,
    });

    return apiResponse.success(stats, {
      meta: { requestId, duration },
    });
  } catch (error) {
    logger.error('Failed to fetch achievement stats', { requestId }, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}