
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        // Logic is almost identical to leaderboard-update.
        // This file might be for more complex point recalculation if needed.
        // For now, we'll implement a simple point-based rank update.

        const users = await prisma.user.findMany({
            where: { isActive: true, deletedAt: null },
            orderBy: { totalPoints: 'desc' },
            select: { id: true, totalPoints: true, rank: true }
        });

        let rank = 1;
        let updates = 0;

        const updatePromises = [];

        for (let i = 0; i < users.length; i++) {
            if (i > 0 && users[i].totalPoints < users[i - 1].totalPoints) {
                rank = i + 1;
            }

            if (users[i].rank !== rank) {
                updatePromises.push(prisma.user.update({
                    where: { id: users[i].id },
                    data: { rank }
                }));
                updates++;
            }
        }

        if (updatePromises.length > 0) {
            await prisma.$transaction(updatePromises);
        }

        return NextResponse.json({
            success: true,
            data: {
                usersProcessed: users.length,
                ranksUpdated: updates,
                duration: Date.now() - startTime
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Rank update failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
