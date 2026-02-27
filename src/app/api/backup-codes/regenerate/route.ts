// src/app/api/backup-codes/regenerate/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { authRateLimiter, checkLimit } from "@/lib/rateLimit";
import { auditLogService } from "@/services/auditLogService";
import TwoFactorService from "@/services/twoFactorService";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

/* eslint-disable @typescript-eslint/no-unused-vars */


// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const regenerateSchema = z.object({
  verificationCode: z
    .string()
    .min(6, "Verification code is required")
    .max(20, "Invalid verification code"),
  count: z
    .number()
    .int()
    .min(6)
    .max(16)
    .optional()
    .default(10),
});

type RegenerateInput = z.infer<typeof regenerateSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface RegenerateResponse {
  codes: string[];
  count: number;
  previousCodesRevoked: number;
  message: string;
  warning: string;
}

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

function generateBackupCode(): string {
  const part1 = nanoid(4).toUpperCase().replace(/[0OIL]/g, "X");
  const part2 = nanoid(4).toUpperCase().replace(/[0OIL]/g, "Y");
  return `${part1}-${part2}`;
}

// =============================================================================
// POST - Regenerate all backup codes
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "POST", 
    path: "/api/backup-codes/regenerate" 
  });

  try {
    const ip = getClientIp(req);

    // Strict rate limiting
    const rateLimitResult = await checkLimit(
      authRateLimiter, 
      2, 
      `backup-codes:regenerate:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded for backup code regeneration", { ip });
      return apiResponse.rateLimited(600, requestId); // 10 minutes
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized regeneration attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Parse and validate request body
    let body: RegenerateInput;
    try {
      const rawBody = await req.json();
      body = regenerateSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return apiResponse.validationError(
          "Invalid request data",
          error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
          requestId
        );
      }
      return apiResponse.validationError("Invalid JSON body", undefined, requestId);
    }

    const { verificationCode, count } = body;

    // Check if 2FA is enabled
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorAuth?.isEnabled) {
      return apiResponse.validationError(
        "Two-factor authentication must be enabled to regenerate backup codes",
        undefined,
        requestId
      );
    }

    // Verify 2FA code (try TOTP first, then backup code)
    const verifyResult = await TwoFactorService.verify(
      user.id, 
      verificationCode,
      ip
    );

    if (!verifyResult.success) {
      log.warn("Invalid verification code for regeneration", {
        userId: user.id,
      });

      await auditLogService.create({
        userId: user.id,
        action: "UPDATE",
        category: "security",
        description: "Failed backup code regeneration - invalid verification",
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

    // Count existing codes before deletion
    const existingCodesCount = await prisma.backupCode.count({
      where: { userId: user.id },
    });

    // Generate new backup codes
    const plainCodes: string[] = [];
    const hashedCodes: { userId: string; code: string }[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateBackupCode();
      const hashedCode = await bcrypt.hash(code, 12);
      
      plainCodes.push(code);
      hashedCodes.push({
        userId: user.id,
        code: hashedCode,
      });
    }

    // Transaction: Delete old codes and create new ones
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
      action: "UPDATE",
      category: "security",
      entityType: "backup_codes",
      description: `Regenerated backup codes (${existingCodesCount} old → ${count} new)`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      oldValue: { count: existingCodesCount },
      newValue: { count },
      requestId,
    });

    log.info("Backup codes regenerated", {
      userId: user.id,
      previousCount: existingCodesCount,
      newCount: count,
    });

    const response: RegenerateResponse = {
      codes: plainCodes,
      count: plainCodes.length,
      previousCodesRevoked: existingCodesCount,
      message: "New backup codes generated. All previous codes have been revoked.",
      warning: "Save these codes in a safe place. They will not be shown again.",
    };

    return apiResponse.success(response, {
      status: 200,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error regenerating backup codes", {}, error);
    return apiResponse.error(error, requestId);
  }
}