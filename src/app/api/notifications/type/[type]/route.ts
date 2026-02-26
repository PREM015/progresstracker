import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { NotificationType } from "@prisma/client";

interface RouteParams {
  params: Promise<{
    type: string;
  }>;
}

// GET /api/notifications/type/[type] - Get notifications by type
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { type } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("isRead");
    const includeArchived = searchParams.get("includeArchived") === "true";

    // Validate type
    const validTypes = Object.values(NotificationType);
    if (!validTypes.includes(type.toUpperCase() as NotificationType)) {
      return apiError(`Invalid notification type. Valid types: ${validTypes.join(", ")}`, 400);
    }

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      type: type.toUpperCase() as NotificationType,
    };

    if (isRead !== null) {
      whereClause.isRead = isRead === "true";
    }

    if (!includeArchived) {
      whereClause.isArchived = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          ...whereClause,
          isRead: false,
        },
      }),
    ]);

    return apiResponse.success({
      type: type.toUpperCase(),
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications by type:", error);
    return apiError("Failed to fetch notifications", 500);
  }
}

// DELETE /api/notifications/type/[type] - Delete all notifications of a type
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { type } = await params;

    const validTypes = Object.values(NotificationType);
    if (!validTypes.includes(type.toUpperCase() as NotificationType)) {
      return apiError("Invalid notification type", 400);
    }

    const result = await prisma.notification.deleteMany({
      where: {
        userId: session.user.id,
        type: type.toUpperCase() as NotificationType,
      },
    });

    return apiResponse.success({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error deleting notifications by type:", error);
    return apiError("Failed to delete notifications", 500);
  }
}
