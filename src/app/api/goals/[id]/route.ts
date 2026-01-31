// src/app/api/goals/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoalService } from "@/services/goalService";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { GoalStatus } from "@prisma/client";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * ✅ Use Prisma enum directly (prevents mismatch like "draft" vs "DRAFT")
 */
const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(GoalStatus).optional(), // ✅ Prisma enum
  target: z.number().min(0).optional(),
  progress: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});

const progressSchema = z.object({
  progress: z.number().min(0).optional(),
  increment: z.number().optional(),
});

// ✅ GET – Get single goal
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn("Unauthorized goal access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.debug("Fetching goal", { userId: session.user.id, goalId: id });

    const goal = await GoalService.getGoalById(session.user.id, id);

    if (!goal) {
      logger.warn("Goal not found", { userId: session.user.id, goalId: id });
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    logger.info("Goal fetched successfully", { userId: session.user.id, goalId: id });

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    logger.error("Failed to get goal", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get goal" },
      { status: 500 }
    );
  }
}

// ✅ PUT – Update goal
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const body = updateGoalSchema.parse(rawBody);

    logger.debug("Updating goal", {
      userId: session.user.id,
      goalId: id,
      fields: Object.keys(body),
    });

    const existing = await GoalService.getGoalById(session.user.id, id);
    if (!existing) {
      logger.warn("Goal not found for update", { userId: session.user.id, goalId: id });
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goal = await GoalService.updateGoal(session.user.id, id, body);

    logger.info("Goal updated successfully", { userId: session.user.id, goalId: id });

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to update goal", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update goal" },
      { status: 500 }
    );
  }
}

// ✅ PATCH – Update goal progress
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const { progress, increment } = progressSchema.parse(rawBody);

    logger.debug("Updating goal progress", {
      userId: session.user.id,
      goalId: id,
      progress,
      increment,
    });

    let goal;

    if (typeof increment === "number") {
      goal = await GoalService.incrementProgress(session.user.id, id, increment);
      logger.info("Goal progress incremented", {
        userId: session.user.id,
        goalId: id,
        increment,
      });
    } else if (typeof progress === "number") {
      goal = await GoalService.updateProgress(session.user.id, id, progress);
      logger.info("Goal progress set", {
        userId: session.user.id,
        goalId: id,
        progress,
      });
    } else {
      return NextResponse.json(
        { error: "Progress or increment value required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to update goal progress", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update progress" },
      { status: 500 }
    );
  }
}

// ✅ DELETE – Delete goal
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Deleting goal", { userId: session.user.id, goalId: id });

    const deleted = await GoalService.deleteGoal(session.user.id, id);

    if (!deleted) {
      logger.warn("Goal not found for deletion", { userId: session.user.id, goalId: id });
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    logger.info("Goal deleted successfully", { userId: session.user.id, goalId: id });

    return NextResponse.json({
      success: true,
      message: "Goal deleted",
    });
  } catch (error) {
    logger.error("Failed to delete goal", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete goal" },
      { status: 500 }
    );
  }
}
