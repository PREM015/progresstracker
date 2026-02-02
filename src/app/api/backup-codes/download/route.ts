// src/app/api/backup-codes/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { auditLogService } from "@/services/auditLogService";
import TwoFactorService from "@/services/twoFactorService";
import { z } from "zod";
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const downloadQuerySchema = z.object({
  format: z.enum(["txt", "json", "pdf"]).optional().default("txt"),
  verificationCode: z.string().min(6).max(20),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getUserFromSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      id: true, 
      email: true, 
      name: true,
      isActive: true,
      isBanned: true,
    },
  });

  if (!user || !user.isActive || user.isBanned) {
    return null;
  }

  return user;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// =============================================================================
// GET - Download backup codes (requires fresh generation)
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "GET", 
    path: "/api/backup-codes/download" 
  });

  try {
    const ip = getClientIp(req);

    // Strict rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      3, 
      `backup-codes:download:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded for backup codes download", { ip });
      return apiResponse.rateLimited(300, requestId);
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized backup codes download attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const verificationCode = searchParams.get("verificationCode");
    const format = searchParams.get("format") || "txt";

    if (!verificationCode) {
      return apiResponse.validationError(
        "Verification code is required to download backup codes",
        undefined,
        requestId
      );
    }

    // Validate format
    if (!["txt", "json"].includes(format)) {
      return apiResponse.validationError(
        "Invalid format. Supported formats: txt, json",
        undefined,
        requestId
      );
    }

    // Check if 2FA is enabled
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorAuth?.isEnabled) {
      return apiResponse.validationError(
        "Two-factor authentication is not enabled",
        undefined,
        requestId
      );
    }

    // Verify 2FA code
    const verifyResult = await TwoFactorService.verifyToken(
      user.id, 
      verificationCode
    );

    if (!verifyResult.success) {
      log.warn("Invalid verification code for backup codes download", {
        userId: user.id,
      });

      await auditLogService.create({
        userId: user.id,
        action: "READ",
        category: "security",
        description: "Failed backup codes download - invalid verification code",
        ipAddress: ip,
        status: "failure",
        requestId,
      });

      return apiResponse.validationError(
        "Invalid verification code",
        undefined,
        requestId
      );
    }

    // IMPORTANT: We cannot retrieve the original codes as they are hashed
    // This endpoint is for downloading NEWLY GENERATED codes only
    // Return error explaining this
    return apiResponse.validationError(
      "Backup codes cannot be downloaded after generation. They are stored securely and cannot be retrieved. Please generate new codes if needed.",
      [
        {
          field: "codes",
          message: "For security, backup codes are only shown once during generation",
        },
      ],
      requestId
    );

  } catch (error) {
    log.error("Error processing backup codes download request", {}, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST - Generate and download backup codes in one step
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "POST", 
    path: "/api/backup-codes/download" 
  });

  try {
    const ip = getClientIp(req);

    // Strict rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      2, 
      `backup-codes:download-generate:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return apiResponse.rateLimited(600, requestId);
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const { verificationCode, format = "txt" } = body;

    if (!verificationCode) {
      return apiResponse.validationError(
        "Verification code is required",
        undefined,
        requestId
      );
    }

    // Check 2FA
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorAuth?.isEnabled) {
      return apiResponse.validationError(
        "Two-factor authentication is not enabled",
        undefined,
        requestId
      );
    }

    // Verify 2FA code
    const verifyResult = await TwoFactorService.verifyToken(
      user.id, 
      verificationCode
    );

    if (!verifyResult.success) {
      await auditLogService.create({
        userId: user.id,
        action: "READ",
        category: "security",
        description: "Failed backup codes download - invalid verification",
        ipAddress: ip,
        status: "failure",
        requestId,
      });

      return apiResponse.validationError(
        "Invalid verification code",
        undefined,
        requestId
      );
    }

    // Import bcrypt and nanoid for code generation
    const bcrypt = await import("bcryptjs");
    const { nanoid } = await import("nanoid");

    // Generate new codes
    const count = 10;
    const plainCodes: string[] = [];
    const hashedCodes: { userId: string; code: string }[] = [];

    for (let i = 0; i < count; i++) {
      const part1 = nanoid(4).toUpperCase().replace(/[0OIL]/g, "X");
      const part2 = nanoid(4).toUpperCase().replace(/[0OIL]/g, "Y");
      const code = `${part1}-${part2}`;
      const hashedCode = await bcrypt.default.hash(code, 12);
      
      plainCodes.push(code);
      hashedCodes.push({
        userId: user.id,
        code: hashedCode,
      });
    }

    // Transaction: Replace existing codes
    await prisma.$transaction(async (tx) => {
      await tx.backupCode.deleteMany({
        where: { userId: user.id },
      });

      await tx.backupCode.createMany({
        data: hashedCodes,
      });
    });

    // Audit log
    await auditLogService.create({
      userId: user.id,
      action: "CREATE",
      category: "security",
      entityType: "backup_codes",
      description: `Generated ${count} backup codes for download`,
      ipAddress: ip,
      requestId,
    });

    log.info("Backup codes generated for download", {
      userId: user.id,
      count,
      format,
    });

    // Return based on format
    if (format === "json") {
      return new NextResponse(
        JSON.stringify({
          codes: plainCodes,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          warning: "Store these codes securely. They cannot be retrieved again.",
        }, null, 2),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="backup-codes-${Date.now()}.json"`,
            "X-Request-ID": requestId,
          },
        }
      );
    }

    // Default: TXT format
    const txtContent = [
      "=".repeat(50),
      "PROGRESS TRACKER - BACKUP CODES",
      "=".repeat(50),
      "",
      `Generated: ${new Date().toISOString()}`,
      `Account: ${user.email}`,
      "",
      "IMPORTANT:",
      "- Store these codes in a safe place",
      "- Each code can only be used once",
      "- These codes will not be shown again",
      "",
      "-".repeat(50),
      "YOUR BACKUP CODES:",
      "-".repeat(50),
      "",
      ...plainCodes.map((code, i) => `${(i + 1).toString().padStart(2, " ")}. ${code}`),
      "",
      "-".repeat(50),
      "",
      "If you lose access to your authenticator app,",
      "use one of these codes to sign in.",
      "",
      "=".repeat(50),
    ].join("\n");

    return new NextResponse(txtContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="backup-codes-${Date.now()}.txt"`,
        "X-Request-ID": requestId,
      },
    });

  } catch (error) {
    log.error("Error generating backup codes for download", {}, error);
    return apiResponse.error(error, requestId);
  }
}