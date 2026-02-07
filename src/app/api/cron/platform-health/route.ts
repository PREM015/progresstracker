
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          const res = await fetch(target, { method: 'HEAD', timeout: 5000 } as any);
          if (res.ok) {
            status = 'healthy';
            message = 'OK';
          } else {
            status = 'degraded';
            message = `HTTP ${res.status}`;
          }
        } catch (e: any) {
          status = 'down';
          message = e.message;
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
    return NextResponse.json({ error: "Platform health check failed", details: e.message }, { status: 500 });
  }
};

export const GET = POST;
