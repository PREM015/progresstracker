// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";

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

// GET /api/reports/[id] - Get single report
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

    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    logger.error("Error fetching report", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete report
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

    const report = await prisma.report.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    await prisma.report.delete({
      where: { id: params.id },
    });

    logger.info("Report deleted", {
      userId: user.id,
      reportId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting report", { id: params.id }, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}