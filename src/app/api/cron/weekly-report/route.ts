// =============================================================================
// cron/weekly-report/route.ts — Generate and send weekly reports
// SECURITY: Protected by withCronAuth
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/server/cron-auth';
import { startOfWeek, endOfWeek, subWeeks, getWeek } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function _cronHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const result = { usersProcessed: 0, reportsGenerated: 0, emailsSent: 0, errors: 0 };

  try {
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const weekNumber = getWeek(lastWeekStart);
    const year = lastWeekStart.getFullYear();

    // Get users who want weekly reports (paginated)
    const BATCH_SIZE = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          email: { not: null },
          notificationPrefs: {
            enabled: true,
            emailEnabled: true,
            weeklyReport: true,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          currentStreak: true,
          longestStreak: true,
          rank: true,
        },
        skip: offset,
        take: BATCH_SIZE,
      });

      if (users.length < BATCH_SIZE) hasMore = false;
      offset += BATCH_SIZE;

      for (const user of users) {
        result.usersProcessed++;

        try {
          // Get last week's tracker entries
          const entries = await prisma.trackerEntry.findMany({
            where: { userId: user.id, date: { gte: lastWeekStart, lte: lastWeekEnd } },
            include: { platform: { select: { name: true, icon: true } } },
          });

          const problemsSolved = entries.reduce((s: number, e: any) => s + (e.problemsSolved || 0), 0);
          const commits = entries.reduce((s: number, e: any) => s + (e.commits || 0), 0);
          const timeSpent = entries.reduce((s: number, e: any) => s + (e.timeSpent || 0), 0);
          const points = entries.reduce((s: number, e: any) => s + (e.points || 0), 0);

          // Get prior week for comparison
          const priorStart = startOfWeek(subWeeks(lastWeekStart, 1), { weekStartsOn: 1 });
          const priorEnd = endOfWeek(subWeeks(lastWeekStart, 1), { weekStartsOn: 1 });
          const priorEntries = await prisma.trackerEntry.findMany({
            where: { userId: user.id, date: { gte: priorStart, lte: priorEnd } },
          });

          const priorProblems = priorEntries.reduce((s: number, e: any) => s + (e.problemsSolved || 0), 0);
          const priorCommits = priorEntries.reduce((s: number, e: any) => s + (e.commits || 0), 0);
          const priorTime = priorEntries.reduce((s: number, e: any) => s + (e.timeSpent || 0), 0);

          const calcChange = (curr: number, prev: number) =>
            prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

          // Get goals completed last week
          const goalsCompleted = await prisma.goal.count({
            where: { userId: user.id, status: 'COMPLETED', completedAt: { gte: lastWeekStart, lte: lastWeekEnd } },
          });
          const totalGoals = await prisma.goal.count({ where: { userId: user.id, status: 'ACTIVE' } });

          // Platform stats
          const platformMap = new Map<string, { icon: string; count: number }>();
          for (const e of entries) {
            const name = e.platform?.name || 'Other';
            const icon = e.platform?.icon || '🔗';
            const existing = platformMap.get(name) || { icon, count: 0 };
            platformMap.set(name, { ...existing, count: existing.count + e.problemsSolved + e.commits });
          }
          const platformStats = Array.from(platformMap.entries()).slice(0, 5).map(([name, data]) => ({
            name,
            icon: data.icon,
            value: data.count,
            label: 'activities',
          }));

          // Save report to DB
          const report = await prisma.report.create({
            data: {
              userId: user.id,
              type: 'weekly',
              periodStart: lastWeekStart,
              periodEnd: lastWeekEnd,
              title: `Week ${weekNumber} Report`,
              summary: `You solved ${problemsSolved} problems and made ${commits} commits this week.`,
              status: 'generated',
              data: { problemsSolved, commits, timeSpent, points } as never,
            },
          });
          result.reportsGenerated++;

          // Send email
          if (user.email) {
            const { emailService } = await import('@/lib/email');
            await emailService.sendWeeklyReport(user.email, {
              userName: user.name || 'there',
              weekNumber,
              year,
              stats: {
                problemsSolved,
                problemsChange: calcChange(problemsSolved, priorProblems),
                commits,
                commitsChange: calcChange(commits, priorCommits),
                timeSpent,
                timeChange: calcChange(timeSpent, priorTime),
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                goalsCompleted,
                goalsTotal: totalGoals,
                rank: user.rank ?? undefined,
              },
              platformStats,
            });
            result.emailsSent++;
          }
        } catch (userErr) {
          result.errors++;
          logger.error('Weekly report failed for user', { userId: user.id }, userErr);
        }
      }
    }

    logger.info('Weekly report cron completed', { ...result, duration: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      data: { ...result, duration: Date.now() - startTime, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('Weekly report cron failed', {}, error);
    return NextResponse.json({ error: 'Weekly report job failed' }, { status: 500 });
  }
}

export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
