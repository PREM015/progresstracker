import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

interface RouteParams {
  params: Promise<{
    customPlatformId: string;
  }>;
}

// GET /api/tracker/custom-platform/[customPlatformId] - Get entries for a custom platform
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { customPlatformId } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Verify custom platform exists and belongs to user
    const customPlatform = await prisma.customPlatform.findFirst({
      where: {
        id: customPlatformId,
        userId: session.user.id,
      },
    });

    if (!customPlatform) {
      return apiError("Custom platform not found", 404);
    }

    const whereClause: any = {
      userId: session.user.id,
      customPlatformId,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: whereClause,
        include: {
          customPlatform: {
            select: {
              id: true,
              name: true,
              displayName: true,
              icon: true,
              color: true,
              category: true,
              trackingFields: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.trackerEntry.count({ where: whereClause }),
    ]);

    // Get custom platform stats
    const stats = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        points: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        productivityRating: true,
      },
    });

    return apiResponse.success({
      customPlatform,
      entries,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + entries.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching custom platform entries:", error);
    return apiError("Failed to fetch custom platform entries", 500);
  }
}

// POST /api/tracker/custom-platform/[customPlatformId] - Create entry for custom platform
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { customPlatformId } = await params;
    const body = await request.json();

    // Verify custom platform exists and belongs to user
    const customPlatform = await prisma.customPlatform.findFirst({
      where: {
        id: customPlatformId,
        userId: session.user.id,
      },
    });

    if (!customPlatform) {
      return apiError("Custom platform not found", 404);
    }

    const entry = await prisma.trackerEntry.create({
      data: {
        ...body,
        userId: session.user.id,
        customPlatformId,
        category: customPlatform.category,
        date: body.date ? new Date(body.date) : new Date(),
        source: "manual",
      },
      include: {
        customPlatform: {
          select: {
            id: true,
            name: true,
            displayName: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return apiResponse.created(entry);
  } catch (error) {
    console.error("Error creating custom platform entry:", error);
    return apiError("Failed to create entry", 500);
  }
}
