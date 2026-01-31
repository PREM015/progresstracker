// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";

async function getUserFromSession(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });

  return user;
}

// GET /api/reports - List user's reports
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized reports access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const where = {
      userId: user.id,
      ...(type && { type }),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          summary: true,
          periodStart: true,
          periodEnd: true,
          status: true,
          sentAt: true,
          pdfUrl: true,
          createdAt: true,
        },
      }),
      prisma.report.count({ where }),
    ]);

    logger.info("Reports fetched", {
      userId: user.id,
      total,
      type,
    });

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching reports", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/reports - Generate new report
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, periodStart, periodEnd } = body;

    // Validation
    if (!type || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Type, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }

    const validTypes = ["weekly", "monthly", "yearly", "custom"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Get user stats for the period
    const stats = await prisma.dailyStats.findMany({
      where: {
        userId: user.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: "asc" },
    });

    // Calculate totals
    const totalProblems = stats.reduce((sum, s) => sum + s.totalProblems, 0);
    const totalCommits = stats.reduce((sum, s) => sum + s.totalCommits, 0);
    const totalPullRequests = stats.reduce((sum, s) => sum + s.totalPullRequests, 0);
    const totalTimeSpent = stats.reduce((sum, s) => sum + s.totalTimeSpent, 0);
    const totalPoints = stats.reduce((sum, s) => sum + s.totalPoints, 0);
    const daysActive = stats.filter((s) => s.hadActivity).length;

    // Generate title
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;

    // Generate summary
    const summary = `Report for ${start.toLocaleDateString()} - ${end.toLocaleDateString()}. 
Total problems solved: ${totalProblems}, Commits: ${totalCommits}, 
Days active: ${daysActive}, Points earned: ${totalPoints}`;

    // Create report data
    const reportData = {
      stats: {
        totalProblems,
        totalCommits,
        totalPullRequests,
        totalTimeSpent,
        totalPoints,
        daysActive,
      },
      dailyStats: stats,
      charts: [],
      comparisons: {},
    };

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        type,
        periodStart: start,
        periodEnd: end,
        title,
        summary,
        data: reportData,
        status: "generated",
      },
    });

    logger.info("Report generated", {
      userId: user.id,
      reportId: report.id,
      type,
      periodStart: start,
      periodEnd: end,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    logger.error("Error generating report", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}