// src/middleware/adminAuth.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { applyRateLimit } from "@/lib/server/redis-rate-limit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function adminAuth(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  // 1. IP Restriction
  const allowedIps = process.env.ALLOWED_ADMIN_IPS;
  if (allowedIps && allowedIps.length > 0) {
    const ipList = allowedIps.split(",").map(i => i.trim());
    if (ip !== "unknown" && !ipList.includes(ip) && !ipList.includes("*")) {
      logger.warn("Admin access denied: IP not allowed", { ip, url: request.nextUrl.pathname });
      return NextResponse.json({ error: "Forbidden - IP Restricted" }, { status: 403 });
    }
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token.role !== "admin") {
    logger.warn("Admin access denied: Insufficient role", { userId: token.id || token.sub, role: token.role, url: request.nextUrl.pathname });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  const userId = (token.id || token.sub) as string;

  // 2. Rate limiting for destructive operations
  const method = request.method.toUpperCase();
  const isDestructive = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  
  if (isDestructive) {
    const rateLimitResult = await applyRateLimit("adminDestructive", userId);
    
    if (!rateLimitResult.allowed) {
      logger.warn("Admin destructive operation rate limited", { userId, ip, url: request.nextUrl.pathname });
      return NextResponse.json(
        { error: "Too many admin operations, please try again later." },
        { status: 429 }
      );
    }

    // 3. Audit logging for destructive operations
    try {
      // Fire-and-forget
      prisma.auditLog.create({
        data: {
          userId,
          action: "ADMIN_ACTION",
          category: "admin",
          description: `${method} ${request.nextUrl.pathname}`,
          ipAddress: ip,
          userAgent: request.headers.get("user-agent")?.slice(0, 255),
          metadata: { path: request.nextUrl.pathname, method },
          status: "success",
          entityType: "system",
          entityId: "system"
        }
      }).catch(err => {
        logger.error("Failed to write admin audit log", { error: err.message });
      });
    } catch (e) {
      // Ignore
    }
  }

  return null; 
}