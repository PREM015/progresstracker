import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/notifications/[id]/dismiss
// Dismiss a notification
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Next.js 16 requires awaiting params
    const { id } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!notification) {
      return apiError("Notification not found", 404);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    // ✅ Correct usage (apiResponse is an object, not a function)
    return apiResponse.success(updated);
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return apiError("Failed to dismiss notification", 500);
  }
}