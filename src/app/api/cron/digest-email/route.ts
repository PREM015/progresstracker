
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { sendEmail } from "@/lib/email"; // Assumed

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const frequency = searchParams.get("frequency") || "weekly"; // daily or weekly

    const startTime = Date.now();

    try {
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                notificationPrefs: {
                    emailEnabled: true,
                    digestEnabled: true,
                    digestFrequency: frequency
                }
            },
            include: { notificationPrefs: true }
        });

        let sent = 0;
        let skipped = 0;

        const now = new Date();
        const periodStart = frequency === 'daily' ? subDays(now, 1) : subDays(now, 7);

        for (const user of users) {
            // Check activity
            const activityCount = await prisma.trackerEntry.count({
                where: {
                    userId: user.id,
                    date: { gte: periodStart }
                }
            });

            if (activityCount === 0) {
                skipped++;
                continue;
            }

            // Send email
            // await sendEmail({ to: user.email, template: 'digest', data: { ... } });
            sent++;
        }

        return NextResponse.json({
            success: true,
            data: {
                frequency,
                eligibleUsers: users.length,
                emailsSent: sent,
                skipped,
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Digest failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
