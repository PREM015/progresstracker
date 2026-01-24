// src/app/api/goals/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { GoalService } from '@/services/goalService';
import { CreateGoalRequest } from '@/types/goal';

// GET - Get all goals for user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;
    const type = searchParams.get('type') as any;
    const category = searchParams.get('category') as any;

    const goals = await GoalService.getUserGoals(session.user.id, {
      status,
      type,
      category,
    });

    const stats = await GoalService.getGoalStats(session.user.id);

    return NextResponse.json({
      goals,
      stats,
    });
  } catch (error: any) {
    console.error('Get goals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get goals' },
      { status: 500 }
    );
  }
}

// POST - Create new goal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateGoalRequest = await req.json();

    // Validation
    if (!body.title || !body.target) {
      return NextResponse.json(
        { error: 'Title and target are required' },
        { status: 400 }
      );
    }

    if (body.target <= 0) {
      return NextResponse.json(
        { error: 'Target must be a positive number' },
        { status: 400 }
      );
    }

    const goal = await GoalService.createGoal(session.user.id, {
      title: body.title,
      description: body.description,
      type: body.type || 'custom',
      category: body.category || 'custom',
      target: body.target,
      unit: body.unit,
      deadline: body.deadline,
      platformId: body.platformId,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    console.error('Create goal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create goal' },
      { status: 500 }
    );
  }
}