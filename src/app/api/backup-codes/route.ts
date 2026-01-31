// src/app/api/backup-codes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

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

// GET /api/backup-codes - List user's backup codes (without showing actual codes)
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      logger.warn("Unauthorized backup codes access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const codes = await prisma.backupCode.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        usedAt: true,
        usedIpAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const total = codes.length;
    const used = codes.filter((c) => c.usedAt).length;
    const available = total - used;

    logger.info("Backup codes fetched", {
      userId: user.id,
      total,
      used,
      available,
    });

    return NextResponse.json({
      codes,
      stats: {
        total,
        used,
        available,
      },
    });
  } catch (error) {
    logger.error("Error fetching backup codes", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}