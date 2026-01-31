// src/app/api/custom-platforms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { PlatformCategory } from "@prisma/client";

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

// GET /api/custom-platforms - List user's custom platforms
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized custom platforms access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    const where = {
      userId: user.id,
      ...(category && { category: category as PlatformCategory }),
      ...(isActive !== null && isActive !== undefined && {
        isActive: isActive === "true",
      }),
    };

    const platforms = await prisma.customPlatform.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { trackerEntries: true },
        },
      },
    });

    logger.info("Custom platforms fetched", {
      userId: user.id,
      total: platforms.length,
    });

    return NextResponse.json({
      platforms,
      total: platforms.length,
    });
  } catch (error) {
    logger.error("Error fetching custom platforms", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/custom-platforms - Create new custom platform
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
    const {
      name,
      displayName,
      description,
      category,
      icon,
      color,
      website,
      trackingFields,
      isActive = true,
    } = body;

    // Validation
    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = Object.values(PlatformCategory);
    if (!validCategories.includes(category as PlatformCategory)) {
      return NextResponse.json(
        { error: `Category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if user already has a custom platform with this name
    const existing = await prisma.customPlatform.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have a custom platform with this name" },
        { status: 409 }
      );
    }

    const platform = await prisma.customPlatform.create({
      data: {
        userId: user.id,
        name: name.trim(),
        displayName: displayName?.trim(),
        description,
        category: category as PlatformCategory,
        icon,
        color,
        website,
        trackingFields,
        isActive,
      },
    });

    logger.info("Custom platform created", {
      userId: user.id,
      platformId: platform.id,
      name: platform.name,
      category,
    });

    return NextResponse.json(platform, { status: 201 });
  } catch (error) {
    logger.error("Error creating custom platform", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}