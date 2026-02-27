// src/app/api/backup-codes/verify/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { authRateLimiter, checkLimit } from "@/lib/rateLimit";
import { auditLogService } from "@/services/auditLogService";
import { z } from "zod";
import bcrypt from "bcryptjs";
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const verifySchema = z.object({
  code: z
    .string()
    .min(8, "Invalid backup code format")
    .max(20, "Invalid backup code format")
    .transform((val) => val.toUpperCase().replace(/\s/g, "")),
});

type VerifyInput = z.infer<typeof verifySchema>;

// =============================================================================
// TYPES
// =============================================================================

interface VerifyResponse {
  success: boolean;
  remainingCodes: number;
  message: string;
  warning?: string;
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

// =============================================================================
// POST - Verify a backup code
// =============================================================================

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "POST", 
    path: "/api/backup-codes/verify" 
  });

  try {
    const ip = getClientIp(req);

    // Strict rate limiting for verification attempts
    const rateLimitResult = await checkLimit(
      authRateLimiter, 
      5, 
      `backup-codes:verify:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded for backup code verification", { ip });
      
      // Audit suspicious activity
      await auditLogService.create({
        action: "LOGIN_FAILED",
        category: "security",
        description: "Rate limit exceeded for backup code verification",
        ipAddress: ip,
        status: "failure",
        requestId,
      });

      return apiResponse.rateLimited(300, requestId); // 5 minutes
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized backup code verification attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // User-specific rate limiting
    const userRateLimitResult = await checkLimit(
      authRateLimiter, 
      10, 
      `backup-codes:verify:user:${user.id}`
    );
    
    if (!userRateLimitResult.success) {
      log.warn("User rate limit exceeded for backup code verification", { 
        userId: user.id 
      });
      return apiResponse.rateLimited(600, requestId); // 10 minutes
    }

    // Parse and validate request body
    let body: VerifyInput;
    try {
      const rawBody = await req.json();
      body = verifySchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return apiResponse.validationError(
          "Invalid backup code format",
          error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
          requestId
        );
      }
      return apiResponse.validationError("Invalid JSON body", undefined, requestId);
    }

    const { code } = body;

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

    // Get all unused backup codes for user
    const backupCodes = await prisma.backupCode.findMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    if (backupCodes.length === 0) {
      log.warn("No backup codes available", { userId: user.id });
      
      await auditLogService.create({
        userId: user.id,
        action: "LOGIN_FAILED",
        category: "security",
        description: "Backup code verification failed - no codes available",
        ipAddress: ip,
        status: "failure",
        requestId,
      });

      return apiResponse.validationError(
        "No backup codes available. Please generate new codes.",
        undefined,
        requestId
      );
    }

    // Try to match the code
    let matchedCode: typeof backupCodes[0] | null = null;

    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(code, backupCode.code);
      if (isMatch) {
        matchedCode = backupCode;
        break;
      }
    }

    if (!matchedCode) {
      log.warn("Invalid backup code attempt", { userId: user.id });

      await auditLogService.create({
        userId: user.id,
        action: "LOGIN_FAILED",
        category: "security",
        description: "Invalid backup code used",
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || undefined,
        status: "failure",
        requestId,
      });

      return apiResponse.validationError(
        "Invalid backup code",
        undefined,
        requestId
      );
    }

    // Mark code as used
    await prisma.backupCode.update({
      where: { id: matchedCode.id },
      data: {
        usedAt: new Date(),
        usedIpAddress: ip,
      },
    });

    // Update 2FA last used
    await prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: { lastUsedAt: new Date() },
    });

    // Get remaining codes count
    const remainingCount = await prisma.backupCode.count({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Audit success
    await auditLogService.create({
      userId: user.id,
      action: "LOGIN",
      category: "security",
      entityType: "backup_code",
      entityId: matchedCode.id,
      description: `Backup code verified successfully (${remainingCount} remaining)`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      requestId,
    });

    log.info("Backup code verified", {
      userId: user.id,
      backupCodeId: matchedCode.id,
      remainingCodes: remainingCount,
    });

    // Build response with appropriate warnings
    const response: VerifyResponse = {
      success: true,
      remainingCodes: remainingCount,
      message: remainingCount === 0
        ? "This was your last backup code. Please generate new ones immediately."
        : `Backup code verified. You have ${remainingCount} code${remainingCount === 1 ? "" : "s"} remaining.`,
    };

    // Add warning if running low on codes
    if (remainingCount <= 2 && remainingCount > 0) {
      response.warning = `Only ${remainingCount} backup code${remainingCount === 1 ? "" : "s"} remaining. Consider generating new codes.`;
    } else if (remainingCount === 0) {
      response.warning = "CRITICAL: No backup codes remaining. Generate new codes immediately!";
    }

    return apiResponse.success(response, {
      status: 200,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error verifying backup code", {}, error);
    return apiResponse.error(error, requestId);
  }
}