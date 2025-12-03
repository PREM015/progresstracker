// src/trigger/scheduled-tasks.ts

import { schedules, task } from "@trigger.dev/sdk/v3";
import {prisma} from "@/lib/prisma";

// Weekly stats email (Mondays at 9 AM UTC)
export const weeklyStatsEmailTask = schedules.task({
  id: "weekly-stats-email",
  cron: "0 9 * * 1", // Monday 9 AM UTC
  run: async () => {
    console.log("Sending weekly stats emails...");

    const users = await prisma.notificationPreferences.findMany({
      where: { weeklySummary: true },
      include: { user: { select: { email: true, name: true } } },
    });

    // TODO: Implement email sending
    console.log(`Would send emails to ${users.length} users`);

    return { usersNotified: users.length };
  },
});

// Daily reminder emails (6 PM UTC)
export const dailyReminderTask = schedules.task({
  id: "daily-reminder",
  cron: "0 18 * * *", // 6 PM UTC
  run: async () => {
    console.log("Sending daily reminders...");

    const users = await prisma.notificationPreferences.findMany({
      where: { emailReminders: true },
      include: { user: { select: { id: true, email: true } } },
    });

    // Check who hasn't logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersNeeded = 0;

    for (const { user } of users) {
      const todayEntry = await prisma.trackerEntry.findFirst({
        where: {
          userId: user.id,
          date: { gte: today },
        },
      });

      if (!todayEntry) {
        // TODO: Send reminder email
        remindersNeeded++;
      }
    }

    return { remindersNeeded };
  },
});

// Cleanup old sync logs (weekly)
export const cleanupOldLogsTask = schedules.task({
  id: "cleanup-old-logs",
  cron: "0 3 * * 0", // Sunday 3 AM UTC
  run: async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.syncLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { not: "failed" }, // Keep failed logs longer
      },
    });

    console.log(`Cleaned up ${result.count} old sync logs`);

    return { deletedCount: result.count };
  },
});

// Check for stale connections (daily)
export const checkStaleConnectionsTask = schedules.task({
  id: "check-stale-connections",
  cron: "0 4 * * *", // 4 AM UTC daily
  run: async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find connections with no recent sync
    const staleConnections = await prisma.userPlatform.findMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
      },
      include: {
        platform: { select: { name: true, slug: true } },
        user: { select: { email: true } },
      },
    });

    // Check last sync for each
    const stale: string[] = [];

    for (const conn of staleConnections) {
      const lastSync = await prisma.syncLog.findFirst({
        where: {
          userId: conn.userId,
          platformId: conn.platformId,
          status: "success",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!lastSync || lastSync.createdAt < sevenDaysAgo) {
        stale.push(`${conn.user.email} - ${conn.platform.name}`);
      }
    }

    console.log(`Found ${stale.length} stale connections`);

    return { staleCount: stale.length, connections: stale };
  },
});