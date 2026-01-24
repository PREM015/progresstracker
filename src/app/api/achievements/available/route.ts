// src/app/api/achievements/available/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AchievementService } from '@/services/achievementService';

// GET - Get available (not yet unlocked) achievements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let achievements = await AchievementService.getAvailableAchievements(
      session.user.id
    );

    // Filter by category if specified
    if (category) {
      achievements = achievements.filter(a => a.category === category);
    }

    return NextResponse.json({
      achievements,
      count: achievements.length,
    });
  } catch (error: any) {
    console.error('Get available achievements error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get available achievements' },
      { status: 500 }
    );
  }
}