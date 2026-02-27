// src/app/api/cron/streak-check/route.ts
// Cron job to check streak status and send notifications

import { NextRequest, NextResponse } from 'next/server';
import { streakService } from '@/services/streakService';
import { logger } from '@/lib/logger';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn('Unauthorized cron access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}