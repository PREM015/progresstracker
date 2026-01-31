// src/app/api/admin/achievements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { PlatformCategory } from "@prisma/client";

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

// GET /api/admin/achievements - List all achievements
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized achievements access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const tier = searchParams.get("tier");
    const isActive = searchParams.get("isActive");
    const isHidden = searchParams.get("isHidden");

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(category && { category: category as PlatformCategory }),
      ...(tier && { tier }),
      ...(isActive !== null && isActive !== undefined && {
        isActive: isActive === "true",
      }),
      ...(isHidden !== null && isHidden !== undefined && {
        isHidden: isHidden === "true",
      }),
    };

    const [achievements, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { users: true },
          },
        },
      }),
      prisma.achievement.count({ where }),
    ]);

    logger.info("Achievements fetched", {
      admin: admin.email,
      total,
      page,
      filters: { category, tier, isActive, isHidden },
    });

    return NextResponse.json({
      achievements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching achievements", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/achievements - Create new achievement
export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized achievement creation attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      slug,
      title,
      description,
      category,
      tier = "bronze",
      icon,
      color,
      badgeImage,
      points = 0,
      xpReward = 0,
      rarity = "common",
      requirement,
      requirementText,
      thresholds,
      isHidden = false,
      isSecret = false,
      isActive = true,
      sortOrder = 0,
    } = body;

    // Validation
    if (!slug || !title || !description || !category) {
      return NextResponse.json(
        { error: "Slug, title, description, and category are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.achievement.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Achievement with this slug already exists" },
        { status: 409 }
      );
    }

    // Validate category
    const validCategories = Object.values(PlatformCategory);
    if (!validCategories.includes(category as PlatformCategory)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const achievement = await prisma.achievement.create({
      data: {
        slug,
        title,
        description,
        category,
        tier,
        icon,
        color,
        badgeImage,
        points,
        xpReward,
        rarity,
        requirement,
        requirementText,
        thresholds,
        isHidden,
        isSecret,
        isActive,
        sortOrder,
      },
    });

    logger.info("Achievement created", {
      admin: admin.email,
      achievementSlug: slug,
      achievementId: achievement.id,
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    logger.error("Error creating achievement", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}