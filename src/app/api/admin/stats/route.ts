import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalUsers,
      totalPlatforms,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.platform.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          platforms: totalPlatforms,
        },
        recentUsers,
      },
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load stats" },
      { status: 500 }
    );
  }
}
