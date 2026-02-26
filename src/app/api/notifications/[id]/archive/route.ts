import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/notifications/[id]/archive
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    return apiResponse.success(updated);
  } catch (error) {
    console.error("Error archiving notification:", error);
    return apiError("Failed to archive notification", 500);
  }
}

// DELETE /api/notifications/[id]/archive
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
        isArchived: false,
        archivedAt: null,
      },
    });

    return apiResponse.success(updated);
  } catch (error) {
    console.error("Error unarchiving notification:", error);
    return apiError("Failed to unarchive notification", 500);
  }
}