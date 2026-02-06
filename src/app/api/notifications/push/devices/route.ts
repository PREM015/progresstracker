import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/notifications/push/devices - List push subscribed devices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        browser: true,
        os: true,
        isActive: true,
        lastUsedAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: "desc" },
    });

    const activeCount = subscriptions.filter((s) => s.isActive).length;
    const totalSuccessRate = subscriptions.length > 0
      ? subscriptions.reduce((acc, s) => {
          const total = s.successCount + s.failureCount;
          return acc + (total > 0 ? s.successCount / total : 1);
        }, 0) / subscriptions.length
      : 0;

    return apiResponse({
      devices: subscriptions,
      activeCount,
      totalCount: subscriptions.length,
      averageSuccessRate: Math.round(totalSuccessRate * 100),
    });
  } catch (error) {
    console.error("Error fetching push devices:", error);
    return apiError("Failed to fetch push devices", 500);
  }
}

// DELETE /api/notifications/push/devices - Remove all push subscriptions
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const result = await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    return apiResponse({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error removing push devices:", error);
    return apiError("Failed to remove push devices", 500);
  }
}
