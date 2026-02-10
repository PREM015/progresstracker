
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import apiHandler from '@/lib/apiHandler';

export const GET = apiHandler.withErrorHandling(async () => {
    // Cache for 1 hour
    const revalidate = 3600;

    // Fetch stats in parallel
    const [userCount, problemCount, platformCount] = await Promise.all([
        prisma.user.count(),
        prisma.trackerEntry.count(),
        prisma.platform.count(),
    ]);

    // Use a static calculation or fetch from a review system if implemented
    // For now, calculating a pseudo-satisfaction implementation based on system uptime/metrics could be complex
    // So we'll use a high baseline + a small random factor to simulate real-time "feedback" if we had it,
    // or just static 99% as requested, but let's make it slightly dynamic based on successful syncs if possible.
    // For simplicity and speed on public page, let's keep it simple but realistic.

    const stats = {
        activeUsers: userCount > 50000 ? '50K+' : `${Math.floor(userCount / 100) * 100}+`,
        problemsTracked: problemCount > 2000000 ? '2M+' : `${Math.floor(problemCount / 1000)}K+`,
        platformsSupported: platformCount > 100 ? '100+' : `${platformCount}+`,
        userSatisfaction: '99%',
    };

    return NextResponse.json(
        { success: true, data: { stats } },
        { headers: { 'Cache-Control': `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate}` } }
    );
});
