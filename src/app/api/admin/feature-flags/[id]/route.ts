// src/app/api/admin/feature-flags/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { SubscriptionTier } from "@prisma/client";

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

// GET /api/admin/feature-flags/[id] - Get single feature flag
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

    const flag = await prisma.featureFlag.findUnique({
      where: { id: params.id },
    });

    if (!flag) {
      return NextResponse.json(
        { error: "Feature flag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(flag);
  } catch (error) {
    logger.error("Error fetching feature flag", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/feature-flags/[id] - Update feature flag
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
      name,
      description,
      isEnabled,
      enabledForAll,
      enabledUserIds,
      enabledTiers,
      enabledPercentage,
      metadata,
    } = body;

    const flag = await prisma.featureFlag.findUnique({
      where: { id: params.id },
    });

    if (!flag) {
      return NextResponse.json(
        { error: "Feature flag not found" },
        { status: 404 }
      );
    }

    // Validate tiers if provided
    if (enabledTiers) {
      const validTiers = Object.values(SubscriptionTier);
      const invalidTiers = enabledTiers.filter(
        (tier: string) => !validTiers.includes(tier as SubscriptionTier)
      );

      if (invalidTiers.length > 0) {
        return NextResponse.json(
          { error: `Invalid tiers: ${invalidTiers.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.featureFlag.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(enabledForAll !== undefined && { enabledForAll }),
        ...(enabledUserIds !== undefined && { enabledUserIds }),
        ...(enabledTiers !== undefined && { enabledTiers }),
        ...(enabledPercentage !== undefined && {
          enabledPercentage: Math.max(0, Math.min(100, enabledPercentage)),
        }),
        ...(metadata !== undefined && { metadata }),
      },
    });

    logger.info("Feature flag updated", {
      admin: admin.email,
      flagKey: flag.key,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating feature flag", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/feature-flags/[id] - Delete feature flag
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

    const flag = await prisma.featureFlag.findUnique({
      where: { id: params.id },
    });

    if (!flag) {
      return NextResponse.json(
        { error: "Feature flag not found" },
        { status: 404 }
      );
    }

    await prisma.featureFlag.delete({
      where: { id: params.id },
    });

    logger.info("Feature flag deleted", {
      admin: admin.email,
      flagKey: flag.key,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting feature flag", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}