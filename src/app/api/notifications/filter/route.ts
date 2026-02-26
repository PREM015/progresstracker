import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/notifications/filter - Filter notifications by various criteria
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const channel = searchParams.get("channel");
    const priority = searchParams.get("priority");
    const isRead = searchParams.get("isRead");
    const isArchived = searchParams.get("isArchived");
    const isDismissed = searchParams.get("isDismissed");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const entityType = searchParams.get("entityType");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
    };

    if (type) whereClause.type = type;
    if (channel) whereClause.channel = channel;
    if (priority) whereClause.priority = priority;
    if (isRead !== null) whereClause.isRead = isRead === "true";
    if (isArchived !== null) whereClause.isArchived = isArchived === "true";
    if (isDismissed !== null) whereClause.isDismissed = isDismissed === "true";
    if (entityType) whereClause.entityType = entityType;

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    // Get filter options (distinct values)
    const [types, channels, priorities, entityTypes] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        select: { type: true },
        distinct: ["type"],
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        select: { channel: true },
        distinct: ["channel"],
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        select: { priority: true },
        distinct: ["priority"],
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id, entityType: { not: null } },
        select: { entityType: true },
        distinct: ["entityType"],
      }),
    ]);

    return apiResponse.success({
      notifications,
      filterOptions: {
        types: types.map((t) => t.type),
        channels: channels.map((c) => c.channel),
        priorities: priorities.map((p) => p.priority),
        entityTypes: entityTypes.map((e) => e.entityType).filter(Boolean),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Error filtering notifications:", error);
    return apiError("Failed to filter notifications", 500);
  }
}
