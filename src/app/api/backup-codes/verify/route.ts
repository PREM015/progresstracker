// src/app/api/backup-codes/verify/route.ts
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

// POST /api/backup-codes/verify - Verify a backup code
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // Get all unused backup codes for user
    const backupCodes = await prisma.backupCode.findMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    if (backupCodes.length === 0) {
      logger.warn("No backup codes available", { userId: user.id });
      return NextResponse.json(
        { error: "No backup codes available" },
        { status: 400 }
      );
    }

    // Try to match the code
    let matchedCode = null;

    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(code, backupCode.code);
      if (isMatch) {
        matchedCode = backupCode;
        break;
      }
    }

    if (!matchedCode) {
      logger.warn("Invalid backup code attempt", { userId: user.id });
      return NextResponse.json(
        { error: "Invalid backup code" },
        { status: 400 }
      );
    }

    // Mark code as used
    await prisma.backupCode.update({
      where: { id: matchedCode.id },
      data: {
        usedAt: new Date(),
        usedIpAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      },
    });

    // Get remaining codes count
    const remainingCount = await prisma.backupCode.count({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    logger.info("Backup code verified", {
      userId: user.id,
      remainingCodes: remainingCount,
    });

    return NextResponse.json({
      success: true,
      remainingCodes: remainingCount,
      message:
        remainingCount === 0
          ? "This was your last backup code. Please generate new ones."
          : `You have ${remainingCount} backup codes remaining.`,
    });
  } catch (error) {
    logger.error("Error verifying backup code", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}