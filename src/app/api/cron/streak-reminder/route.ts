import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    try {
        // Find users with active streaks but no activity today
        // Placeholder for real reminder logic matching prompt requirements
        const users = await prisma.user.count({
            where: {
                currentStreak: { gt: 0 },
                notificationPrefs: { is: { emailEnabled: true } }
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                eligibleUsers: users,
                remindersSent: 0, // Mock sending
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Streak reminder failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
