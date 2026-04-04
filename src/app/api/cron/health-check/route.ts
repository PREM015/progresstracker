import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Database Check
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'healthy';
    } catch (e) {
      dbStatus = 'down';
    }

    // 2. Redis Check
    let redisStatus = 'unknown';
    let redisLatency = 0;
    try {
      const redisStart = Date.now();
      await redis.ping();
      redisLatency = Date.now() - redisStart;
      redisStatus = 'healthy';
    } catch (e) {
      redisStatus = 'down';
    }

    const overall = (dbStatus === 'healthy' && redisStatus !== 'down') ? 'healthy' : 'degraded';

    return NextResponse.json({
      success: true,
      data: {
        overall,
        checks: {
          database: { status: dbStatus, latencyMs: dbLatency },
          redis: { status: redisStatus, latencyMs: redisLatency }
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
}

// HEAD: Quick health status check (no auth required for monitoring)
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, {
      status: 200,
      headers: { 'X-Health-Status': 'healthy' },
    });
  } catch (e) {
    return new NextResponse(null, {
      status: 503,
      headers: { 'X-Health-Status': 'unhealthy' },
    });
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
