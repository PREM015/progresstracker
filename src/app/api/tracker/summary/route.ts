import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

// GET /api/tracker/summary - Get summary stats (daily/weekly/monthly)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // day, week, month, all
    const timezone = searchParams.get("timezone") || "UTC";

    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (period) {
      case "day":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
    }

    const whereClause = {
      userId: session.user.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Get summary stats
    const summary = await prisma.trackerEntry.aggregate({
      where: whereClause,
      _sum: {
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
        coursesCompleted: true,
        certificationsEarned: true,
        projectsCompleted: true,
        contestsParticipated: true,
        applicationsSubmitted: true,
        points: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        productivityRating: true,
        energyLevel: true,
      },
    });

    // Get previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime() - 1);

    const previousSummary = await prisma.trackerEntry.aggregate({
      where: {
        userId: session.user.id,
        date: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
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
    });

    // Calculate percentage changes
    const calculateChange = (current: number | null, previous: number | null) => {
      const curr = current || 0;
      const prev = previous || 0;
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const changes = {
      problemsSolved: calculateChange(summary._sum.problemsSolved, previousSummary._sum.problemsSolved),
      commits: calculateChange(summary._sum.commits, previousSummary._sum.commits),
      pullRequests: calculateChange(summary._sum.pullRequests, previousSummary._sum.pullRequests),
      timeSpent: calculateChange(summary._sum.timeSpent, previousSummary._sum.timeSpent),
      entries: calculateChange(summary._count.id, previousSummary._count.id),
    };

    // Get active days count
    const activeDays = await prisma.trackerEntry.groupBy({
      by: ["date"],
      where: whereClause,
    });

    // Get top platforms
    const topPlatforms = await prisma.trackerEntry.groupBy({
      by: ["platformId"],
      where: {
        ...whereClause,
        platformId: { not: null },
      },
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
      orderBy: {
        _sum: {
          timeSpent: "desc",
        },
      },
      take: 5,
    });

    // Get top categories
    const topCategories = await prisma.trackerEntry.groupBy({
      by: ["category"],
      where: {
        ...whereClause,
        category: { not: null },
      },
      _sum: {
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
      orderBy: {
        _sum: {
          timeSpent: "desc",
        },
      },
      take: 5,
    });

    // Get user streaks
    const userDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { currentStreak: true, longestStreak: true },
    });

    // Get real platform names
    const platformIds = topPlatforms.map((p: any) => p.platformId).filter(Boolean) as string[];
    const platforms = await prisma.platform.findMany({
      where: { id: { in: platformIds } },
      select: { id: true, name: true },
    });
    const platformMap = new Map(platforms.map((p: any) => [p.id, p.name]));

    // Format response to match TrackerSummary interface
    const responseData = {
      dateRange: {
        start: startDate,
        end: endDate,
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      totals: {
        problems: summary._sum.problemsSolved || 0,
        commits: summary._sum.commits || 0,
        pullRequests: summary._sum.pullRequests || 0,
        time: summary._sum.timeSpent || 0,
        points: summary._sum.points || 0,
        entries: summary._count.id || 0,
      },
      averages: {
        problemsPerDay: 0, // Calculated below
        commitsPerDay: 0,
        timePerDay: 0,
        pointsPerDay: 0,
      },
      streaks: {
        current: userDb?.currentStreak || 0,
        longest: userDb?.longestStreak || 0,
      },
      changes,
      byPlatform: topPlatforms.map((p: any) => ({
        platformId: p.platformId,
        platformName: p.platformId ? platformMap.get(p.platformId) || 'Unknown' : 'Unknown',
        entries: 0,
        problems: p._sum.problemsSolved || 0,
        commits: p._sum.commits || 0,
        time: p._sum.timeSpent || 0,
      })),
      byCategory: topCategories.map((c: any) => ({
        category: c.category,
        entries: 0,
        problems: c._sum.problemsSolved || 0,
        time: c._sum.timeSpent || 0,
      })),
      activeDays: activeDays.length,
    };

    // Calculate averages
    const days = Math.max(1, responseData.dateRange.days);
    responseData.averages.problemsPerDay = Math.round((responseData.totals.problems / days) * 10) / 10;
    responseData.averages.commitsPerDay = Math.round((responseData.totals.commits / days) * 10) / 10;
    responseData.averages.timePerDay = Math.round(responseData.totals.time / days);
    responseData.averages.pointsPerDay = Math.round(responseData.totals.points / days);

    return apiResponse.success(responseData);
  } catch (error) {
    console.error("Error fetching tracker summary:", error);
    return apiResponse.internalError("Failed to fetch summary");
  }
}
