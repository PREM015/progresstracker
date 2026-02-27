/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// api/reports/weekly/route.ts
// =============================================================================
// Description: Get weekly reports with auto-generation
// Methods: GET, OPTIONS
// Auth Required: Yes
// Rate Limit: 30 requests/minute
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
  week: z.string().regex(/^\d{4}-W\d{2}$/).optional(), // Format: 2024-W15
  year: z.coerce.number().int().min(2020).max(2030).optional(),
  autoGenerate: z.coerce.boolean().default(true),
});

// Helper to get week dates
function getWeekDates(weekString?: string, year?: number) {
  if (weekString) {
    const [yearStr, weekStr] = weekString.split('-W');
    const weekYear = parseInt(yearStr);
    const weekNum = parseInt(weekStr);
    
    const jan1 = new Date(weekYear, 0, 1);
    const daysToAdd = (weekNum - 1) * 7 - jan1.getDay() + 1;
    const weekStart = new Date(jan1.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    return { weekStart, weekEnd, weekString };
  }
  
  // Default to current week
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  const weekNum = Math.ceil((currentWeekStart.getDate() + new Date(currentWeekStart.getFullYear(), 0, 1).getDay()) / 7);
  const generatedWeekString = `${currentWeekStart.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  
  return { 
    weekStart: currentWeekStart, 
    weekEnd: currentWeekEnd, 
    weekString: generatedWeekString 
  };
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  try {
    // Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      30, 
      `weekly-reports:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(60, requestId);
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      week: searchParams.get('week'),
      year: searchParams.get('year'),
      autoGenerate: searchParams.get('autoGenerate'),
    });

    if (!queryValidation.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
    }

    const { week, autoGenerate } = queryValidation.data;
    const { weekStart, weekEnd, weekString } = getWeekDates(week);

    // Check for existing report
    let report = await prisma.report.findFirst({
      where: {
        userId: session.user.id,
        type: 'weekly',
        periodStart: weekStart,
        periodEnd: weekEnd,
      }
    });

    // Auto-generate if not exists and requested
    if (!report && autoGenerate) {
      // Get week's data
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: weekStart, lte: weekEnd }
        },
        orderBy: { date: 'asc' }
      });

      // Get previous week for comparison
      const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevWeekEnd = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const prevWeekStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: prevWeekStart, lte: prevWeekEnd }
        }
      });

      // Calculate current week stats
      const currentStats = {
        totalProblems: dailyStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: dailyStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalTimeSpent: dailyStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        daysActive: dailyStats.filter(s => s.hadActivity).length,
      };

      // Calculate previous week stats
      const prevStats = {
        totalProblems: prevWeekStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: prevWeekStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalTimeSpent: prevWeekStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        daysActive: prevWeekStats.filter(s => s.hadActivity).length,
      };

      // Calculate changes
      const changes = {
        problems: currentStats.totalProblems - prevStats.totalProblems,
        commits: currentStats.totalCommits - prevStats.totalCommits,
        timeSpent: currentStats.totalTimeSpent - prevStats.totalTimeSpent,
        daysActive: currentStats.daysActive - prevStats.daysActive,
      };

      // Generate insights
      const insights = [];
      
      if (changes.problems > 0) {
        insights.push(`📈 Solved ${changes.problems} more problems than last week!`);
      } else if (changes.problems < 0) {
        insights.push(`⚠️ Solved ${Math.abs(changes.problems)} fewer problems than last week.`);
      }
      
      if (currentStats.daysActive === 7) {
        insights.push('🔥 Perfect week! Active every day!');
      } else if (currentStats.daysActive >= 5) {
        insights.push('💪 Great consistency this week!');
      }

      const weekData = {
        stats: currentStats,
        previousWeek: prevStats,
        changes,
        dailyBreakdown: dailyStats.map(s => ({
          date: s.date.toISOString().split('T')[0],
          problems: s.totalProblems,
          commits: s.totalCommits,
          timeSpent: s.totalTimeSpent,
          hadActivity: s.hadActivity,
          dayOfWeek: s.date.toLocaleDateString('en', { weekday: 'long' })
        })),
        insights,
        weekNumber: weekString,
      };

      const title = `Week ${weekString} Report`;
      const summary = `Weekly summary: ${currentStats.totalProblems} problems solved, ${currentStats.totalCommits} commits, ${currentStats.daysActive}/7 days active.`;

      report = await prisma.report.create({
        data: {
          userId: session.user.id,
          type: 'weekly',
          periodStart: weekStart,
          periodEnd: weekEnd,
          title,
          summary,
          data: weekData,
          status: 'generated',
        }
      });
    }

    if (!report) {
      return apiResponse.notFound('Weekly report', requestId);
    }

    logger.info('Weekly report fetched', {
      requestId,
      userId: session.user.id,
      week: weekString,
      reportId: report.id
    });

    return apiResponse.success(report, { meta: { requestId } });

  } catch (error) {
    logger.error('GET weekly report failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch weekly report', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
