// src/app/api/backup-codes/generate/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */
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

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const generateSchema = z.object({
  count: z
    .number()
    .int()
    .min(6, "Minimum 6 codes required")
    .max(16, "Maximum 16 codes allowed")
    .optional()
    .default(10),
  replaceExisting: z
    .boolean()
    .optional()
    .default(false),
  verificationCode: z
    .string()
    .min(6, "Verification code is required")
    .max(20)
    .optional(),
});

type GenerateInput = z.infer<typeof generateSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface GenerateResponse {
  codes: string[];
  count: number;
  message: string;
  warning?: string;
  expiresAt?: Date;
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
  // Format: XXXX-XXXX (8 alphanumeric characters with hyphen)
  const part1 = nanoid(4).toUpperCase().replace(/[0OIL]/g, "X");
  const part2 = nanoid(4).toUpperCase().replace(/[0OIL]/g, "Y");
  return `${part1}-${part2}`;
}

// =============================================================================
// POST - Generate new backup codes
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "POST", 
    path: "/api/backup-codes/generate" 
  });

  try {
    // Rate limiting - strict for code generation
    const ip = getClientIp(req);
    const rateLimitResult = await checkLimit(
      authRateLimiter, 
      3, 
      `backup-codes:generate:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded for backup code generation", { ip });
      return apiResponse.rateLimited(300, requestId); // 5 minutes
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized backup code generation attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Parse and validate request body
    let body: GenerateInput;
    try {
      const rawBody = await req.json();
      body = generateSchema.parse(rawBody);
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

    const { count, replaceExisting, verificationCode } = body;

    // Check if 2FA is enabled
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorAuth?.isEnabled) {
      log.warn("Attempted to generate backup codes without 2FA", { 
        userId: user.id 
      });
      return apiResponse.validationError(
        "Two-factor authentication must be enabled to generate backup codes",
        undefined,
        requestId
      );
    }

    // If replacing existing codes, verify current 2FA code first
    if (replaceExisting) {
      if (!verificationCode) {
        return apiResponse.validationError(
          "Verification code is required when replacing existing codes",
          undefined,
          requestId
        );
      }

      const verifyResult = await TwoFactorService.verifyToken(
        user.id, 
        verificationCode
      );

      if (!verifyResult.success) {
        log.warn("Invalid verification code for backup code regeneration", {
          userId: user.id,
        });

        // Audit failed attempt
        await auditLogService.create({
          userId: user.id,
          action: "TWO_FACTOR_DISABLE",
          category: "security",
          description: "Failed backup code regeneration - invalid verification code",
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
    }

    // Check existing codes count
    const existingCodesCount = await prisma.backupCode.count({
      where: { userId: user.id, usedAt: null },
    });

    if (!replaceExisting && existingCodesCount > 0) {
      log.info("User already has backup codes", { 
        userId: user.id, 
        existingCount: existingCodesCount 
      });
      return apiResponse.validationError(
        `You already have ${existingCodesCount} unused backup codes. Set replaceExisting to true to generate new ones.`,
        undefined,
        requestId
      );
    }

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

    // Transaction: Delete old codes (if replacing) and create new ones
    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.backupCode.deleteMany({
          where: { userId: user.id },
        });
      }

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
      description: `Generated ${count} new backup codes${replaceExisting ? " (replaced existing)" : ""}`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      newValue: { count, replaceExisting },
      requestId,
    });

    log.info("Backup codes generated successfully", {
      userId: user.id,
      count,
      replaceExisting,
    });

    const response: GenerateResponse = {
      codes: plainCodes,
      count: plainCodes.length,
      message: "Save these codes in a safe place. They will not be shown again.",
      warning: "Each code can only be used once. Store them securely.",
    };

    return apiResponse.success(response, {
      status: 201,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error generating backup codes", {}, error);
    return apiResponse.error(error, requestId);
  }
}