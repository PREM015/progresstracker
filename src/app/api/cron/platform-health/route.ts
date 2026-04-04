import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const platforms = await prisma.platform.findMany({
      where: { isActive: true },
      select: { id: true, name: true, apiEndpoint: true, website: true }
    });

    const results = await Promise.all(platforms.map(async (p) => {
      const start = Date.now();
      const target = p.apiEndpoint || p.website;
      let status = 'unknown';
      let message = 'No endpoint';

      if (target) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(target, {
            method: 'HEAD',
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            status = 'healthy';
            message = 'OK';
          } else {
            status = 'degraded';
            message = `HTTP ${res.status}`;
          }
        } catch (e: any) {
          status = 'down';
          message = e.name === 'AbortError' ? 'Timeout' : 'Connection failed';
        }
      }

      return {
        platformId: p.id,
        name: p.name,
        status,
        latencyMs: Date.now() - start,
        message
      };
    }));

    // Update DB
    for (const res of results) {
      // @ts-ignore - healthStatus on Platform assumed
      await prisma.platform.update({
        where: { id: res.platformId },
        data: {
          healthStatus: res.status,
          healthMessage: res.message,
          lastHealthCheck: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        platformsChecked: platforms.length,
        results,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Platform health check failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
