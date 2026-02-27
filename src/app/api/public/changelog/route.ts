// src/app/api/public/changelog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/public/changelog - List published changelog entries (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");

    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
      publishedAt: { lte: new Date() },
      ...(type && { type }),
    };

    const [entries, total] = await Promise.all([
      prisma.changelogEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: "desc" },
      }),
      prisma.changelogEntry.count({ where }),
    ]);

    logger.info("Public changelog entries fetched", {
      total,
      page,
      type,
    });

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching public changelog entries", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}