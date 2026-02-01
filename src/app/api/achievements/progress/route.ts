// src/app/api/achievements/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import apiResponse from '@/lib/apiResponse';
import { apiRateLimiter } from '@/lib/rateLimit';
import { AchievementService } from '@/services/achievementService';

// =============================================================================
// GET - Get Achievement Progress
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // ✅ Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized progress access', { requestId });
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // ✅ Rate Limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await apiRateLimiter.check(100, `achievements:progress:${ip}`);

    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded', { ip, requestId });
      return apiResponse.rateLimited(60, requestId);
    }

    logger.debug('Fetching achievement progress', {
      userId: session.user.id,
      requestId,
    });

    // ✅ Get Progress
    const progress = await AchievementService.getAchievementProgress(session.user.id);

    // Separate locked and unlocked
    const locked = progress.filter((p) => !p.isUnlocked);
    const unlocked = progress.filter((p) => p.isUnlocked);

    const duration = Date.now() - startTime;

    logger.info('Achievement progress fetched', {
      userId: session.user.id,
      total: progress.length,
      locked: locked.length,
      unlocked: unlocked.length,
      duration,
      requestId,
    });

    return apiResponse.success(
      {
        progress,
        summary: {
          total: progress.length,
          locked: locked.length,
          unlocked: unlocked.length,
          averageProgress: locked.length > 0
            ? Math.round(locked.reduce((sum, p) => sum + p.percentage, 0) / locked.length)
            : 0,
        },
      },
      {
        meta: { requestId, duration },
      }
    );
  } catch (error) {
    logger.error('Failed to fetch achievement progress', { requestId }, error);
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