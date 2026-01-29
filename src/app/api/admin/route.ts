// src/app/api/admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin
 * Admin dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || "" },
      select: { isAdmin: true, isSuperAdmin: true },
    });

    if (!user || (!user.isAdmin && !user.isSuperAdmin)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // Get date range for stats (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch user statistics
    const totalUsers = await prisma.user.count();
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalUsersLastMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
          lt: thirtyDaysAgo,
        },
      },
    });

    // Fetch platform statistics
    const activePlatforms = await prisma.userPlatform.count({
      where: { disconnectedAt: null },
    });

    // Fetch sync statistics
    const totalSyncs = await prisma.syncLog.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const successfulSyncs = await prisma.syncLog.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: "success",
      },
    });

    const successRate =
      totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 0;

    // Fetch tracker entries
    const totalTrackerEntries = await prisma.trackerEntry.count();
    const entriesThisMonth = await prisma.trackerEntry.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          users: {
            total: totalUsers,
            new: newUsersThisMonth,
            change: ((newUsersThisMonth - totalUsersLastMonth) / (totalUsersLastMonth || 1)) * 100,
          },
          platforms: {
            active: activePlatforms,
          },
          syncs: {
            total: totalSyncs,
            successful: successfulSyncs,
            successRate,
          },
          entries: {
            total: totalTrackerEntries,
            thisMonth: entriesThisMonth,
          },
          timestamp: new Date(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin
 * Admin actions (not implemented)
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, message: "POST method not implemented" },
    { status: 405 }
  );
}



