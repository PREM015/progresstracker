// src/app/api/admin/maintenance/[id]/route.ts
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

// GET /api/admin/maintenance/[id] - Get single maintenance window
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

    const window = await prisma.maintenanceWindow.findUnique({
      where: { id: params.id },
    });

    if (!window) {
      return NextResponse.json(
        { error: "Maintenance window not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(window);
  } catch (error) {
    logger.error("Error fetching maintenance window", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/maintenance/[id] - Update maintenance window
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
    const { title, message, startTime, endTime, isActive, affectedServices } = body;

    const window = await prisma.maintenanceWindow.findUnique({
      where: { id: params.id },
    });

    if (!window) {
      return NextResponse.json(
        { error: "Maintenance window not found" },
        { status: 404 }
      );
    }

    // Validate dates if provided
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : window.startTime;
      const end = endTime ? new Date(endTime) : window.endTime;

      if (
        (startTime && isNaN(start.getTime())) ||
        (endTime && isNaN(end.getTime()))
      ) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }

      if (end <= start) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.maintenanceWindow.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(isActive !== undefined && { isActive }),
        ...(affectedServices !== undefined && { affectedServices }),
      },
    });

    logger.info("Maintenance window updated", {
      admin: admin.email,
      windowId: params.id,
      changes: Object.keys(body),
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating maintenance window", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/maintenance/[id] - Delete maintenance window
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

    const window = await prisma.maintenanceWindow.findUnique({
      where: { id: params.id },
    });

    if (!window) {
      return NextResponse.json(
        { error: "Maintenance window not found" },
        { status: 404 }
      );
    }

    await prisma.maintenanceWindow.delete({
      where: { id: params.id },
    });

    logger.info("Maintenance window deleted", {
      admin: admin.email,
      windowId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting maintenance window", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}