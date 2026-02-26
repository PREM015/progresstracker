import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { NotificationChannel, Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{
    channel: string;
  }>;
}

// GET /api/notifications/channel/[channel]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { channel } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isReadParam = searchParams.get("isRead");

    const upperChannel = channel.toUpperCase();

    const validChannels = Object.values(NotificationChannel);
    if (!validChannels.includes(upperChannel as NotificationChannel)) {
      return apiError(
        `Invalid channel. Valid channels: ${validChannels.join(", ")}`,
        400
      );
    }

    const skip = (page - 1) * limit;

    const whereClause: Prisma.NotificationWhereInput = {
      userId: session.user.id,
      channel: upperChannel as NotificationChannel,
      isArchived: false,
    };

    if (isReadParam !== null) {
      whereClause.isRead = isReadParam === "true";
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

    return apiResponse.success({
      channel: upperChannel,
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