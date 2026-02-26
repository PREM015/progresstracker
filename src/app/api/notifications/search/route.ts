import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/notifications/search - Search notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q") || searchParams.get("query");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeArchived = searchParams.get("includeArchived") === "true";

    if (!query || query.length < 2) {
      return apiError("Search query must be at least 2 characters", 400);
    }

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { message: { contains: query, mode: "insensitive" } },
        { shortMessage: { contains: query, mode: "insensitive" } },
      ],
    };

    if (!includeArchived) {
      whereClause.isArchived = false;
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
      query,
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
    console.error("Error searching notifications:", error);
    return apiError("Failed to search notifications", 500);
  }
}
