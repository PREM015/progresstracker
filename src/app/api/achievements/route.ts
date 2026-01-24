// src/app/api/achievements/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AchievementService } from '@/services/achievementService';

// GET - Get user achievements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeProgress = searchParams.get('progress') === 'true';
    const includeStats = searchParams.get('stats') === 'true';

    const [achievements, progress, stats] = await Promise.all([
      AchievementService.getUserAchievements(session.user.id),
      includeProgress ? AchievementService.getAchievementProgress(session.user.id) : null,
      includeStats ? AchievementService.getAchievementStats(session.user.id) : null,
    ]);

    return NextResponse.json({
      achievements,
      progress,
      stats,
    });
  } catch (error: any) {
    console.error('Get achievements error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get achievements' },
      { status: 500 }
    );
  }
}

// POST - Check and unlock achievements
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newUnlocks = await AchievementService.checkAndUnlockAchievements(
      session.user.id
    );

    return NextResponse.json({
      success: true,
      newUnlocks,
      count: newUnlocks.length,
    });
  } catch (error: any) {
    console.error('Check achievements error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check achievements' },
      { status: 500 }
    );
  }
}