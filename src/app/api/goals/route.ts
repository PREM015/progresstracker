import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {prisma} from "@/lib/prisma";

/**
 * GET /api/goals
 * Fetch all goals for logged-in user
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(goals);
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, target, deadline } = body;

  if (!title || !target) {
    return NextResponse.json(
      { error: "Title and target are required" },
      { status: 400 }
    );
  }

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      title,
      target: Number(target),
      progress: 0,
      deadline: deadline ? new Date(deadline) : null,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
