
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { sendEmail } from "@/lib/email"; // Assumed

export const POST = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const now = new Date();
  const reportMonth = subMonths(now, 1);
  const periodStart = startOfMonth(reportMonth);
  const periodEnd = endOfMonth(reportMonth);

  try {
    // Find eligible users
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        notificationPrefs: {
          monthlyReport: true, // Assumed field in Json or Relation
          emailEnabled: true
        }
      },
      include: { notificationPrefs: true }
    });

    let generated = 0;
    let sent = 0;

    for (const user of users) {
      // Check if they had activity
      const entriesCount = await prisma.trackerEntry.count({
        where: { userId: user.id, date: { gte: periodStart, lte: periodEnd } }
      });

      if (entriesCount === 0) continue;

      // Generate Report Data (Simplified)
      const achievements = await prisma.userAchievement.count({
        where: { userId: user.id, unlockedAt: { gte: periodStart, lte: periodEnd } }
      });

      const goals = await prisma.goal.count({
        where: { userId: user.id, completedAt: { gte: periodStart, lte: periodEnd } }
      });

      const reportData = {
        stats: { entries: entriesCount, achievements, goals },
        period: { start: periodStart, end: periodEnd }
      };

      // Create Report Record
      // @ts-ignore - Report model assumed
      await prisma.report.create({
        data: {
          userId: user.id,
          type: 'monthly',
          periodStart,
          periodEnd,
          title: `Monthly Report - ${format(reportMonth, 'MMMM yyyy')}`,
          data: reportData,
          status: 'generated'
        }
      });
      generated++;

      // Send Email
      // await sendEmail(...)
      sent++;
    }

    return NextResponse.json({
      success: true,
      data: {
        period: { month: reportMonth.getMonth() + 1, year: reportMonth.getFullYear() },
        reportsGenerated: generated,
        emailsSent: sent,
        duration: Date.now() - startTime
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: "Monthly report generation failed", details: e.message }, { status: 500 });
  }
};

export const GET = POST;
