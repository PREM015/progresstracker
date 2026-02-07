
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/apiHandler";
import { success, internalError } from "@/lib/apiResponse";
import { adminAuth } from "@/middleware/adminAuth";
import prisma from "@/lib/prisma";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const authRes = await adminAuth(req);
  if (authRes) return authRes;

  try {
    // 1. Database Size
    // Note: These raw queries are Postgres specific. 
    const dbSizeRes: any = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
    const totalSizeBytes = Number(dbSizeRes[0]?.size || 0);

    // 2. Table Stats
    const tableStats: any[] = await prisma.$queryRaw`
      SELECT 
        relname as name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20;
    `;

    // 3. Health/Latency check
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return success({
      tables: tableStats.map((t: any) => ({
        name: t.name,
        rowCount: Number(t.row_count),
        // sizeBytes and others require more complex query, skipping for safety/compatibility
        size: "Unknown",
        sizeBytes: 0
      })),
      totalSize: (totalSizeBytes / 1024 / 1024).toFixed(2) + " MB",
      totalSizeBytes,
      connectionPool: {
        active: 0, // Need pg_stat_activity which requires superuser often
        idle: 0,
        waiting: 0,
        max: 0
      },
      health: {
        status: latency < 100 ? "healthy" : latency < 500 ? "degraded" : "down",
        latencyMs: latency,
        lastChecked: new Date().toISOString()
      }
    });
  } catch (err: any) {
    return internalError("Failed to fetch DB stats: " + (err as Error).message);
  }
});
