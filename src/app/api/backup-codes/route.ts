// src/app/api/backup-codes/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
import { auditLogService } from "@/services/auditLogService";
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// TYPES
// =============================================================================

interface BackupCodeInfo {
  id: string;
  isUsed: boolean;
  usedAt: Date | null;
  usedIpAddress: string | null;
  createdAt: Date;
}

interface BackupCodesResponse {
  codes: BackupCodeInfo[];
  stats: {
    total: number;
    used: number;
    available: number;
    lastGeneratedAt: Date | null;
  };
  twoFactorEnabled: boolean;
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
// GET - List backup codes status (without revealing actual codes)
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, method: "GET", path: "/api/backup-codes" });

  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rateLimitResult = await checkLimit(apiRateLimiter, 30, `backup-codes:list:${ip}`);
    
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

    // Check if 2FA is enabled
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
      select: { isEnabled: true, createdAt: true },
    });

    // Get backup codes
    const backupCodes = await prisma.backupCode.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        usedAt: true,
        usedIpAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const total = backupCodes.length;
    const used = backupCodes.filter((c) => c.usedAt !== null).length;
    const available = total - used;

    // Find when codes were last generated
    const lastGeneratedAt = backupCodes.length > 0 
      ? backupCodes.reduce((latest, code) => 
          code.createdAt > latest ? code.createdAt : latest, 
          backupCodes[0].createdAt
        )
      : null;

    const response: BackupCodesResponse = {
      codes: backupCodes.map((code) => ({
        id: code.id,
        isUsed: code.usedAt !== null,
        usedAt: code.usedAt,
        usedIpAddress: code.usedIpAddress ? maskIpAddress(code.usedIpAddress) : null,
        createdAt: code.createdAt,
      })),
      stats: {
        total,
        used,
        available,
        lastGeneratedAt,
      },
      twoFactorEnabled: twoFactorAuth?.isEnabled ?? false,
    };

    log.info("Backup codes fetched", { 
      userId: user.id, 
      total, 
      used, 
      available 
    });

    return apiResponse.success(response, {
      status: 200,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error fetching backup codes", {}, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// DELETE - Revoke all backup codes
// =============================================================================

export async function DELETE(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, method: "DELETE", path: "/api/backup-codes" });

  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rateLimitResult = await checkLimit(apiRateLimiter, 5, `backup-codes:delete:${ip}`);
    
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
      description: `Revoked all backup codes (${deleteResult.count} codes)`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || undefined,
      requestId,
    });

    log.info("All backup codes revoked", { 
      userId: user.id, 
      count: deleteResult.count 
    });

    return apiResponse.success(
      { 
        message: "All backup codes have been revoked",
        revokedCount: deleteResult.count,
      },
      {
        status: 200,
        meta: { requestId },
      }
    );

  } catch (error) {
    log.error("Error revoking backup codes", {}, error);
    return apiResponse.error(error, requestId);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function maskIpAddress(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  
  // IPv6
  if (ip.includes(":")) {
    const ipv6Parts = ip.split(":");
    if (ipv6Parts.length >= 4) {
      return `${ipv6Parts[0]}:${ipv6Parts[1]}:****:****`;
    }
  }
  
  return ip.substring(0, 6) + "***";
}