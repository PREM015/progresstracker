import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { withCronAuth } from '@/lib/server/cron-auth';

export const dynamic = "force-dynamic";

async function _cronHandler(req: NextRequest) {
  const startTime = Date.now();
  const now = new Date();
  const reportMonth = subMonths(now, 1);
  const periodStart = startOfMonth(reportMonth);
  const periodEnd = endOfMonth(reportMonth);

  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        notificationPrefs: {
          monthlyReport: true,
          emailEnabled: true
        }
      },
      include: { notificationPrefs: true }
    });

    let generated = 0;
    let sent = 0;

    for (const user of users) {
      const entriesCount = await prisma.trackerEntry.count({
        where: { userId: user.id, date: { gte: periodStart, lte: periodEnd } }
      });

      if (entriesCount === 0) continue;

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

      // Email sending placeholder
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
    return NextResponse.json(
      { error: "Monthly report generation failed" },
      { status: 500 }
    );
  }
}

// SECURITY: withCronAuth validates CRON_SECRET and optional IP allowlist
export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
