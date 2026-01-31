// src/app/api/admin/audit-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AuditAction } from "@prisma/client";

async function checkAdminAuth(req: NextRequest) {
  const session = req.headers.get("x-admin-session");
  if (!session) {
    return null;
  }
  
  const user = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true, email: true, isAdmin: true }
  });
  
  return user;
}

// GET /api/admin/audit-logs - List all audit logs
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized audit logs access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const category = searchParams.get("category");
    const entityType = searchParams.get("entityType");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const ipAddress = searchParams.get("ipAddress");

    const skip = (page - 1) * limit;

    const where = {
      ...(userId && { userId }),
      ...(action && { action: action as AuditAction }),
      ...(category && { category }),
      ...(entityType && { entityType }),
      ...(status && { status }),
      ...(ipAddress && { ipAddress }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    logger.info("Audit logs fetched", {
      admin: admin.email,
      total,
      page,
      filters: { userId, action, category, entityType, status },
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching audit logs", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/admin/audit-logs/stats - Get audit log statistics
export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where = {
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    // Get counts by action
    const actionCounts = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
    });

    // Get counts by category
    const categoryCounts = await prisma.auditLog.groupBy({
      by: ["category"],
      where: {
        ...where,
        category: { not: null },
      },
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: "desc",
        },
      },
    });

    // Get counts by status
    const statusCounts = await prisma.auditLog.groupBy({
      by: ["status"],
      where,
      _count: {
        status: true,
      },
    });

    // Get top users by activity
    const topUsers = await prisma.auditLog.groupBy({
      by: ["userId"],
      where: {
        ...where,
        userId: { not: null },
      },
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
      take: 10,
    });

    // Get user details for top users
    const userIds = topUsers
      .map((u) => u.userId)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
      },
    });

    const topUsersWithDetails = topUsers.map((item) => ({
      ...item,
      user: users.find((u) => u.id === item.userId),
    }));

    // Total logs
    const total = await prisma.auditLog.count({ where });

    logger.info("Audit log statistics fetched", {
      admin: admin.email,
      total,
      dateRange: { dateFrom, dateTo },
    });

    return NextResponse.json({
      total,
      byAction: actionCounts,
      byCategory: categoryCounts,
      byStatus: statusCounts,
      topUsers: topUsersWithDetails,
    });
  } catch (error) {
    logger.error("Error fetching audit log statistics", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}