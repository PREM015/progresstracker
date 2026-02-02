// src/app/api/backup-codes/revoke/route.ts
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

/* eslint-disable @typescript-eslint/no-unused-vars */


// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const revokeSchema = z.object({
  verificationCode: z
    .string()
    .min(6, "Verification code is required")
    .max(20, "Invalid verification code"),
  reason: z
    .string()
    .max(200)
    .optional(),
});

type RevokeInput = z.infer<typeof revokeSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface RevokeResponse {
  success: boolean;
  revokedCount: number;
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
// DELETE - Revoke all backup codes (with verification)
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "DELETE", 
    path: "/api/backup-codes/revoke" 
  });

  try {
    const ip = getClientIp(req);

    // Strict rate limiting
    const rateLimitResult = await checkLimit(
      authRateLimiter, 
      3, 
      `backup-codes:revoke:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded for backup code revocation", { ip });
      return apiResponse.rateLimited(300, requestId);
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized revocation attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Parse and validate request body
    let body: RevokeInput;
    try {
      const rawBody = await req.json();
      body = revokeSchema.parse(rawBody);
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

    const { verificationCode, reason } = body;

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
      log.warn("Invalid verification code for revocation", {
        userId: user.id,
      });

      await auditLogService.create({
        userId: user.id,
        action: "DELETE",
        category: "security",
        description: "Failed backup codes revocation - invalid verification",
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

    // Count codes before deletion
    const codesCount = await prisma.backupCode.count({
      where: { userId: user.id },
    });

    if (codesCount === 0) {
      return apiResponse.validationError(
        "No backup codes to revoke",
        undefined,
        requestId
      );
    }

    // Delete all backup codes
    const deleteResult = await prisma.backupCode.deleteMany({
      where: { userId: user.id },
    });

    // Audit log
    await auditLogService.create({
      userId: user.id,
      action: "DELETE",
      category: "security",
      entityType: "backup_codes",
      description: `Revoked all backup codes (${deleteResult.count} codes)${reason ? `: ${reason}` : ""}`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      oldValue: { count: deleteResult.count },
      requestId,
    });

    log.info("All backup codes revoked", {
      userId: user.id,
      count: deleteResult.count,
      reason,
    });

    const response: RevokeResponse = {
      success: true,
      revokedCount: deleteResult.count,
      message: `Successfully revoked ${deleteResult.count} backup code${deleteResult.count === 1 ? "" : "s"}.`,
      warning: "You no longer have any backup codes. Generate new ones to maintain account recovery options.",
    };

    return apiResponse.success(response, {
      status: 200,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error revoking backup codes", {}, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// POST - Revoke all backup codes (alternative method)
// =============================================================================

export async function POST(req: NextRequest) {
  // Delegate to DELETE handler
  return DELETE(req);
}