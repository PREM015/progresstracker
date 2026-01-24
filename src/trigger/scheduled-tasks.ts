// src/trigger/scheduled-tasks.ts

import { schedules } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

// Weekly stats email (Mondays at 9 AM UTC)
export const weeklyStatsEmailTask = schedules.task({
  id: "weekly-stats-email",
  cron: "0 9 * * 1", // Monday 9 AM UTC
  run: async () => {
    logger.info("Starting weekly stats email task...");

    const users = await prisma.notificationPreferences.findMany({
      where: { weeklySummary: true },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const { user } of users) {
      try {
        // Get user's weekly stats
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        const stats = await prisma.trackerEntry.findMany({
          where: {
            userId: user.id,
            date: { gte: startOfWeek },
          },
        });

        const totalProblems = stats.reduce(
          (sum, entry) => sum + entry.problemsSolved,
          0
        );
        const totalTime = stats.reduce((sum, entry) => sum + entry.timeSpent, 0);
        const entriesCount = stats.length;

        // Send email
        await sendEmail({
          to: user.email || "",
          subject: "📊 Your Weekly Progress Report",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your Weekly Progress Report 📊</h2>
              <p>Hi ${user.name || "Coder"},</p>
              <p>Here's your progress summary for this week:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Problems Solved:</strong> ${totalProblems}</p>
                <p><strong>Time Spent:</strong> ${Math.round(totalTime / 60)} hours</p>
                <p><strong>Entries Logged:</strong> ${entriesCount}</p>
              </div>
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Full Dashboard
              </a>
              <p>Keep up the great work! 🚀</p>
            </div>
          `,
        });

        successCount++;
        logger.success(`Weekly email sent to ${user.email}`);
      } catch (error) {
        failureCount++;
        logger.error(`Failed to send email to ${user.email}:`, error as Error);
      }
    }

    logger.info(
      `Weekly stats email task completed: ${successCount} sent, ${failureCount} failed`
    );
    return { usersNotified: successCount, failures: failureCount };
  },
});

// Daily reminder emails (6 PM UTC)
export const dailyReminderTask = schedules.task({
  id: "daily-reminder",
  cron: "0 18 * * *", // 6 PM UTC
  run: async () => {
    logger.info("Starting daily reminder email task...");

    const users = await prisma.notificationPreferences.findMany({
      where: { emailReminders: true },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // Check who hasn't logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersNeeded = 0;
    let remindersSent = 0;
    let remindersFailed = 0;

    for (const { user } of users) {
      try {
        const todayEntry = await prisma.trackerEntry.findFirst({
          where: {
            userId: user.id,
            date: { gte: today },
          },
        });

        // Only send reminder if no entry today
        if (!todayEntry && user.email) {
          remindersNeeded++;

          await sendEmail({
            to: user.email,
            subject: "⏰ Don't forget to log your progress today!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Time to Log Your Progress! ⏰</h2>
                <p>Hi ${user.name || "Coder"},</p>
                <p>You haven't logged any progress today yet. Don't break your streak!</p>
                <p>Quick actions:</p>
                <ul>
                  <li><a href="${process.env.NEXTAUTH_URL}/dashboard">View Dashboard</a></li>
                  <li><a href="${process.env.NEXTAUTH_URL}/dashboard/new-entry">Log Entry</a></li>
                  <li><a href="${process.env.NEXTAUTH_URL}/sync">Sync Platforms</a></li>
                </ul>
                <p>Every day counts! 💪</p>
              </div>
            `,
          });

          remindersSent++;
          logger.success(`Reminder sent to ${user.email}`);
        }
      } catch (error) {
        remindersFailed++;
        logger.error(`Failed to send reminder to ${user.email}:`, error as Error);
      }
    }

    logger.info(
      `Daily reminder task completed: ${remindersSent} sent, ${remindersFailed} failed, ${remindersNeeded - remindersSent} pending`
    );
    return { remindersNeeded, remindersSent, remindersFailed };
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

    logger.info(`Cleaned up ${result.count} old sync logs`);

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

    logger.info(`Found ${stale.length} stale connections`);

    return { staleCount: stale.length, connections: stale };
  },
});