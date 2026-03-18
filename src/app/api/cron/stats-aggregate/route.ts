import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    try {
        // Aggregate daily usage and stats
        const usersCount = await prisma.user.count();
        const entriesCount = await prisma.trackerEntry.count();

        // In a real scenario, write these to a daily stats table

        return NextResponse.json({
            success: true,
            data: {
                totalUsers: usersCount,
                totalEntries: entriesCount,
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Stats aggregation failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
