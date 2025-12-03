// src/app/api/goals/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoalService } from '@/services/goalService';
import { UpdateGoalRequest } from '@/types/goal';

interface RouteParams {
  params: { id: string };
}

// GET - Get single goal
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goal = await GoalService.getGoalById(session.user.id, params.id);

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get goal' },
      { status: 500 }
    );
  }
}

// PUT - Update goal
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateGoalRequest = await req.json();

    // Check goal exists and belongs to user
    const existing = await GoalService.getGoalById(session.user.id, params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goal = await GoalService.updateGoal(session.user.id, params.id, body);

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update goal' },
      { status: 500 }
    );
  }
}

// PATCH - Update goal progress
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { progress, increment } = body;

    let goal;

    if (typeof increment === 'number') {
      goal = await GoalService.incrementProgress(session.user.id, params.id, increment);
    } else if (typeof progress === 'number') {
      goal = await GoalService.updateProgress(session.user.id, params.id, progress);
    } else {
      return NextResponse.json(
        { error: 'Progress or increment value required' },
        { status: 400 }
      );
    }

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// DELETE - Delete goal
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deleted = await GoalService.deleteGoal(session.user.id, params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Goal deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete goal' },
      { status: 500 }
    );
  }
}