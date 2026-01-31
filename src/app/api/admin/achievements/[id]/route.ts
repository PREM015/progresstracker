// src/app/api/admin/achievements/[id]/route.ts
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

// GET /api/admin/achievements/[id] - Get single achievement
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          take: 10,
          orderBy: { unlockedAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(achievement);
  } catch (error) {
    logger.error("Error fetching achievement", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/achievements/[id] - Update achievement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
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
    } = body;

    const achievement = await prisma.achievement.findUnique({
      where: { id: params.id },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 }
      );
    }

    // Validate category if provided
    if (category) {
      const validCategories = Object.values(PlatformCategory);
      if (!validCategories.includes(category as PlatformCategory)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.achievement.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(tier !== undefined && { tier }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(badgeImage !== undefined && { badgeImage }),
        ...(points !== undefined && { points }),
        ...(xpReward !== undefined && { xpReward }),
        ...(rarity !== undefined && { rarity }),
        ...(requirement !== undefined && { requirement }),
        ...(requirementText !== undefined && { requirementText }),
        ...(thresholds !== undefined && { thresholds }),
        ...(isHidden !== undefined && { isHidden }),
        ...(isSecret !== undefined && { isSecret }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    logger.info("Achievement updated", {
      admin: admin.email,
      achievementId: params.id,
      achievementSlug: achievement.slug,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating achievement", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/achievements/[id] - Delete achievement
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const achievement = await prisma.achievement.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: "Achievement not found" },
        { status: 404 }
      );
    }

    // Check if achievement has users
    if (achievement._count.users > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete achievement with ${achievement._count.users} users. Consider deactivating instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.achievement.delete({
      where: { id: params.id },
    });

    logger.info("Achievement deleted", {
      admin: admin.email,
      achievementId: params.id,
      achievementSlug: achievement.slug,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting achievement", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}