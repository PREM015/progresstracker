// src/app/api/backup-codes/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

function generateBackupCode(): string {
  // Generate 8-character alphanumeric code
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// POST /api/backup-codes/generate - Generate new backup codes
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
    const { count = 10, replaceExisting = false } = body;

    // Validate count
    if (count < 1 || count > 20) {
      return NextResponse.json(
        { error: "Count must be between 1 and 20" },
        { status: 400 }
      );
    }

    // Check if user has 2FA enabled
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorAuth?.isEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication must be enabled to generate backup codes" },
        { status: 400 }
      );
    }

    // Delete existing codes if replaceExisting is true
    if (replaceExisting) {
      await prisma.backupCode.deleteMany({
        where: { userId: user.id },
      });
    }

    // Generate new codes
    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateBackupCode();
      const hashedCode = await bcrypt.hash(code, 10);
      codes.push(code);
      hashedCodes.push(hashedCode);
    }

    // Save hashed codes to database
    await prisma.backupCode.createMany({
      data: hashedCodes.map((code) => ({
        userId: user.id,
        code,
      })),
    });

    logger.info("Backup codes generated", {
      userId: user.id,
      count,
      replaceExisting,
    });

    // Return plain text codes (only time they're shown)
    return NextResponse.json({
      codes,
      message: "Save these codes in a safe place. They will not be shown again.",
    });
  } catch (error) {
    logger.error("Error generating backup codes", {}, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}