import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/notifications/batch - Batch operations on notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { action, notificationIds, filters } = body;

    if (!action) {
      return apiError("action is required", 400);
    }

    const validActions = ["read", "unread", "archive", "unarchive", "dismiss", "delete"];
    if (!validActions.includes(action)) {
      return apiError(`Invalid action. Valid actions: ${validActions.join(", ")}`, 400);
    }

    let whereClause: any = {
      userId: session.user.id,
    };

    if (notificationIds && Array.isArray(notificationIds)) {
      whereClause.id = { in: notificationIds };
    } else if (filters) {
      if (filters.type) whereClause.type = filters.type;
      if (filters.channel) whereClause.channel = filters.channel;
      if (filters.priority) whereClause.priority = filters.priority;
      if (filters.isRead !== undefined) whereClause.isRead = filters.isRead;
      if (filters.isArchived !== undefined) whereClause.isArchived = filters.isArchived;
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }
    } else {
      return apiError("notificationIds or filters is required", 400);
    }

    let result;
    const now = new Date();

    switch (action) {
      case "read":
        result = await prisma.notification.updateMany({
          where: whereClause,
          data: { isRead: true, readAt: now },
        });
        break;
      case "unread":
        result = await prisma.notification.updateMany({
          where: whereClause,
          data: { isRead: false, readAt: null },
        });
        break;
      case "archive":
        result = await prisma.notification.updateMany({
          where: whereClause,
          data: { isArchived: true, archivedAt: now },
        });
        break;
      case "unarchive":
        result = await prisma.notification.updateMany({
          where: whereClause,
          data: { isArchived: false, archivedAt: null },
        });
        break;
      case "dismiss":
        result = await prisma.notification.updateMany({
          where: whereClause,
          data: { isDismissed: true, dismissedAt: now },
        });
        break;
      case "delete":
        result = await prisma.notification.deleteMany({
          where: whereClause,
        });
        break;
    }

    return apiResponse({
      success: true,
      action,
      affectedCount: result?.count || 0,
    });
  } catch (error) {
    console.error("Error performing batch operation:", error);
    return apiError("Failed to perform batch operation", 500);
  }
}
