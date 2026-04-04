import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
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
    const dismissedCutoff = subDays(new Date(), 7);
    let dismissedCount = 0;
    try {
      // @ts-ignore - isDismissed/dismissedAt may exist
      const dismissedDeleted = await prisma.notification.deleteMany({
        where: { isDismissed: true, dismissedAt: { lt: dismissedCutoff } }
      });
      dismissedCount = dismissedDeleted.count;
    } catch {
      // Fields may not exist in schema
    }

    // 4. Stale Push Subscriptions
    let stalePushCount = 0;
    try {
      // @ts-ignore - PushSubscription model may exist
      const staleSubs = await prisma.pushSubscription.deleteMany({
        where: {
          OR: [
            { failureCount: { gte: 3 } },
            { isActive: false, updatedAt: { lt: subDays(new Date(), 30) } }
          ]
        }
      });
      stalePushCount = staleSubs.count;
    } catch {
      // Model may not exist
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedNotifications: {
          read: readDeleted.count,
          unread: unreadDeleted.count,
          dismissed: dismissedCount,
        },
        deletedPushSubscriptions: stalePushCount,
        duration: Date.now() - startTime
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Notification cleanup failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
