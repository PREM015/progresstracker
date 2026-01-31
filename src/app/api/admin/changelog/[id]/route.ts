// src/app/api/admin/changelog/[id]/route.ts
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

// GET /api/admin/changelog/[id] - Get single changelog entry
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

    const entry = await prisma.changelogEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Changelog entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    logger.error("Error fetching changelog entry", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/changelog/[id] - Update changelog entry
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
    const { version, title, description, type, changes, isPublished } = body;

    const entry = await prisma.changelogEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Changelog entry not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type) {
      const validTypes = ["feature", "improvement", "bugfix", "security"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate changes if provided
    if (changes && !Array.isArray(changes)) {
      return NextResponse.json(
        { error: "Changes must be an array" },
        { status: 400 }
      );
    }

    // Check version uniqueness if changing
    if (version && version !== entry.version) {
      const existing = await prisma.changelogEntry.findFirst({
        where: {
          version,
          id: { not: params.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Changelog entry with this version already exists" },
          { status: 409 }
        );
      }
    }

    // Auto-set publishedAt when publishing
    const shouldSetPublishedAt =
      isPublished === true &&
      entry.isPublished !== true &&
      !entry.publishedAt;

    const updated = await prisma.changelogEntry.update({
      where: { id: params.id },
      data: {
        ...(version !== undefined && { version }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(changes !== undefined && { changes }),
        ...(isPublished !== undefined && { isPublished }),
        ...(shouldSetPublishedAt && { publishedAt: new Date() }),
      },
    });

    logger.info("Changelog entry updated", {
      admin: admin.email,
      entryId: params.id,
      version: entry.version,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating changelog entry", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/changelog/[id] - Delete changelog entry
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

    const entry = await prisma.changelogEntry.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Changelog entry not found" },
        { status: 404 }
      );
    }

    await prisma.changelogEntry.delete({
      where: { id: params.id },
    });

    logger.info("Changelog entry deleted", {
      admin: admin.email,
      entryId: params.id,
      version: entry.version,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting changelog entry", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}