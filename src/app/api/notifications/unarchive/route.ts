import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/notifications/unarchive - Unarchive notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { notificationIds, unarchiveAll } = body;

    let updateResult;

    if (unarchiveAll) {
      updateResult = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isArchived: true,
        },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      updateResult = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: {
          isArchived: false,
          archivedAt: null,
        },
      });
    } else {
      return apiError("notificationIds or unarchiveAll is required", 400);
    }

    return apiResponse.success({
      success: true,
      unarchivedCount: updateResult.count,
    });
  } catch (error) {
    console.error("Error unarchiving notifications:", error);
    return apiError("Failed to unarchive notifications", 500);
  }
}
