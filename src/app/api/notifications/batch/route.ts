/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { Prisma } from "@prisma/client";

// POST /api/notifications/batch
// Batch operations on notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { action, notificationIds, filters } = body as {
      action?: string;
      notificationIds?: string[];
      filters?: {
        type?: string;
        channel?: string;
        priority?: string;
        isRead?: boolean;
        isArchived?: boolean;
        startDate?: string;
        endDate?: string;
      };
    };

    if (!action) {
      return apiError("action is required", 400);
    }

    const validActions = [
      "read",
      "unread",
      "archive",
      "unarchive",
      "dismiss",
      "delete",
    ] as const;

    if (!validActions.includes(action as any)) {
      return apiError(
        `Invalid action. Valid actions: ${validActions.join(", ")}`,
        400
      );
    }

    const whereClause: Prisma.NotificationWhereInput = {
      userId: session.user.id,
    };

    if (notificationIds && Array.isArray(notificationIds)) {
      whereClause.id = { in: notificationIds };
    } else if (filters) {
      if (filters.type) whereClause.type = filters.type as any;
      if (filters.channel) whereClause.channel = filters.channel as any;
      if (filters.priority) whereClause.priority = filters.priority as any;
      if (filters.isRead !== undefined)
        whereClause.isRead = filters.isRead;
      if (filters.isArchived !== undefined)
        whereClause.isArchived = filters.isArchived;

      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }
    } else {
      return apiError("notificationIds or filters is required", 400);
    }

    const now = new Date();
    let result:
      | Prisma.BatchPayload
      | null = null;

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

    return apiResponse.success({
      success: true,
      action,
      affectedCount: result?.count ?? 0,
    });
  } catch (error) {
    console.error("Error performing batch operation:", error);
    return apiError("Failed to perform batch operation", 500);
  }
}