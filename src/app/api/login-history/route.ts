/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/login-history/route.ts
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

// GET /api/login-history - Get user's login history
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized login history access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const success = searchParams.get("success");

    const skip = (page - 1) * limit;

    const where = {
      userId: user.id,
      ...(success !== null && success !== undefined && {
        success: success === "true",
      }),
    };

    const [attempts, total] = await Promise.all([
      prisma.loginAttempt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          success: true,
          failureReason: true,
          ipAddress: true,
          userAgent: true,
          country: true,
          twoFactorRequired: true,
          twoFactorPassed: true,
          createdAt: true,
        },
      }),
      prisma.loginAttempt.count({ where }),
    ]);

    // Get success/failure stats
    const stats = await prisma.loginAttempt.groupBy({
      by: ["success"],
      where: { userId: user.id },
      _count: {
        success: true,
      },
    });

    const successCount = stats.find((s) => s.success)?._count.success || 0;
    const failureCount = stats.find((s) => !s.success)?._count.success || 0;

    logger.info("Login history fetched", {
      userId: user.id,
      total,
      page,
    });

    return NextResponse.json({
      attempts,
      stats: {
        total,
        successful: successCount,
        failed: failureCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching login history", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}