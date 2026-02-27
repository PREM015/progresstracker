import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/range - Get entries within a flexible date range
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const platformId = searchParams.get("platformId");
    const category = searchParams.get("category");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month
    const includeEmpty = searchParams.get("includeEmpty") === "true";

    if (!startDate || !endDate) {
      return apiError("startDate and endDate are required", 400);
    }

    const whereClause: any = {
      userId: session.user.id,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (platformId) {
      whereClause.platformId = platformId;
    }

    if (category) {
      whereClause.category = category;
    }

    const entries = await prisma.trackerEntry.findMany({
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
        date: "asc",
      },
    });

    // Group entries by date
    const groupedEntries: Record<string, any[]> = {};

    entries.forEach((entry) => {
      const dateKey = entry.date.toISOString().split("T")[0];
      if (!groupedEntries[dateKey]) {
        groupedEntries[dateKey] = [];
      }
      groupedEntries[dateKey].push(entry);
    });

    // Calculate daily aggregates
    const dailyAggregates = Object.entries(groupedEntries).map(([date, dayEntries]) => {
      return {
        date,
        entriesCount: dayEntries.length,
        problemsSolved: dayEntries.reduce((sum, e) => sum + (e.problemsSolved || 0), 0),
        commits: dayEntries.reduce((sum, e) => sum + (e.commits || 0), 0),
        pullRequests: dayEntries.reduce((sum, e) => sum + (e.pullRequests || 0), 0),
        timeSpent: dayEntries.reduce((sum, e) => sum + (e.timeSpent || 0), 0),
        points: dayEntries.reduce((sum, e) => sum + (e.points || 0), 0),
        platforms: [...new Set(dayEntries.map((e) => e.platformId).filter(Boolean))],
        categories: [...new Set(dayEntries.map((e) => e.category).filter(Boolean))],
      };
    });

    // Overall stats for the range
    const rangeStats = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
        points: true,
        coursesCompleted: true,
        certificationsEarned: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        productivityRating: true,
        energyLevel: true,
      },
    });

    return apiResponse.success({
      startDate,
      endDate,
      entries,
      groupedEntries,
      dailyAggregates,
      rangeStats,
      totalDays: Object.keys(groupedEntries).length,
      totalEntries: entries.length,
    });
  } catch (error) {
    console.error("Error fetching range entries:", error);
    return apiError("Failed to fetch range entries", 500);
  }
}
