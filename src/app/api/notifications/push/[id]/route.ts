import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/notifications/push/[id] - Get specific push subscription
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id } = await params;

    const subscription = await prisma.pushSubscription.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!subscription) {
      return apiError("Push subscription not found", 404);
    }

    return apiResponse.success(subscription);
  } catch (error) {
    console.error("Error fetching push subscription:", error);
    return apiError("Failed to fetch push subscription", 500);
  }
}

// PATCH /api/notifications/push/[id] - Update push subscription
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { deviceName, isActive } = body;

    const subscription = await prisma.pushSubscription.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!subscription) {
      return apiError("Push subscription not found", 404);
    }

    const updated = await prisma.pushSubscription.update({
      where: { id },
      data: {
        ...(deviceName !== undefined && { deviceName }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return apiResponse.success(updated);
  } catch (error) {
    console.error("Error updating push subscription:", error);
    return apiError("Failed to update push subscription", 500);
  }
}

// DELETE /api/notifications/push/[id] - Delete specific push subscription
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id } = await params;

    const subscription = await prisma.pushSubscription.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!subscription) {
      return apiError("Push subscription not found", 404);
    }

    await prisma.pushSubscription.delete({
      where: { id },
    });

    return apiResponse.success({ success: true, message: "Push subscription removed" });
  } catch (error) {
    console.error("Error deleting push subscription:", error);
    return apiError("Failed to delete push subscription", 500);
  }
}
