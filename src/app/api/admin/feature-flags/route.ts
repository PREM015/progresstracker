// src/app/api/admin/feature-flags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { SubscriptionTier } from "@prisma/client";

// Middleware to check admin authentication
async function checkAdminAuth(req: NextRequest) {
  // TODO: Implement your admin auth check
  // This is a placeholder - replace with your actual auth logic
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

// GET /api/admin/feature-flags - List all feature flags
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const enabled = searchParams.get("enabled");

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { key: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(enabled !== null && enabled !== undefined && {
        isEnabled: enabled === "true",
      }),
    };

    const [flags, total] = await Promise.all([
      prisma.featureFlag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.featureFlag.count({ where }),
    ]);

    logger.info("Feature flags fetched", {
      admin: admin.email,
      total,
      page,
    });

    return NextResponse.json({
      flags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching feature flags", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/feature-flags - Create new feature flag
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
    const {
      key,
      name,
      description,
      isEnabled = false,
      enabledForAll = false,
      enabledUserIds = [],
      enabledTiers = [],
      enabledPercentage = 0,
      metadata = {},
    } = body;

    // Validation
    if (!key || !name) {
      return NextResponse.json(
        { error: "Key and name are required" },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existing = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Feature flag with this key already exists" },
        { status: 409 }
      );
    }

    // Validate tiers
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

    const flag = await prisma.featureFlag.create({
      data: {
        key,
        name,
        description,
        isEnabled,
        enabledForAll,
        enabledUserIds,
        enabledTiers,
        enabledPercentage: Math.max(0, Math.min(100, enabledPercentage)),
        metadata,
      },
    });

    logger.info("Feature flag created", {
      admin: admin.email,
      flagKey: key,
    });

    return NextResponse.json(flag, { status: 201 });
  } catch (error) {
    logger.error("Error creating feature flag", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}