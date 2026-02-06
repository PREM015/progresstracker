import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/notifications/recent - Get recent notifications (for dropdown/bell icon)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const includeRead = searchParams.get("includeRead") === "true";

    const whereClause: any = {
      userId: session.user.id,
      isArchived: false,
      isDismissed: false,
    };

    if (!includeRead) {
      whereClause.isRead = false;
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          isArchived: false,
          isDismissed: false,
        },
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isArchived: false,
        },
      }),
    ]);

    // Group by priority
    const byPriority = {
      urgent: notifications.filter((n) => n.priority === "URGENT").length,
      high: notifications.filter((n) => n.priority === "HIGH").length,
      normal: notifications.filter((n) => n.priority === "NORMAL").length,
      low: notifications.filter((n) => n.priority === "LOW").length,
    };

    return apiResponse({
      notifications,
      unreadCount,
      totalCount,
      byPriority,
      hasMore: unreadCount > limit,
    });
  } catch (error) {
    console.error("Error fetching recent notifications:", error);
    return apiError("Failed to fetch recent notifications", 500);
  }
}
