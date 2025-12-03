// src/app/api/goals/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoalService } from "@/services/goalService";
import { UpdateGoalRequest } from "@/types/goal";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// ✅ GET – Get single goal
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goal = await GoalService.getGoalById(session.user.id, id);

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to get goal" },
      { status: 500 }
    );
  }
}

// ✅ PUT – Update goal
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateGoalRequest = await request.json();

    const existing = await GoalService.getGoalById(session.user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goal = await GoalService.updateGoal(session.user.id, id, body);
    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update goal" },
      { status: 500 }
    );
  }
}

// ✅ PATCH – Update goal progress
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { progress, increment } = await request.json();

    let goal;

    if (typeof increment === "number") {
      goal = await GoalService.incrementProgress(session.user.id, id, increment);
    } else if (typeof progress === "number") {
      goal = await GoalService.updateProgress(session.user.id, id, progress);
    } else {
      return NextResponse.json(
        { error: "Progress or increment value required" },
        { status: 400 }
      );
    }

    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update progress" },
      { status: 500 }
    );
  }
}

// ✅ DELETE – Delete goal
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await GoalService.deleteGoal(session.user.id, id);

    if (!deleted) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Goal deleted",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete goal" },
      { status: 500 }
    );
  }
}
