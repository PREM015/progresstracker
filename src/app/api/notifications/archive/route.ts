import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/notifications/archive - Get archived notifications
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

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      isArchived: true,
    };

    if (type) {
      whereClause.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { archivedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return apiResponse({
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
    console.error("Error fetching archived notifications:", error);
    return apiError("Failed to fetch archived notifications", 500);
  }
}

// POST /api/notifications/archive - Archive multiple notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { notificationIds, archiveAll, archiveRead } = body;

    let updateResult;
    const now = new Date();

    if (archiveAll) {
      updateResult = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt: now,
        },
      });
    } else if (archiveRead) {
      updateResult = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: true,
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt: now,
        },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      updateResult = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: {
          isArchived: true,
          archivedAt: now,
        },
      });
    } else {
      return apiError("notificationIds, archiveAll, or archiveRead is required", 400);
    }

    return apiResponse({
      success: true,
      archivedCount: updateResult.count,
    });
  } catch (error) {
    console.error("Error archiving notifications:", error);
    return apiError("Failed to archive notifications", 500);
  }
}
