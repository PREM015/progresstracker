import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { NotificationPriority } from "@prisma/client";

interface RouteParams {
  params: {
    priority: string;
  };
}

// GET /api/notifications/priority/[priority] - Get notifications by priority
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { priority } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("isRead");

    // Validate priority
    const validPriorities = Object.values(NotificationPriority);
    if (!validPriorities.includes(priority.toUpperCase() as NotificationPriority)) {
      return apiError(`Invalid priority. Valid priorities: ${validPriorities.join(", ")}`, 400);
    }

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      priority: priority.toUpperCase() as NotificationPriority,
      isArchived: false,
    };

    if (isRead !== null) {
      whereClause.isRead = isRead === "true";
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return apiResponse({
      priority: priority.toUpperCase(),
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications by priority:", error);
    return apiError("Failed to fetch notifications", 500);
  }
}
