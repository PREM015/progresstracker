import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { NotificationChannel } from "@prisma/client";

interface RouteParams {
  params: {
    channel: string;
  };
}

// GET /api/notifications/channel/[channel] - Get notifications by channel
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { channel } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isRead = searchParams.get("isRead");

    // Validate channel
    const validChannels = Object.values(NotificationChannel);
    if (!validChannels.includes(channel.toUpperCase() as NotificationChannel)) {
      return apiError(`Invalid channel. Valid channels: ${validChannels.join(", ")}`, 400);
    }

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      channel: channel.toUpperCase() as NotificationChannel,
      isArchived: false,
    };

    if (isRead !== null) {
      whereClause.isRead = isRead === "true";
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return apiResponse({
      channel: channel.toUpperCase(),
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
    console.error("Error fetching notifications by channel:", error);
    return apiError("Failed to fetch notifications", 500);
  }
}
