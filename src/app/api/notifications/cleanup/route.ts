import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// POST /api/notifications/cleanup - Clean old notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { 
      olderThanDays = 90, 
      onlyRead = true, 
      onlyArchived = false,
      onlyDismissed = false,
      deleteExpired = true,
    } = body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const whereConditions: any[] = [];

    // Delete old read notifications
    if (onlyRead) {
      whereConditions.push({
        userId: session.user.id,
        isRead: true,
        createdAt: { lt: cutoffDate },
      });
    }

    // Delete old archived notifications
    if (onlyArchived) {
      whereConditions.push({
        userId: session.user.id,
        isArchived: true,
        archivedAt: { lt: cutoffDate },
      });
    }

    // Delete old dismissed notifications
    if (onlyDismissed) {
      whereConditions.push({
        userId: session.user.id,
        isDismissed: true,
        dismissedAt: { lt: cutoffDate },
      });
    }

    // Delete expired notifications
    if (deleteExpired) {
      whereConditions.push({
        userId: session.user.id,
        expiresAt: { lt: new Date() },
      });
    }

    let totalDeleted = 0;
    const details: Record<string, number> = {};

    for (const condition of whereConditions) {
      const result = await prisma.notification.deleteMany({
        where: condition,
      });
      totalDeleted += result.count;
      
      // Track what was deleted
      if (condition.isRead) details.read = result.count;
      if (condition.isArchived) details.archived = result.count;
      if (condition.isDismissed) details.dismissed = result.count;
      if (condition.expiresAt) details.expired = result.count;
    }

    // Get remaining counts
    const remainingCount = await prisma.notification.count({
      where: { userId: session.user.id },
    });

    return apiResponse({
      success: true,
      deletedCount: totalDeleted,
      details,
      remainingCount,
      cutoffDate,
    });
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
    return apiError("Failed to cleanup notifications", 500);
  }
}
