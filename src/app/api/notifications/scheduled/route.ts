import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/notifications/scheduled - Get scheduled notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includePast = searchParams.get("includePast") === "true";

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      scheduledFor: { not: null },
    };

    if (!includePast) {
      whereClause.scheduledFor = { gt: new Date() };
      whereClause.sentAt = null;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { scheduledFor: "asc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    // Get counts
    const pendingCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        scheduledFor: { gt: new Date() },
        sentAt: null,
      },
    });

    return apiResponse.success({
      notifications,
      pendingCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching scheduled notifications:", error);
    return apiError("Failed to fetch scheduled notifications", 500);
  }
}

// POST /api/notifications/scheduled - Schedule a notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { title, message, type, channel, priority, scheduledFor, metadata } = body;

    if (!title || !message || !scheduledFor) {
      return apiError("title, message, and scheduledFor are required", 400);
    }

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return apiError("scheduledFor must be in the future", 400);
    }

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        title,
        message,
        type: type || "CUSTOM",
        channel: channel || "IN_APP",
        priority: priority || "NORMAL",
        scheduledFor: scheduledDate,
        metadata,
      },
    });

    return apiResponse.created(notification);
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return apiError("Failed to schedule notification", 500);
  }
}

// DELETE /api/notifications/scheduled - Cancel scheduled notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return apiError("Notification ID is required", 400);
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
        scheduledFor: { not: null },
        sentAt: null,
      },
    });

    if (!notification) {
      return apiError("Scheduled notification not found", 404);
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return apiResponse.success({ success: true, message: "Scheduled notification cancelled" });
  } catch (error) {
    console.error("Error cancelling scheduled notification:", error);
    return apiError("Failed to cancel scheduled notification", 500);
  }
}
