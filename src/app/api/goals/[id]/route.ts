import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";

/**
 * GET /api/goals/:id
 */
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goal = await prisma.goal.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json(goal);
}

/**
 * PUT /api/goals/:id
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, target, progress, deadline, completedAt } = body;

  const updatedGoal = await prisma.goal.updateMany({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    data: {
      title,
      target,
      progress,
      deadline: deadline ? new Date(deadline) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
    },
  });

  if (updatedGoal.count === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/goals/:id
 */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.goal.deleteMany({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
