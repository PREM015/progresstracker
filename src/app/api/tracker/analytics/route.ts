import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/analytics - Get aggregated analytics for tracker entries
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

    const whereClause: any = {
      userId: session.user.id,
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

    if (category) {
      whereClause.category = category;
    }

    // Aggregate analytics
    const analytics = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        problemsAttempted: true,
        easyProblems: true,
        mediumProblems: true,
        hardProblems: true,
        commits: true,
        pullRequests: true,
        pullRequestsMerged: true,
        issuesOpened: true,
        issuesClosed: true,
        codeReviews: true,
        linesOfCode: true,
        projectsStarted: true,
        projectsCompleted: true,
        coursesStarted: true,
        coursesCompleted: true,
        lessonsCompleted: true,
        certificationsEarned: true,
        timeSpent: true,
        focusTime: true,
        contestsParticipated: true,
        hackathonsJoined: true,
        applicationsSubmitted: true,
        points: true,
        pointsEarned: true,
        xpEarned: true,
      },
      _avg: {
        averageDifficulty: true,
        accuracyRate: true,
        completionRate: true,
        productivityRating: true,
        energyLevel: true,
      },
      _count: {
        id: true,
      },
      _max: {
        rating: true,
        rank: true,
        streak: true,
      },
      _min: {
        rating: true,
        rank: true,
      },
    });

    // Get entries count by category
    const categoryBreakdown = await prisma.trackerEntry.groupBy({
      by: ["category"],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
    });

    // Get entries count by platform
    const platformBreakdown = await prisma.trackerEntry.groupBy({
      by: ["platformId"],
      where: {
        ...whereClause,
        platformId: { not: null },
      },
      _count: {
        id: true,
      },
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
    });

    // Get daily trend
    const dailyTrend = await prisma.trackerEntry.groupBy({
      by: ["date"],
      where: whereClause,
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return apiResponse({
      analytics,
      categoryBreakdown,
      platformBreakdown,
      dailyTrend,
    });
  } catch (error) {
    console.error("Error fetching tracker analytics:", error);
    return apiError("Failed to fetch analytics", 500);
  }
}
