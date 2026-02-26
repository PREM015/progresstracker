import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/notifications/dismiss - Dismiss notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const {
      notificationIds,
      dismissAll,
    }: {
      notificationIds?: string[];
      dismissAll?: boolean;
    } = body;

    const now = new Date();
    let updateResult;

    if (dismissAll) {
      updateResult = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isDismissed: false,
        },
        data: {
          isDismissed: true,
          dismissedAt: now,
        },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      updateResult = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: {
          isDismissed: true,
          dismissedAt: now,
        },
      });
    } else {
      return apiError("notificationIds or dismissAll is required", 400);
    }

    return apiResponse.success({
      success: true,
      dismissedCount: updateResult.count,
    });
  } catch (error) {
    console.error("Error dismissing notifications:", error);
    return apiError("Failed to dismiss notifications", 500);
  }
}