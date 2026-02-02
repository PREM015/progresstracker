// src/app/api/backup-codes/[id]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { auditLogService } from "@/services/auditLogService";
import { z } from "zod";

/* eslint-disable @typescript-eslint/no-unused-vars */


// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const paramsSchema = z.object({
  id: z.string().cuid("Invalid backup code ID"),
});

// =============================================================================
// TYPES
// =============================================================================

interface BackupCodeDetail {
  id: string;
  isUsed: boolean;
  usedAt: Date | null;
  usedIpAddress: string | null;
  createdAt: Date;
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

function maskIpAddress(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  
  return ip.substring(0, 6) + "***";
}

// =============================================================================
// GET - Get specific backup code info
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "GET", 
    path: "/api/backup-codes/[id]" 
  });

  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      30, 
      `backup-codes:get:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return apiResponse.rateLimited(60, requestId);
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized access attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Validate params
    const resolvedParams = await params;
    const validationResult = paramsSchema.safeParse(resolvedParams);
    
    if (!validationResult.success) {
      return apiResponse.validationError(
        "Invalid backup code ID",
        validationResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        requestId
      );
    }

    const { id } = validationResult.data;

    // Get the backup code
    const backupCode = await prisma.backupCode.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        usedAt: true,
        usedIpAddress: true,
        createdAt: true,
      },
    });

    if (!backupCode) {
      return apiResponse.notFound("Backup code", requestId);
    }

    const response: BackupCodeDetail = {
      id: backupCode.id,
      isUsed: backupCode.usedAt !== null,
      usedAt: backupCode.usedAt,
      usedIpAddress: backupCode.usedIpAddress 
        ? maskIpAddress(backupCode.usedIpAddress) 
        : null,
      createdAt: backupCode.createdAt,
    };

    log.debug("Backup code detail fetched", { 
      userId: user.id, 
      codeId: id 
    });

    return apiResponse.success(response, {
      status: 200,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error fetching backup code detail", {}, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE - Revoke specific backup code
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "DELETE", 
    path: "/api/backup-codes/[id]" 
  });

  try {
    const ip = getClientIp(req);

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      10, 
      `backup-codes:delete-single:${ip}`
    );
    
    if (!rateLimitResult.success) {
      log.warn("Rate limit exceeded", { ip });
      return apiResponse.rateLimited(60, requestId);
    }

    // Authentication
    const user = await getUserFromSession(req);
    
    if (!user) {
      log.warn("Unauthorized deletion attempt");
      return apiResponse.unauthorized("Authentication required", requestId);
    }

    // Validate params
    const resolvedParams = await params;
    const validationResult = paramsSchema.safeParse(resolvedParams);
    
    if (!validationResult.success) {
      return apiResponse.validationError(
        "Invalid backup code ID",
        validationResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        requestId
      );
    }

    const { id } = validationResult.data;

    // Check if code exists and belongs to user
    const backupCode = await prisma.backupCode.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!backupCode) {
      return apiResponse.notFound("Backup code", requestId);
    }

    // Check if already used
    if (backupCode.usedAt) {
      return apiResponse.validationError(
        "This backup code has already been used and cannot be revoked",
        undefined,
        requestId
      );
    }

    // Delete the backup code
    await prisma.backupCode.delete({
      where: { id },
    });

    // Get remaining count
    const remainingCount = await prisma.backupCode.count({
      where: { 
        userId: user.id, 
        usedAt: null 
      },
    });

    // Audit log
    await auditLogService.create({
      userId: user.id,
      action: "DELETE",
      category: "security",
      entityType: "backup_code",
      entityId: id,
      description: `Revoked single backup code (${remainingCount} remaining)`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      requestId,
    });

    log.info("Backup code revoked", {
      userId: user.id,
      codeId: id,
      remainingCount,
    });

    return apiResponse.success(
      {
        success: true,
        message: "Backup code revoked successfully",
        remainingCodes: remainingCount,
        warning: remainingCount <= 2 
          ? `Only ${remainingCount} backup code${remainingCount === 1 ? "" : "s"} remaining. Consider generating new codes.`
          : undefined,
      },
      {
        status: 200,
        meta: { requestId },
      }
    );

  } catch (error) {
    log.error("Error revoking backup code", {}, error);
    return apiResponse.error(error, requestId);
  }
}