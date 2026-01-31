// src/app/api/waitlist/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/waitlist/stats - Get public waitlist statistics
export async function GET(req: NextRequest) {
  try {
    const [totalWaiting, totalInvited, totalJoined, recentJoins] = await Promise.all([
      prisma.waitlist.count({
        where: { status: "waiting" },
      }),
      prisma.waitlist.count({
        where: { status: "invited" },
      }),
      prisma.waitlist.count({
        where: { status: "joined" },
      }),
      prisma.waitlist.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const total = totalWaiting + totalInvited + totalJoined;

    // Get growth trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyGrowth = await prisma.waitlist.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    logger.info("Waitlist stats fetched", {
      total,
      totalWaiting,
    });

    return NextResponse.json({
      stats: {
        total,
        waiting: totalWaiting,
        invited: totalInvited,
        joined: totalJoined,
        recentJoins24h: recentJoins,
        weeklyGrowth,
      },
      message: `${totalWaiting.toLocaleString()} people are waiting for access!`,
    });
  } catch (error) {
    logger.error("Error fetching waitlist stats", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}