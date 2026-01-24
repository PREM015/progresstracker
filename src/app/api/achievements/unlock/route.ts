// src/app/api/achievements/unlock/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AchievementService } from '@/services/achievementService';

// POST - Manually unlock an achievement (admin or special cases)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { achievementId } = body;

    if (!achievementId) {
      return NextResponse.json(
        { error: 'Achievement ID required' },
        { status: 400 }
      );
    }

    const unlocked = await AchievementService.unlockAchievement(
      session.user.id,
      achievementId
    );

    if (!unlocked) {
      return NextResponse.json(
        { error: 'Achievement already unlocked or not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      achievement: unlocked,
    });
  } catch (error: any) {
    console.error('Unlock achievement error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlock achievement' },
      { status: 500 }
    );
  }
}