// src/app/api/streak-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";

async function getUserFromSession(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });

  return user;
}

// GET /api/streak-history - Get user's streak history
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized streak history access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const isActive = searchParams.get("isActive");

    const skip = (page - 1) * limit;

    const where = {
      userId: user.id,
      ...(isActive !== null && isActive !== undefined && {
        isActive: isActive === "true",
      }),
    };

    const [streaks, total] = await Promise.all([
      prisma.streakHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "desc" },
      }),
      prisma.streakHistory.count({ where }),
    ]);

    // Get current user streak info
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        streakStartDate: true,
      },
    });

    // Calculate stats
    const totalStreaks = total;
    const longestStreak = currentUser?.longestStreak || 0;
    const currentStreak = currentUser?.currentStreak || 0;
    const avgStreakLength =
      streaks.length > 0
        ? Math.round(streaks.reduce((sum, s) => sum + s.length, 0) / streaks.length)
        : 0;

    logger.info("Streak history fetched", {
      userId: user.id,
      total,
      page,
    });

    return NextResponse.json({
      streaks,
      currentStreak: {
        length: currentStreak,
        startDate: currentUser?.streakStartDate,
        lastActivityDate: currentUser?.lastActivityDate,
      },
      stats: {
        total: totalStreaks,
        longest: longestStreak,
        current: currentStreak,
        average: avgStreakLength,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching streak history", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}