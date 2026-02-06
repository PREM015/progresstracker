import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

interface RouteParams {
  params: {
    platformId: string;
  };
}

// GET /api/tracker/platform/[platformId] - Get entries for a specific platform
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { platformId } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      platformId,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [entries, total, platform] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: whereClause,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
              category: true,
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
      prisma.platform.findUnique({
        where: { id: platformId },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          color: true,
          category: true,
          description: true,
        },
      }),
    ]);

    // Get platform-specific stats
    const stats = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
        points: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        averageDifficulty: true,
        productivityRating: true,
      },
    });

    return apiResponse({
      platform,
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
    console.error("Error fetching platform entries:", error);
    return apiError("Failed to fetch platform entries", 500);
  }
}

// POST /api/tracker/platform/[platformId] - Create entry for specific platform
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { platformId } = params;
    const body = await request.json();

    // Verify platform exists
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return apiError("Platform not found", 404);
    }

    const entry = await prisma.trackerEntry.create({
      data: {
        ...body,
        userId: session.user.id,
        platformId,
        category: platform.category,
        date: body.date ? new Date(body.date) : new Date(),
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return apiResponse(entry, 201);
  } catch (error) {
    console.error("Error creating platform entry:", error);
    return apiError("Failed to create entry", 500);
  }
}
