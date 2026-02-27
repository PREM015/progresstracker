
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiHandler from '@/lib/apiHandler';

// In-memory cache
let cachedStats: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

export const GET = apiHandler.withErrorHandling(async () => {
    // Check cache
    if (cachedStats && (Date.now() - cachedStats.timestamp < CACHE_TTL)) {
        return NextResponse.json(
            { success: true, data: { stats: cachedStats.data } },
            { headers: { 'Cache-Control': `public, s-maxage=${60}, stale-while-revalidate=${60}` } }
        );
    }

    // Fetch stats in parallel
    const [userCount, problemCount, platformCount] = await Promise.all([
        prisma.user.count(),
        prisma.trackerEntry.count(),
        prisma.platform.count(),
    ]);

    const stats = {
        activeUsers: userCount > 50000 ? '50K+' : `${Math.floor(userCount / 100) * 100}+`,
        problemsTracked: problemCount > 2000000 ? '2M+' : `${Math.floor(problemCount / 1000)}K+`,
        platformsSupported: platformCount > 100 ? '100+' : `${platformCount}+`,
        userSatisfaction: '99%',
    };

    // Update cache
    cachedStats = { data: stats, timestamp: Date.now() };

    return NextResponse.json(
        { success: true, data: { stats } },
        { headers: { 'Cache-Control': `public, s-maxage=${60}, stale-while-revalidate=${60}` } }
    );
});
