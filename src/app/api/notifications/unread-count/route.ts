// src/app/api/notifications/unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for current user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { count: 0, success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch unread notifications count
    const count = await prisma.notification.count({
      where: {
        user: {
          email: session.user.email,
        },
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("[Notifications API] Error fetching unread count:", error);
    return NextResponse.json(
      {
        success: false,
        count: 0,
        message: "Failed to fetch unread notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
