
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, validationError, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import { redis } from "@/lib/redis";
import auditLogService from "@/services/auditLogService";
import { AuditAction } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export const POST = withErrorHandling(async (req: NextRequest) => {
  // 1. Admin auth
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const adminId = token?.sub;

  const body = await req.json();
  const { pattern, prefix, keys, clearAll, confirmClearAll } = body;

  if (!pattern && !prefix && (!keys || keys.length === 0) && !clearAll) {
    return validationError("Must specify pattern, prefix, keys, or clearAll");
  }

  let deletedCount = 0;
  let method = "";

  try {
    if (clearAll) {
      if (confirmClearAll !== true) {
        return validationError("confirmClearAll required for full cache clear");
      }
      await redis.flushall();
      deletedCount = -1; // Unknown count for flushall
      method = "flushall";
    } else if (keys && Array.isArray(keys) && keys.length > 0) {
      // Use pipeline if available or Promise.all
      // redis.del accepts multiple keys in spread
      deletedCount = await redis.del(...keys);
      method = "keys";
    } else if (pattern || prefix) {
      const matchPattern = pattern || `${prefix}*`;
      method = `pattern:${matchPattern}`;

      // Use scan to find and delete
      let cursor = 0;
      do {
        const res = await redis.scan(cursor, { match: matchPattern, count: 100 });
        cursor = Number(res[0]);
        const foundKeys = res[1];
        if (foundKeys.length > 0) {
          const currentDeleted = await redis.del(...foundKeys);
          deletedCount += currentDeleted;
        }
      } while (cursor !== 0);
    }

    // Log action
    if (adminId) {
      await auditLogService.create({
        userId: adminId,
        action: "DELETE" as AuditAction,
        category: "cache",
        description: `Cleared cache via ${method}`,
        changes: { method, count: deletedCount } as any
      });
    }

    return success({
      clearedCount: deletedCount,
      pattern: pattern || prefix || (clearAll ? "*" : null),
      clearedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return internalError("Cache clear failed: " + err.message);
  }
});
