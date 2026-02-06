import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { PlatformCategory } from "@prisma/client";

interface RouteParams {
  params: {
    category: string;
  };
}

// GET /api/tracker/category/[category] - Get entries for a specific category
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { category } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const platformId = searchParams.get("platformId");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Validate category
    const validCategories = Object.values(PlatformCategory);
    if (!validCategories.includes(category.toUpperCase() as PlatformCategory)) {
      return apiError("Invalid category", 400);
    }

    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
      category: category.toUpperCase() as PlatformCategory,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (platformId) {
      whereClause.platformId = platformId;
    }

    const [entries, total] = await Promise.all([
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
            },
          },
          customPlatform: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
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

    // Get category-specific stats
    const stats = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        problemsAttempted: true,
        easyProblems: true,
        mediumProblems: true,
        hardProblems: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
        points: true,
        coursesCompleted: true,
        certificationsEarned: true,
        projectsCompleted: true,
        applicationsSubmitted: true,
        contestsParticipated: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        averageDifficulty: true,
        productivityRating: true,
        accuracyRate: true,
      },
    });

    // Get platforms in this category
    const platformsInCategory = await prisma.trackerEntry.groupBy({
      by: ["platformId"],
      where: {
        ...whereClause,
        platformId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    return apiResponse({
      category: category.toUpperCase(),
      entries,
      stats,
      platformsCount: platformsInCategory.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + entries.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching category entries:", error);
    return apiError("Failed to fetch category entries", 500);
  }
}
