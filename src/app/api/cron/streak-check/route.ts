// src/app/api/cron/streak-check/route.ts
// Cron job to check streak status and send notifications
// SECURITY: Protected by withCronAuth (Bearer token + optional IP allowlist)

import { NextRequest, NextResponse } from 'next/server';
import { streakService } from '@/services/streakService';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/server/cron-auth';

async function handleStreakCheck(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Get action type from query
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'at-risk';

    let result;

    switch (action) {
      case 'at-risk':
        // Check for streaks at risk (run every few hours)
        result = await streakService.checkStreaksAtRisk();
        logger.info('Streak at-risk check completed', {
          ...result,
          duration: Date.now() - startTime,
        });
        break;

      case 'broken':
        // Check for broken streaks (run at midnight)
        result = await streakService.checkBrokenStreaks();
        logger.info('Broken streaks check completed', {
          ...result,
          duration: Date.now() - startTime,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "at-risk" or "broken"' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      ...result,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Streak cron job failed', {}, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withCronAuth(handleStreakCheck);
export const POST = withCronAuth(handleStreakCheck);

export const dynamic = 'force-dynamic';
export const maxDuration = 60;