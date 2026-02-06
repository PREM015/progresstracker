import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/notifications/[id]/archive - Archive a notification
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id } = params;

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

    return apiResponse(updated);
  } catch (error) {
    console.error("Error archiving notification:", error);
    return apiError("Failed to archive notification", 500);
  }
}

// DELETE /api/notifications/[id]/archive - Unarchive a notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id } = params;

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

    return apiResponse(updated);
  } catch (error) {
    console.error("Error unarchiving notification:", error);
    return apiError("Failed to unarchive notification", 500);
  }
}
