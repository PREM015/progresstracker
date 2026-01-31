// src/app/api/tracker/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { PlatformCategory } from "@prisma/client";


const updateEntrySchema = z.object({
  platformId: z.string().optional(),
  customPlatformId: z.string().optional(),
  date: z.string().datetime().optional(),

  // Classification
  category: z.nativeEnum(PlatformCategory).optional(),
  subcategory: z.string().optional(),

  // Primary Metrics
  problemsSolved: z.number().int().min(0).optional(),
  problemsAttempted: z.number().int().min(0).optional(),
  easyProblems: z.number().int().min(0).optional(),
  mediumProblems: z.number().int().min(0).optional(),
  hardProblems: z.number().int().min(0).optional(),

  // Code & Development
  commits: z.number().int().min(0).optional(),
  pullRequests: z.number().int().min(0).optional(),
  pullRequestsMerged: z.number().int().min(0).optional(),
  issuesOpened: z.number().int().min(0).optional(),
  issuesClosed: z.number().int().min(0).optional(),
  codeReviews: z.number().int().min(0).optional(),
  linesOfCode: z.number().int().min(0).optional(),

  // Projects
  projectsStarted: z.number().int().min(0).optional(),
  projectsCompleted: z.number().int().min(0).optional(),

  // Learning
  coursesStarted: z.number().int().min(0).optional(),
  coursesCompleted: z.number().int().min(0).optional(),
  lessonsCompleted: z.number().int().min(0).optional(),
  modulesCompleted: z.number().int().min(0).optional(),
  certificationsEarned: z.number().int().min(0).optional(),

  // Time Tracking
  timeSpent: z.number().int().min(0).optional(),
  focusTime: z.number().int().min(0).optional(),

  // Quality Metrics
  averageDifficulty: z.number().min(0).max(10).optional(),
  accuracyRate: z.number().min(0).max(100).optional(),
  completionRate: z.number().min(0).max(100).optional(),

  // Platform-specific
  rating: z.number().int().optional(),
  ratingChange: z.number().int().optional(),
  rank: z.number().int().optional(),
  rankChange: z.number().int().optional(),
  points: z.number().int().optional(),
  pointsEarned: z.number().int().optional(),
  streak: z.number().int().min(0).optional(),
  xpEarned: z.number().int().min(0).optional(),

  // Mood & Notes
  mood: z.string().optional(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  productivityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),

  // Tags & Categories
  tags: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),

  // Custom Fields
  customFields: z.record(z.unknown()).optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Helper: build Prisma update data safely
 * - removes platformId/customPlatformId from spread
 * - updates relations using connect/disconnect
 */
function buildTrackerEntryUpdateData<T extends { platformId?: string; customPlatformId?: string }>(
  validated: T
) {
  const { platformId, customPlatformId, ...rest } = validated;

  const data: Record<string, unknown> = {
    ...rest,
    updatedAt: new Date(),
  };

  // ✅ Relation update for platform
  if (platformId !== undefined) {
    data.platform = platformId
      ? { connect: { id: platformId } }
      : { disconnect: true };
  }

  // ✅ Relation update for customPlatform
  if (customPlatformId !== undefined) {
    data.customPlatform = customPlatformId
      ? { connect: { id: customPlatformId } }
      : { disconnect: true };
  }

  return data;
}

/**
 * ✅ GET – Get single tracker entry
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn("Unauthorized tracker entry access");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.debug("Fetching tracker entry", {
      userId: session.user.id,
      entryId: id,
    });

    const entry = await prisma.trackerEntry.findUnique({
      where: { id },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        customPlatform: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!entry || entry.userId !== session.user.id) {
      logger.warn("Tracker entry not found", {
        userId: session.user.id,
        entryId: id,
      });
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    logger.info("Tracker entry fetched", {
      userId: session.user.id,
      entryId: id,
    });

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error("Error fetching tracker entry", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get entry" },
      { status: 500 }
    );
  }
}

/**
 * ✅ PUT – Update tracker entry
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateEntrySchema.parse(body);

    logger.debug("Updating tracker entry", {
      userId: session.user.id,
      entryId: id,
      fields: Object.keys(validated),
    });

    const existing = await prisma.trackerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      logger.warn("Tracker entry not found for update", {
        userId: session.user.id,
        entryId: id,
      });
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updated = await prisma.trackerEntry.update({
      where: { id },
      data: buildTrackerEntryUpdateData(validated),
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        customPlatform: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    logger.info("Tracker entry updated", {
      userId: session.user.id,
      entryId: id,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Validation error updating tracker entry", {
        errors: error.errors,
      });
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error updating tracker entry", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update entry" },
      { status: 500 }
    );
  }
}

/**
 * ✅ PATCH – Partial update tracker entry
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateEntrySchema.partial().parse(body);

    logger.debug("Patching tracker entry", {
      userId: session.user.id,
      entryId: id,
      fields: Object.keys(validated),
    });

    const existing = await prisma.trackerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updated = await prisma.trackerEntry.update({
      where: { id },
      data: buildTrackerEntryUpdateData(validated),
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        customPlatform: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    logger.info("Tracker entry patched", {
      userId: session.user.id,
      entryId: id,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error patching tracker entry", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update entry" },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE – Delete tracker entry
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Deleting tracker entry", {
      userId: session.user.id,
      entryId: id,
    });

    const existing = await prisma.trackerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      logger.warn("Tracker entry not found for deletion", {
        userId: session.user.id,
        entryId: id,
      });
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.trackerEntry.delete({
      where: { id },
    });

    logger.info("Tracker entry deleted", {
      userId: session.user.id,
      entryId: id,
    });

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting tracker entry", {}, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete entry" },
      { status: 500 }
    );
  }
}
