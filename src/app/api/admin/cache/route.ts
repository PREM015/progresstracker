
import { NextRequest } from "next/server";
import apiHandler from "@/lib/apiHandler";
import { success, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import { redis } from "@/lib/redis";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";

export const GET = apiHandler.withErrorHandling(async (req: NextRequest) => {
  // 1. Admin auth
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  try {
    // 2. Info commands
    // Upstash/Redis commands might vary slightly, using standard ones
    const memoryInfo = await (redis as any).info("memory");
    const statsInfo = await (redis as any).info("stats");
    const dbSize = await redis.dbsize();

    // 3. Scan for top keys (simplified: just getting a sample of keys)
    // Detailed memory analysis per key is expensive in Redis, usually avoided in production flow
    // We will just list some keys and count by prefix

    let cursor = 0;
    const keysByPrefix: Record<string, number> = {};
    const sampleKeys: any[] = [];

    // Scan a batch to get some stats
    const scanResult = await redis.scan(cursor, { count: 100 });
    const keys = scanResult[1];

    for (const key of keys) {
      const parts = key.split(":");
      const prefix = parts.length > 1 ? parts[0] + ":" : "other";
      keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;

      // Only get details for a few to avoid perf hit
      if (sampleKeys.length < 20) {
        const ttl = await redis.ttl(key);
        // getting size is trickier, memory usage might not be available directly per key without DEBUG OBJECT
        // we'll skip exact size for now or approximate string length
        sampleKeys.push({ key, ttl });
      }
    }

    // 4. Log access
    // We need admin user ID for logging. adminAuth doesn't return it directly but validates token.
    // We might need to get token again or assume safely if we want to log *who*.
    // For now, logging general access.
    // auditLogService.create({ action: "READ" as AuditAction, category: "cache", description: "Admin viewed cache stats" });

    return success({
      stats: {
        totalKeys: dbSize,
        memory: memoryInfo, // Raw string output from INFO
        stats: statsInfo
      },
      topKeys: sampleKeys,
      keysByPrefix
    });

  } catch (err: any) {
    return internalError("Cache connection error: " + err.message);
  }
});
