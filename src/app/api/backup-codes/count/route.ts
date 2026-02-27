// src/app/api/backup-codes/count/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import apiResponse from "@/lib/apiResponse";
import { apiRateLimiter, checkLimit } from "@/lib/rateLimit";
/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// TYPES
// =============================================================================

interface CountResponse {
  total: number;
  used: number;
  available: number;
  twoFactorEnabled: boolean;
  lastUsedAt: Date | null;
  needsRegeneration: boolean;
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
// GET - Get backup codes count
// =============================================================================

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ 
    requestId, 
    method: "GET", 
    path: "/api/backup-codes/count" 
  });

  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      60, 
      `backup-codes:count:${ip}`
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

    // Check 2FA status
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
      select: { isEnabled: true },
    });

    // Get backup codes stats
    const [allCodes, lastUsedCode] = await Promise.all([
      prisma.backupCode.findMany({
        where: { userId: user.id },
        select: { usedAt: true },
      }),
      prisma.backupCode.findFirst({
        where: { 
          userId: user.id, 
          usedAt: { not: null } 
        },
        orderBy: { usedAt: "desc" },
        select: { usedAt: true },
      }),
    ]);

    const total = allCodes.length;
    const used = allCodes.filter((c) => c.usedAt !== null).length;
    const available = total - used;

    // Determine if regeneration is needed
    const needsRegeneration = 
      (twoFactorAuth?.isEnabled && available === 0) ||
      (twoFactorAuth?.isEnabled && total === 0);

    const response: CountResponse = {
      total,
      used,
      available,
      twoFactorEnabled: twoFactorAuth?.isEnabled ?? false,
      lastUsedAt: lastUsedCode?.usedAt ?? null,
      needsRegeneration: available === 0,

       };

    log.debug("Backup codes count fetched", { 
      userId: user.id, 
      available 
    });

    return apiResponse.success(response, {
      status: 200,
      meta: { requestId },
    });

  } catch (error) {
    log.error("Error fetching backup codes count", {}, error);
    return apiResponse.error(error, requestId);
  }
}