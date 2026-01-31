/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/goals/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  GoalStatus,
  GoalType,
  GoalMetric,
  PlatformCategory,
} from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  
  // Must match schema enums
  category: z.nativeEnum(PlatformCategory),
  goalType: z.nativeEnum(GoalType).default('CUSTOM'),
  metric: z.nativeEnum(GoalMetric).default('PROBLEMS_SOLVED'),
  customMetric: z.string().optional().nullable(),
  
  // Target
  target: z.number().int().positive('Target must be positive'),
  
  // Dates
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  
  // Streak goals
  requiredStreakDays: z.number().int().positive().optional().nullable(),
  
  // Platform
  platformId: z.string().optional().nullable(),
  
  // Reminders
  reminderEnabled: z.boolean().default(false),
  
  // Display
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  
  // Visibility
  isPublic: z.boolean().default(false),
});

const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.nativeEnum(GoalStatus).optional(),
  progress: z.number().int().min(0).optional(),
});

// =============================================================================
// GET - Get all goals for user
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as GoalStatus | null;
    const goalType = searchParams.get('type') as GoalType | null;
    const category = searchParams.get('category') as PlatformCategory | null;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build where clause
    const where: any = {
      userId: session.user.id,

    };

    if (status) {
      where.status = status;
      console.log('Filtering goals by status:', status);
    } else if (!includeArchived) {
      where.status = { notIn: ['ARCHIVED', 'CANCELLED'] };
    }

    if (goalType) {
      where.goalType = goalType;
    }

    if (category) {
      where.category = category;
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        reminders: {
          where: { isActive: true },
          select: {
            id: true,
            frequency: true,
            time: true,
            nextSendAt: true,
          },
        },
        _count: {
          select: { reminders: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculate stats
    const allGoals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      select: { status: true },
    });

    const stats = {
      total: allGoals.length,
      active: allGoals.filter((g) => g.status === 'ACTIVE').length,
      completed: allGoals.filter((g) => g.status === 'COMPLETED').length,
      failed: allGoals.filter((g) => g.status === 'FAILED').length,
      paused: allGoals.filter((g) => g.status === 'PAUSED').length,
      archived: allGoals.filter((g) => g.status === 'ARCHIVED').length,
    };

    return NextResponse.json({
      success: true,
      goals,
      stats,
    });
  } catch (error: any) {
    console.error('Get goals error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get goals' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create new goal
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createGoalSchema.parse(body);

    // Validate platform exists if provided
    if (validated.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: validated.platformId },
      });
      if (!platform) {
        return NextResponse.json(
          { success: false, error: 'Platform not found' },
          { status: 404 }
        );
      }
    }

    // Create the goal
    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        title: validated.title,
        description: validated.description || null,
        category: validated.category,
        goalType: validated.goalType,
        metric: validated.metric,
        customMetric: validated.customMetric || null,
        target: validated.target,
        progress: 0,
        progressPercentage: 0,
        startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        status: 'ACTIVE',
        requiredStreakDays: validated.requiredStreakDays || null,
        currentStreakDays: 0,
        platformId: validated.platformId || null,
        reminderEnabled: validated.reminderEnabled,
        isPublic: validated.isPublic,
        color: validated.color || null,
        icon: validated.icon || null,
        daysActive: 0,
        avgDailyProgress: 0,
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        category: 'goals',
        entityType: 'goal',
        entityId: goal.id,
        description: `Created goal: ${goal.title}`,
        status: 'success',
      },
    });

    return NextResponse.json(
      { success: true, goal },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create goal error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create goal' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update goal
// =============================================================================

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    const validated = updateGoalSchema.parse(updateData);

    // Build update object
    const update: any = {
      updatedAt: new Date(),
    };

    // Map validated fields to update
    if (validated.title !== undefined) update.title = validated.title;
    if (validated.description !== undefined) update.description = validated.description;
    if (validated.category !== undefined) update.category = validated.category;
    if (validated.goalType !== undefined) update.goalType = validated.goalType;
    if (validated.metric !== undefined) update.metric = validated.metric;
    if (validated.customMetric !== undefined) update.customMetric = validated.customMetric;
    if (validated.target !== undefined) update.target = validated.target;
    if (validated.status !== undefined) update.status = validated.status;
    if (validated.progress !== undefined) {
      update.progress = validated.progress;
      update.progressPercentage = (validated.progress / (validated.target || existingGoal.target)) * 100;
    }
    if (validated.endDate !== undefined) update.endDate = validated.endDate ? new Date(validated.endDate) : null;
    if (validated.deadline !== undefined) update.deadline = validated.deadline ? new Date(validated.deadline) : null;
    if (validated.reminderEnabled !== undefined) update.reminderEnabled = validated.reminderEnabled;
    if (validated.isPublic !== undefined) update.isPublic = validated.isPublic;
    if (validated.color !== undefined) update.color = validated.color;
    if (validated.icon !== undefined) update.icon = validated.icon;

    // Handle status changes
    if (validated.status === 'COMPLETED' && existingGoal.status !== 'COMPLETED') {
      update.completedAt = new Date();
    }
    if (validated.status === 'FAILED' && existingGoal.status !== 'FAILED') {
      update.failedAt = new Date();
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: update,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    console.error('Update goal error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update goal' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete goal
// =============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Delete goal and related reminders
    await prisma.$transaction([
      prisma.goalReminder.deleteMany({ where: { goalId: id } }),
      prisma.goal.delete({ where: { id } }),
    ]);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        category: 'goals',
        entityType: 'goal',
        entityId: id,
        description: `Deleted goal: ${goal.title}`,
        status: 'success',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete goal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete goal' },
      { status: 500 }
    );
  }
}