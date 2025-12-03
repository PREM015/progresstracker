// src/app/api/goals/active/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoalService } from '@/services/goalService';

// GET - Get active (incomplete) goals
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await GoalService.getActiveGoals(session.user.id);

    return NextResponse.json({
      goals,
      count: goals.length,
    });
  } catch (error: any) {
    console.error('Get active goals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get active goals' },
      { status: 500 }
    );
  }
}