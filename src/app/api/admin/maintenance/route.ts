// src/app/api/admin/maintenance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

// GET /api/admin/maintenance - List all maintenance windows
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized maintenance access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const upcoming = searchParams.get("upcoming");

    const now = new Date();

    const where = {
      ...(isActive !== null && isActive !== undefined && {
        isActive: isActive === "true",
      }),
      ...(upcoming === "true" && {
        startTime: { gte: now },
      }),
    };

    const windows = await prisma.maintenanceWindow.findMany({
      where,
      orderBy: { startTime: "desc" },
    });

    logger.info("Maintenance windows fetched", {
      admin: admin.email,
      total: windows.length,
      filters: { isActive, upcoming },
    });

    return NextResponse.json({
      windows,
      total: windows.length,
    });
  } catch (error) {
    logger.error("Error fetching maintenance windows", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/maintenance - Create new maintenance window
export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized maintenance creation attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      message,
      startTime,
      endTime,
      isActive = false,
      affectedServices = [],
    } = body;

    // Validation
    if (!title || !message || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, message, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const window = await prisma.maintenanceWindow.create({
      data: {
        title,
        message,
        startTime: start,
        endTime: end,
        isActive,
        affectedServices,
        createdBy: admin.id,
      },
    });

    logger.info("Maintenance window created", {
      admin: admin.email,
      windowId: window.id,
      startTime: start,
      endTime: end,
    });

    return NextResponse.json(window, { status: 201 });
  } catch (error) {
    logger.error("Error creating maintenance window", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}