// src/app/api/custom-platforms/[id]/route.ts
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

// GET /api/custom-platforms/[id] - Get single custom platform
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const platform = await prisma.customPlatform.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        _count: {
          select: { trackerEntries: true },
        },
      },
    });

    if (!platform) {
      return NextResponse.json(
        { error: "Custom platform not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(platform);
  } catch (error) {
    logger.error("Error fetching custom platform", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/custom-platforms/[id] - Update custom platform
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      isActive,
    } = body;

    const platform = await prisma.customPlatform.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!platform) {
      return NextResponse.json(
        { error: "Custom platform not found" },
        { status: 404 }
      );
    }

    // Validate category if provided
    if (category) {
      const validCategories = Object.values(PlatformCategory);
      if (!validCategories.includes(category as PlatformCategory)) {
        return NextResponse.json(
          { error: `Category must be one of: ${validCategories.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Check name uniqueness if changing
    if (name && name.trim() !== platform.name) {
      const existing = await prisma.customPlatform.findFirst({
        where: {
          userId: user.id,
          name: name.trim(),
          id: { not: params.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "You already have a custom platform with this name" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.customPlatform.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(displayName !== undefined && { displayName: displayName?.trim() }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category: category as PlatformCategory }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(website !== undefined && { website }),
        ...(trackingFields !== undefined && { trackingFields }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    logger.info("Custom platform updated", {
      userId: user.id,
      platformId: params.id,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating custom platform", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-platforms/[id] - Delete custom platform
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const platform = await prisma.customPlatform.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        _count: {
          select: { trackerEntries: true },
        },
      },
    });

    if (!platform) {
      return NextResponse.json(
        { error: "Custom platform not found" },
        { status: 404 }
      );
    }

    // Check if platform has tracker entries
    if (platform._count.trackerEntries > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete platform with ${platform._count.trackerEntries} tracker entries. Consider deactivating instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.customPlatform.delete({
      where: { id: params.id },
    });

    logger.info("Custom platform deleted", {
      userId: user.id,
      platformId: params.id,
      platformName: platform.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting custom platform", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}