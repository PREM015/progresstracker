/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/monthly/route.ts
// =============================================================================
// Description: Get monthly reports with detailed analytics
// Methods: GET, OPTIONS
// Auth Required: Yes
// Rate Limit: 20 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // Format: 2024-03
  autoGenerate: z.coerce.boolean().default(true),
  includeWeeklyBreakdown: z.coerce.boolean().default(true),
});

// Helper to get month dates
function getMonthDates(monthString?: string) {
  if (monthString) {
    const [year, month] = monthString.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return { monthStart, monthEnd, monthString };
  }
  
  // Default to current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const generatedMonthString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  return { monthStart, monthEnd, monthString: generatedMonthString };
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      20, 
      `monthly-reports:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(120, requestId);
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      month: searchParams.get('month'),
      autoGenerate: searchParams.get('autoGenerate'),
      includeWeeklyBreakdown: searchParams.get('includeWeeklyBreakdown'),
    });

    if (!queryValidation.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
    }

    const { month, autoGenerate, includeWeeklyBreakdown } = queryValidation.data;
    const { monthStart, monthEnd, monthString } = getMonthDates(month);

    // Check for existing report
    let report = await prisma.report.findFirst({
      where: {
        userId: session.user.id,
        type: 'monthly',
        periodStart: monthStart,
        periodEnd: monthEnd,
      }
    });

    if (!report && autoGenerate) {
      // Get month's daily stats
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: monthStart, lte: monthEnd }
        },
        orderBy: { date: 'asc' }
      });

      // Get previous month for comparison
      const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
      const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0, 23, 59, 59, 999);
      
      const prevMonthStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: prevMonthStart, lte: prevMonthEnd }
        }
      });

      // Get detailed tracker entries for platform analysis
      const trackerEntries = await prisma.trackerEntry.findMany({
        where: {
          userId: session.user.id,
          date: { gte: monthStart, lte: monthEnd }
        },
        include: {
          platform: {
            select: { name: true, category: true, slug: true }
          }
        }
      });

      // Calculate current month stats
      const currentStats = {
        totalProblems: dailyStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: dailyStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalTimeSpent: dailyStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        daysActive: dailyStats.filter(s => s.hadActivity).length,
        totalDays: dailyStats.length,
      };

      // Calculate previous month stats
      const prevStats = {
        totalProblems: prevMonthStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: prevMonthStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalTimeSpent: prevMonthStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        daysActive: prevMonthStats.filter(s => s.hadActivity).length,
      };

      // Platform breakdown
      const platformStats: Record<string, any> = {};
      trackerEntries.forEach(entry => {
        const platform = entry.platform?.name || 'Manual Entry';
        if (!platformStats[platform]) {
          platformStats[platform] = {
            problems: 0,
            commits: 0,
            timeSpent: 0,
            category: entry.platform?.category || 'OTHER',
            entries: 0
          };
        }
        platformStats[platform].problems += entry.problemsSolved;
        platformStats[platform].commits += entry.commits;
        platformStats[platform].timeSpent += entry.timeSpent;
        platformStats[platform].entries += 1;
      });

      // Weekly breakdown
      const weeklyBreakdown: any[] = [];
      if (includeWeeklyBreakdown) {
        const weeks = Math.ceil(dailyStats.length / 7);
        for (let i = 0; i < weeks; i++) {
          const weekStart = i * 7;
          const weekEnd = Math.min((i + 1) * 7, dailyStats.length);
          const weekStats = dailyStats.slice(weekStart, weekEnd);
          
          weeklyBreakdown.push({
            week: i + 1,
            startDate: weekStats[0]?.date,
            endDate: weekStats[weekStats.length - 1]?.date,
            problems: weekStats.reduce((sum, s) => sum + s.totalProblems, 0),
            commits: weekStats.reduce((sum, s) => sum + s.totalCommits, 0),
            timeSpent: weekStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
            daysActive: weekStats.filter(s => s.hadActivity).length,
            totalDays: weekStats.length,
          });
        }
      }

      // Generate advanced insights
      const insights = [];
      
      // Consistency analysis
      const consistencyRate = (currentStats.daysActive / currentStats.totalDays) * 100;
      if (consistencyRate >= 80) {
        insights.push({
          type: 'achievement',
          title: 'Exceptional Consistency!',
          description: `You were active ${consistencyRate.toFixed(1)}% of the month`,
          metric: consistencyRate
        });
      } else if (consistencyRate >= 60) {
        insights.push({
          type: 'good',
          title: 'Good Consistency',
          description: `Active ${consistencyRate.toFixed(1)}% of days. Aim for 80%+`,
          metric: consistencyRate
        });
      } else {
        insights.push({
          type: 'improvement',
          title: 'Room for Improvement',
          description: `Only ${consistencyRate.toFixed(1)}% active days. Try daily practice!`,
          metric: consistencyRate
        });
      }

      // Performance comparison
      if (currentStats.totalProblems > prevStats.totalProblems) {
        const improvement = ((currentStats.totalProblems / prevStats.totalProblems - 1) * 100);
        insights.push({
          type: 'growth',
          title: 'Growing Strong!',
          description: `${improvement.toFixed(1)}% more problems solved than last month`,
          metric: improvement
        });
      }

      // Top platform
      const topPlatform = Object.entries(platformStats)
        .sort(([,a], [,b]) => (b as any).problems - (a as any).problems)[0];
      
      if (topPlatform) {
        insights.push({
          type: 'platform',
          title: 'Top Platform',
          description: `${topPlatform[0]} - ${(topPlatform[1] as any).problems} problems solved`,
          platform: topPlatform[0]
        });
      }

      const monthData = {
        stats: currentStats,
        previousMonth: prevStats,
        changes: {
          problems: currentStats.totalProblems - prevStats.totalProblems,
          commits: currentStats.totalCommits - prevStats.totalCommits,
          timeSpent: currentStats.totalTimeSpent - prevStats.totalTimeSpent,
          daysActive: currentStats.daysActive - prevStats.daysActive,
        },
        platformBreakdown: platformStats,
        weeklyBreakdown: includeWeeklyBreakdown ? weeklyBreakdown : undefined,
        insights,
        monthName: monthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
        consistencyRate,
      };

      const title = `${monthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' })} Report`;
      const summary = `Monthly summary: ${currentStats.totalProblems} problems solved, ${currentStats.daysActive}/${currentStats.totalDays} days active (${consistencyRate.toFixed(1)}%).`;

      report = await prisma.report.create({
        data: {
          userId: session.user.id,
          type: 'monthly',
          periodStart: monthStart,
          periodEnd: monthEnd,
          title,
          summary,
          data: monthData,
          status: 'generated',
        }
      });
    }

    if (!report) {
      return apiResponse.notFound('Monthly report', requestId);
    }

    return apiResponse.success(report, { meta: { requestId } });

  } catch (error) {
    logger.error('GET monthly report failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch monthly report', requestId);
  }
}

export const dynamic = 'force-dynamic';