import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { Prisma, NotificationType } from "@prisma/client";

// GET /api/notifications/export - Export notification history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const typeParam = searchParams.get("type");
    const includeArchived = searchParams.get("includeArchived") === "true";
    const limit = parseInt(searchParams.get("limit") || "1000");

    const whereClause: Prisma.NotificationWhereInput = {
      userId: session.user.id,
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (typeParam) {
      if (
        Object.values(NotificationType).includes(
          typeParam as NotificationType
        )
      ) {
        whereClause.type = typeParam as NotificationType;
      } else {
        return apiError("Invalid notification type", 400);
      }
    }

    if (!includeArchived) {
      whereClause.isArchived = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        channel: true,
        priority: true,
        title: true,
        message: true,
        isRead: true,
        readAt: true,
        isArchived: true,
        archivedAt: true,
        isDismissed: true,
        dismissedAt: true,
        createdAt: true,
        entityType: true,
        entityId: true,
        actionUrl: true,
      },
    });

    if (format === "csv") {
      const headers = [
        "ID",
        "Type",
        "Channel",
        "Priority",
        "Title",
        "Message",
        "Is Read",
        "Read At",
        "Is Archived",
        "Created At",
      ];

      const csvRows = [
        headers.join(","),
        ...notifications.map((n) =>
          [
            n.id,
            n.type,
            n.channel,
            n.priority,
            `"${n.title.replace(/"/g, '""')}"`,
            `"${n.message.replace(/"/g, '""')}"`,
            n.isRead,
            n.readAt?.toISOString() || "",
            n.isArchived,
            n.createdAt.toISOString(),
          ].join(",")
        ),
      ];

      const csv = csvRows.join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="notifications-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    }

    return apiResponse.success({
      notifications,
      exportedAt: new Date().toISOString(),
      count: notifications.length,
    });
  } catch (error) {
    console.error("Error exporting notifications:", error);
    return apiError("Failed to export notifications", 500);
  }
}