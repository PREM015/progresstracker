// src/app/api/admin/system-settings/[key]/route.ts
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

// GET /api/admin/system-settings/[key] - Get single setting
export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { key: params.key },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(setting);
  } catch (error) {
    logger.error("Error fetching system setting", { key: params.key }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/system-settings/[key] - Update setting
export async function PATCH(
  req: NextRequest,
  { params }: { params: { key: string } }
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
    const { value, description, category, isPublic } = body;

    const setting = await prisma.systemSettings.findUnique({
      where: { key: params.key },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.systemSettings.update({
      where: { key: params.key },
      data: {
        ...(value !== undefined && { value }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(isPublic !== undefined && { isPublic }),
        updatedBy: admin.id,
      },
    });

    logger.info("System setting updated", {
      admin: admin.email,
      key: params.key,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating system setting", { key: params.key }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/system-settings/[key] - Delete setting
export async function DELETE(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const admin = await checkAdminAuth(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { key: params.key },
    });

    if (!setting) {
      return NextResponse.json(
        { error: "Setting not found" },
        { status: 404 }
      );
    }

    await prisma.systemSettings.delete({
      where: { key: params.key },
    });

    logger.info("System setting deleted", {
      admin: admin.email,
      key: params.key,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting system setting", { key: params.key }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}