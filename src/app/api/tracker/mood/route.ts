import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/mood - Get mood and productivity data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const days = parseInt(searchParams.get("days") || "30");

    let whereClause: any = {
      userId: session.user.id,
      OR: [
        { mood: { not: null } },
        { energyLevel: { not: null } },
        { productivityRating: { not: null } },
      ],
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      whereClause.date = {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      };
    }

    const entries = await prisma.trackerEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        date: true,
        mood: true,
        energyLevel: true,
        productivityRating: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
        notes: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Aggregate mood data
    const moodStats = await prisma.trackerEntry.groupBy({
      by: ["mood"],
      where: {
        userId: session.user.id,
        mood: { not: null },
        date: whereClause.date,
      },
      _count: {
        id: true,
      },
    });

    // Average energy and productivity
    const averages = await prisma.trackerEntry.aggregate({
      where: {
        userId: session.user.id,
        date: whereClause.date,
      },
      _avg: {
        energyLevel: true,
        productivityRating: true,
      },
    });

    // Correlation analysis: productivity vs problems solved
    const productivityCorrelation = entries
      .filter((e) => e.productivityRating && e.problemsSolved)
      .map((e) => ({
        date: e.date,
        productivityRating: e.productivityRating,
        problemsSolved: e.problemsSolved,
      }));

    // Daily mood trend
    const dailyMoodTrend = await prisma.trackerEntry.groupBy({
      by: ["date"],
      where: {
        userId: session.user.id,
        date: whereClause.date,
      },
      _avg: {
        energyLevel: true,
        productivityRating: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return apiResponse({
      entries,
      moodStats,
      averages,
      productivityCorrelation,
      dailyMoodTrend,
      totalEntries: entries.length,
    });
  } catch (error) {
    console.error("Error fetching mood data:", error);
    return apiError("Failed to fetch mood data", 500);
  }
}

// POST /api/tracker/mood - Update mood for a specific date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { date, mood, energyLevel, productivityRating, notes } = body;

    if (!date) {
      return apiError("Date is required", 400);
    }

    // Find existing entry for the date or create new one
    const existingEntry = await prisma.trackerEntry.findFirst({
      where: {
        userId: session.user.id,
        date: new Date(date),
        platformId: null,
        customPlatformId: null,
      },
    });

    let entry;
    if (existingEntry) {
      entry = await prisma.trackerEntry.update({
        where: { id: existingEntry.id },
        data: {
          mood,
          energyLevel,
          productivityRating,
          notes: notes || existingEntry.notes,
        },
      });
    } else {
      entry = await prisma.trackerEntry.create({
        data: {
          userId: session.user.id,
          date: new Date(date),
          mood,
          energyLevel,
          productivityRating,
          notes,
          source: "manual",
        },
      });
    }

    return apiResponse(entry);
  } catch (error) {
    console.error("Error updating mood data:", error);
    return apiError("Failed to update mood data", 500);
  }
}
