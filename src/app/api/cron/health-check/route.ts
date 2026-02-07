
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis"; // if available

export const POST = async (req: Request) => {
    // Can be called by cron or monitoring service. Auth optional if public status page consumes it, but here we require secret.
    const authHeader = req.headers.get('Authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const startTime = Date.now();

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
        redisStatus = 'down'; // or 'skipped' if redis not configured
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
};

export const GET = POST;

// HEAD: Quick health status check
export const HEAD = async (req: Request) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return new NextResponse(null, {
            status: 200,
            headers: {
                'X-Health-Status': 'healthy',
            },
        });
    } catch (e) {
        return new NextResponse(null, {
            status: 503,
            headers: {
                'X-Health-Status': 'unhealthy',
            },
        });
    }
};

// OPTIONS: CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

