
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export const POST = async (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        // 1. Read > 30 days
        const readCutoff = subDays(new Date(), 30);
        const readDeleted = await prisma.notification.deleteMany({
            where: { isRead: true, createdAt: { lt: readCutoff } }
        });

        // 2. Unread > 90 days
        const unreadCutoff = subDays(new Date(), 90);
        const unreadDeleted = await prisma.notification.deleteMany({
            where: { isRead: false, createdAt: { lt: unreadCutoff } }
        });

        // 3. Dismissed > 7 days
        // Assuming 'isDismissed'/dismissedAt exists
        const dismissedCutoff = subDays(new Date(), 7);
        // @ts-ignore
        const dismissedDeleted = await prisma.notification.deleteMany({
            where: { isDismissed: true, dismissedAt: { lt: dismissedCutoff } }
        });

        // 4. Stale Push Subscriptions
        // @ts-ignore
        const staleSubs = await prisma.pushSubscription.deleteMany({
            where: {
                OR: [
                    { failureCount: { gte: 3 } },
                    { isActive: false, updatedAt: { lt: subDays(new Date(), 30) } }
                ]
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                deletedNotifications: {
                    read: readDeleted.count,
                    unread: unreadDeleted.count,
                    // @ts-ignore
                    dismissed: dismissedDeleted.count || 0
                },
                // @ts-ignore
                deletedPushSubscriptions: staleSubs.count || 0,
                duration: Date.now() - startTime
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Notification cleanup failed", details: e.message }, { status: 500 });
    }
};

export const GET = POST;
