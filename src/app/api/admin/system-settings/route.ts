// src/app/api/admin/system-settings/route.ts
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

// GET /api/admin/system-settings - List all system settings
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isPublic = searchParams.get("isPublic");

    const where = {
      ...(category && { category }),
      ...(isPublic !== null && isPublic !== undefined && {
        isPublic: isPublic === "true",
      }),
    };

    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      const cat = setting.category || "uncategorized";
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(setting);
      return acc;
    }, {} as Record<string, typeof settings>);

    logger.info("System settings fetched", {
      admin: admin.email,
      total: settings.length,
    });

    return NextResponse.json({
      settings,
      grouped,
      total: settings.length,
    });
  } catch (error) {
    logger.error("Error fetching system settings", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/system-settings - Create new setting
export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { key, value, description, category, isPublic = false } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existing = await prisma.systemSettings.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Setting with this key already exists" },
        { status: 409 }
      );
    }

    const setting = await prisma.systemSettings.create({
      data: {
        key,
        value,
        description,
        category,
        isPublic,
        updatedBy: admin.id,
      },
    });

    logger.info("System setting created", {
      admin: admin.email,
      key,
    });

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    logger.error("Error creating system setting", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}