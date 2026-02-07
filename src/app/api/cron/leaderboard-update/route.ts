
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        // 1. Fetch users sorted by points
        const users = await prisma.user.findMany({
            where: { isActive: true, deletedAt: null, isPublic: true },
            orderBy: { totalPoints: 'desc' },
            select: { id: true, totalPoints: true, rank: true }
        });

        // 2. Calculate Ranks
        let currentRank = 1;
        let previousPoints: number | null = null;
        let sameRankCount = 0;

        const updates = [];
        const rankChanges = [];

        for (const user of users) {
            let rank = currentRank;
            if (user.totalPoints === previousPoints) {
                sameRankCount++;
                // Rank stays same as previous
                rank = currentRank - sameRankCount; // Wait, standard dense rank?
                // "Standard competition ranking" (1224):
                // If A=10, B=10, C=9. A=1, B=1, C=3.
                rank = currentRank - sameRankCount; // This logic is tricky in loop.
                // Let's fix:
                // Loop 1: A=10. prev=null. rank=1. same=0. prev=10. curr=2.
                // Loop 2: B=10. prev=10. same=1. rank=2-1=1. curr=3.
                // Loop 3: C=9. prev=10. same=0. rank=3.
            } else {
                // Reset tie
                sameRankCount = 0;
            }

            // Re-implement standard ranking correctly
        }

        // Simpler approach:
        let rank = 1;
        for (let i = 0; i < users.length; i++) {
            if (i > 0 && users[i].totalPoints < users[i - 1].totalPoints) {
                rank = i + 1;
            }
            // If equal, rank stays same (i+1 is skipped for next)

            if (users[i].rank !== rank) {
                updates.push(prisma.user.update({
                    where: { id: users[i].id },
                    data: { rank }
                }));
                rankChanges.push({ userId: users[i].id, old: users[i].rank, new: rank });
            }
        }

        // 3. Update DB
        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        // 4. Update Redis Cache
        if (redis) {
            await redis.del('leaderboard:global');
        }

        return NextResponse.json({
            success: true,
            data: {
                usersRanked: users.length,
                rankChanges: updates.length,
                duration: Date.now() - startTime
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Leaderboard update failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
