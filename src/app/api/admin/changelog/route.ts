// src/app/api/admin/changelog/route.ts
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

// GET /api/admin/changelog - List all changelog entries
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized changelog access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const isPublished = searchParams.get("isPublished");

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { version: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(type && { type }),
      ...(isPublished !== null && isPublished !== undefined && {
        isPublished: isPublished === "true",
      }),
    };

    const [entries, total] = await Promise.all([
      prisma.changelogEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.changelogEntry.count({ where }),
    ]);

    logger.info("Changelog entries fetched", {
      admin: admin.email,
      total,
      page,
      filters: { type, isPublished },
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
    logger.error("Error fetching changelog entries", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/changelog - Create new changelog entry
export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      logger.warn("Unauthorized changelog creation attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      version,
      title,
      description,
      type,
      changes,
      isPublished = false,
    } = body;

    // Validation
    if (!version || !title || !description || !type || !changes) {
      return NextResponse.json(
        { error: "Version, title, description, type, and changes are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["feature", "improvement", "bugfix", "security"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate changes structure
    if (!Array.isArray(changes)) {
      return NextResponse.json(
        { error: "Changes must be an array" },
        { status: 400 }
      );
    }

    // Check if version already exists
    const existing = await prisma.changelogEntry.findFirst({
      where: { version },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Changelog entry with this version already exists" },
        { status: 409 }
      );
    }

    const entry = await prisma.changelogEntry.create({
      data: {
        version,
        title,
        description,
        type,
        changes,
        isPublished,
        ...(isPublished && {
          publishedAt: new Date(),
        }),
      },
    });

    logger.info("Changelog entry created", {
      admin: admin.email,
      version,
      entryId: entry.id,
      isPublished,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error("Error creating changelog entry", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}