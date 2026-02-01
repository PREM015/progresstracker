// src/trigger/scheduled-tasks.ts
// Fixed: Removed dailyReminder (not in schema), fixed SyncLog queries

import { schedules } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { SyncStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

// Weekly stats email (Mondays at 9 AM UTC)
export const weeklyStatsEmailTask = schedules.task({
  id: "weekly-stats-email",
  cron: "0 9 * * 1", // Monday 9 AM UTC
  maxDuration: 600, // 10 minutes
  run: async () => {
    logger.info("Starting weekly stats email task...");

    const users = await prisma.notificationPreferences.findMany({
      where: { 
        weeklyReport: true,
        emailEnabled: true,
      },
      include: { 
        user: { 
          select: { 
            id: true, 
            email: true, 
            name: true,
            currentStreak: true,
          } 
        } 
      },
    });

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const { user } of users) {
      if (!user.email) continue;

      try {
        // Get user's weekly stats
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        startOfWeek.setHours(0, 0, 0, 0);

        const stats = await prisma.trackerEntry.aggregate({
          where: {
            userId: user.id,
            date: { gte: startOfWeek },
          },
          _sum: {
            problemsSolved: true,
            commits: true,
            timeSpent: true,
          },
          _count: {
            id: true,
          },
        });

        const goalsCompleted = await prisma.goal.count({
          where: {
            userId: user.id,
            status: "COMPLETED",
            completedAt: { gte: startOfWeek },
          },
        });

        const totalProblems = stats._sum.problemsSolved ?? 0;
        const totalTime = stats._sum.timeSpent ?? 0;
        const totalCommits = stats._sum.commits ?? 0;

        // Send email
        await sendEmail({
          to: user.email,
          subject: "📊 Your Weekly Progress Report",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your Weekly Progress Report 📊</h2>
              <p>Hi ${user.name || "Coder"},</p>
              <p>Here's your progress summary for this week:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Problems Solved:</strong> ${totalProblems}</p>
                <p><strong>Commits Made:</strong> ${totalCommits}</p>
                <p><strong>Time Spent:</strong> ${Math.round(totalTime / 60)} hours</p>
                <p><strong>Goals Completed:</strong> ${goalsCompleted}</p>
                <p><strong>Current Streak:</strong> ${user.currentStreak} days 🔥</p>
              </div>
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Full Dashboard
              </a>
              <p>Keep up the great work! 🚀</p>
            </div>
          `,
        });

        successCount++;
        logger.debug(`Weekly email sent to ${user.email}`);
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ email: user.email, error: errorMessage });
        logger.error(`Failed to send weekly email to ${user.email}`, {}, error instanceof Error ? error : new Error(errorMessage));
      }
    }

    logger.info(`Weekly stats email task completed`, { successCount, failureCount });
    
    return { 
      usersNotified: successCount, 
      failures: failureCount,
      errors: errors.slice(0, 10),
    };
  },
});

// Goal reminder check (6 PM UTC daily)
export const goalReminderTask = schedules.task({
  id: "goal-reminder-check",
  cron: "0 18 * * *", // 6 PM UTC
  maxDuration: 600,
  run: async () => {
    logger.info("Starting goal reminder task...");

    // Find active goal reminders due now
    const now = new Date();
    const reminders = await prisma.goalReminder.findMany({
      where: {
        isActive: true,
        nextSendAt: { lte: now },
      },
      include: {
        goal: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const reminder of reminders) {
      if (!reminder.user.email || reminder.goal.status !== "ACTIVE") {
        continue;
      }

      try {
        const progress = Math.round(reminder.goal.progressPercentage);

        await sendEmail({
          to: reminder.user.email,
          subject: `⏰ Goal Reminder: ${reminder.goal.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Goal Reminder ⏰</h2>
              <p>Hi ${reminder.user.name || "there"},</p>
              <p>Don't forget about your goal:</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${reminder.goal.title}</h3>
                <p>Progress: ${progress}% (${reminder.goal.progress}/${reminder.goal.target})</p>
                ${reminder.goal.deadline ? `<p>Deadline: ${new Date(reminder.goal.deadline).toLocaleDateString()}</p>` : ""}
              </div>
              <a href="${process.env.NEXTAUTH_URL}/goals/${reminder.goal.id}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Update Progress
              </a>
            </div>
          `,
        });

        // Update reminder
        await prisma.goalReminder.update({
          where: { id: reminder.id },
          data: {
            lastSentAt: now,
            sendCount: { increment: 1 },
            nextSendAt: calculateNextSendTime(reminder),
          },
        });

        sent++;
      } catch (error) {
        failed++;
        logger.error(`Failed to send goal reminder`, { reminderId: reminder.id }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    logger.info(`Goal reminder task completed`, { sent, failed });
    return { remindersSent: sent, failures: failed };
  },
});

// Cleanup old sync logs (weekly on Sunday 3 AM UTC)
export const cleanupOldLogsTask = schedules.task({
  id: "cleanup-old-logs",
  cron: "0 3 * * 0", // Sunday 3 AM UTC
  maxDuration: 300,
  run: async () => {
    logger.info("Starting cleanup task...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete old successful sync logs (keep failed ones longer)
    const syncLogsDeleted = await prisma.syncLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: SyncStatus.SUCCESS,
      },
    });

    // Delete very old failed logs (90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldFailedLogsDeleted = await prisma.syncLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        status: SyncStatus.FAILED,
      },
    });

    // Clean up expired export jobs
    const expiredExportsDeleted = await prisma.exportJob.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Clean up old notifications (read ones older than 30 days)
    const oldNotificationsDeleted = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    logger.info(`Cleanup task completed`, {
      syncLogsDeleted: syncLogsDeleted.count,
      oldFailedLogsDeleted: oldFailedLogsDeleted.count,
      expiredExportsDeleted: expiredExportsDeleted.count,
      oldNotificationsDeleted: oldNotificationsDeleted.count,
    });

    return {
      syncLogsDeleted: syncLogsDeleted.count,
      oldFailedLogsDeleted: oldFailedLogsDeleted.count,
      expiredExportsDeleted: expiredExportsDeleted.count,
      oldNotificationsDeleted: oldNotificationsDeleted.count,
    };
  },
});

// Check for stale connections (daily at 4 AM UTC)
export const checkStaleConnectionsTask = schedules.task({
  id: "check-stale-connections",
  cron: "0 4 * * *", // 4 AM UTC daily
  maxDuration: 300,
  run: async () => {
    logger.info("Starting stale connections check...");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find connections that haven't synced in 7 days
    const staleConnections = await prisma.userPlatform.findMany({
      where: {
        isActive: true,
        autoSync: true,
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: sevenDaysAgo } },
        ],
      },
      include: {
        platform: { select: { name: true, slug: true } },
        user: { select: { email: true, name: true } },
      },
    });

    // Group by user for notification
    const userConnections = new Map<string, typeof staleConnections>();
    for (const conn of staleConnections) {
      const existing = userConnections.get(conn.userId) || [];
      existing.push(conn);
      userConnections.set(conn.userId, existing);
    }

    let notified = 0;

    for (const [userId, connections] of userConnections) {
      const user = connections[0].user;
      if (!user.email) continue;

      try {
        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId,
            type: "SYNC_FAILED",
            priority: "NORMAL",
            title: "Stale Platform Connections",
            message: `${connections.length} platform(s) haven't synced in over a week: ${connections.map(c => c.platform.name).join(", ")}`,
            actionUrl: "/settings/platforms",
            actionLabel: "Check Connections",
          },
        });
        notified++;
      } catch (error) {
        logger.error(`Failed to notify user about stale connections`, { userId }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    logger.info(`Stale connections check completed`, {
      staleCount: staleConnections.length,
      usersNotified: notified,
    });

    return {
      staleCount: staleConnections.length,
      usersAffected: userConnections.size,
      notificationsSent: notified,
    };
  },
});

// Streak check task (runs at midnight UTC)
export const streakCheckTask = schedules.task({
  id: "streak-check",
  cron: "5 0 * * *", // 12:05 AM UTC (slight offset to ensure day has rolled over)
  maxDuration: 600,
  run: async () => {
    logger.info("Starting streak check task...");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find users with active streaks who didn't have activity yesterday
    const usersWithStreaks = await prisma.user.findMany({
      where: {
        currentStreak: { gt: 0 },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    let streaksBroken = 0;
    let streaksAtRisk = 0;

    for (const user of usersWithStreaks) {
      // Check if user had activity yesterday
      const yesterdayActivity = await prisma.trackerEntry.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: yesterday,
            lt: today,
          },
        },
      });

      if (!yesterdayActivity) {
        // Break the streak
        const previousStreak = user.currentStreak;
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentStreak: 0,
            longestStreak: Math.max(user.longestStreak, previousStreak),
          },
        });

        // Record in streak history
        await prisma.streakHistory.create({
          data: {
            userId: user.id,
            startDate: new Date(yesterday.getTime() - (previousStreak - 1) * 24 * 60 * 60 * 1000),
            endDate: yesterday,
            length: previousStreak,
            isActive: false,
            isCurrent: false,
            endReason: "broken",
            totalProblems: 0, // Could calculate if needed
            totalCommits: 0,
          },
        });

        // Notify user if streak was significant
        if (previousStreak >= 7 && user.email) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "STREAK_BROKEN",
              priority: "HIGH",
              title: "Streak Broken 💔",
              message: `Your ${previousStreak}-day streak has ended. Don't worry, you can start a new one today!`,
              actionUrl: "/dashboard",
              actionLabel: "Start New Streak",
            },
          });
        }

        streaksBroken++;
      }
    }

    // Check for users at risk (no activity today yet, has streak)
    const todayEnd = new Date(today);
    todayEnd.setHours(18, 0, 0, 0); // 6 PM UTC - send warning

    if (new Date() >= todayEnd) {
      const atRiskUsers = await prisma.user.findMany({
        where: {
          currentStreak: { gte: 3 }, // Only warn for 3+ day streaks
          isActive: true,
        },
        select: { id: true, currentStreak: true },
      });

      for (const user of atRiskUsers) {
        const todayActivity = await prisma.trackerEntry.findFirst({
          where: {
            userId: user.id,
            date: { gte: today },
          },
        });

        if (!todayActivity) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "STREAK_AT_RISK",
              priority: "HIGH",
              title: "Streak at Risk! ⚠️",
              message: `Your ${user.currentStreak}-day streak will end if you don't log activity today!`,
              actionUrl: "/dashboard",
              actionLabel: "Log Activity",
            },
          });
          streaksAtRisk++;
        }
      }
    }

    logger.info(`Streak check completed`, { streaksBroken, streaksAtRisk });

    return { streaksBroken, streaksAtRisk };
  },
});

// Helper function to calculate next reminder send time
function calculateNextSendTime(reminder: { frequency: string; time: string; days: number[] }): Date {
  const [hours, minutes] = reminder.time.split(":").map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  switch (reminder.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "weekdays":
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      break;
    case "custom":
      if (reminder.days.length > 0) {
        do {
          next.setDate(next.getDate() + 1);
        } while (!reminder.days.includes(next.getDay()));
      } else {
        next.setDate(next.getDate() + 1);
      }
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}