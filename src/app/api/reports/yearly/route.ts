/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/yearly/route.ts
// =============================================================================
// Description: Get yearly reports with comprehensive analytics
// Methods: GET, OPTIONS
// Auth Required: Yes
// Rate Limit: 10 requests/minute
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
  year: z.coerce.number().int().min(2020).max(2030).optional(),
  autoGenerate: z.coerce.boolean().default(true),
  includeMonthlyBreakdown: z.coerce.boolean().default(true),
  includeGoalsAnalysis: z.coerce.boolean().default(true),
  includeAchievements: z.coerce.boolean().default(true),
});

// Helper to get year dates
function getYearDates(year?: number) {
  const targetYear = year || new Date().getFullYear();
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59, 999);
  
  return { yearStart, yearEnd, year: targetYear };
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Stricter rate limiting for yearly reports (more expensive to generate)
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      10, 
      `yearly-reports:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(300, requestId); // 5 min timeout
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = querySchema.safeParse({
      year: searchParams.get('year'),
      autoGenerate: searchParams.get('autoGenerate'),
      includeMonthlyBreakdown: searchParams.get('includeMonthlyBreakdown'),
      includeGoalsAnalysis: searchParams.get('includeGoalsAnalysis'),
      includeAchievements: searchParams.get('includeAchievements'),
    });

    if (!queryValidation.success) {
      return apiResponse.validationError(
        'Invalid query parameters',
        queryValidation.error.errors,
        requestId
      );
    }

    const { 
      year, 
      autoGenerate, 
      includeMonthlyBreakdown, 
      includeGoalsAnalysis, 
      includeAchievements 
    } = queryValidation.data;
    
    const { yearStart, yearEnd, year: targetYear } = getYearDates(year);

    // Check for existing report
    let report = await prisma.report.findFirst({
      where: {
        userId: session.user.id,
        type: 'yearly',
        periodStart: yearStart,
        periodEnd: yearEnd,
      }
    });

    if (!report && autoGenerate) {
      logger.info('Generating yearly report', { 
        requestId, 
        userId: session.user.id, 
        year: targetYear 
      });

      // Get all daily stats for the year
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: yearStart, lte: yearEnd }
        },
        orderBy: { date: 'asc' }
      });

      // Get previous year for comparison
      const prevYearStart = new Date(targetYear - 1, 0, 1);
      const prevYearEnd = new Date(targetYear - 1, 11, 31, 23, 59, 59, 999);
      
      const prevYearStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: prevYearStart, lte: prevYearEnd }
        }
      });

      // Get all tracker entries for detailed analysis
      const trackerEntries = await prisma.trackerEntry.findMany({
        where: {
          userId: session.user.id,
          date: { gte: yearStart, lte: yearEnd }
        },
        include: {
          platform: {
            select: { name: true, category: true, slug: true }
          }
        }
      });

      // Get goals data if requested
      let goalsData = undefined;
      if (includeGoalsAnalysis) {
        const goals = await prisma.goal.findMany({
          where: {
            userId: session.user.id,
            OR: [
              {
                startDate: {
                  gte: yearStart,
                  lte: yearEnd
                }
              },
              {
                completedAt: {
                  gte: yearStart,
                  lte: yearEnd
                }
              }
            ]
          }
        });

        goalsData = {
          totalGoals: goals.length,
          completedGoals: goals.filter(g => g.status === 'COMPLETED').length,
          activeGoals: goals.filter(g => g.status === 'ACTIVE').length,
          failedGoals: goals.filter(g => g.status === 'FAILED').length,
          goals: goals.map(g => ({
            id: g.id,
            title: g.title,
            status: g.status,
            target: g.target,
            progress: g.progress,
            completedAt: g.completedAt,
            category: g.category
          }))
        };
      }

      // Get achievements if requested
      let achievementsData = undefined;
      if (includeAchievements) {
        const achievements = await prisma.userAchievement.findMany({
          where: {
            userId: session.user.id,
            unlockedAt: {
              gte: yearStart,
              lte: yearEnd
            }
          },
          include: {
            achievement: {
              select: {
                title: true,
                description: true,
                tier: true,
                points: true,
                category: true
              }
            }
          }
        });

        achievementsData = {
          totalUnlocked: achievements.length,
          totalPoints: achievements.reduce((sum, a) => sum + a.achievement.points, 0),
          byTier: achievements.reduce((acc, a) => {
            acc[a.achievement.tier] = (acc[a.achievement.tier] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byCategory: achievements.reduce((acc, a) => {
            acc[a.achievement.category] = (acc[a.achievement.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          achievements: achievements.map(a => ({
            title: a.achievement.title,
            description: a.achievement.description,
            tier: a.achievement.tier,
            points: a.achievement.points,
            unlockedAt: a.unlockedAt
          }))
        };
      }

      // Calculate yearly stats
      const yearStats = {
        totalProblems: dailyStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: dailyStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalPullRequests: dailyStats.reduce((sum, s) => sum + s.totalPullRequests, 0),
        totalTimeSpent: dailyStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        totalPoints: dailyStats.reduce((sum, s) => sum + s.totalPoints, 0),
        daysActive: dailyStats.filter(s => s.hadActivity).length,
        totalDays: dailyStats.length,
        averageProblemsPerDay: 0,
        averageTimePerDay: 0,
        longestStreak: 0,
        currentStreak: 0,
      };

      // Calculate averages
      if (yearStats.daysActive > 0) {
        yearStats.averageProblemsPerDay = Number((yearStats.totalProblems / yearStats.daysActive).toFixed(2));
        yearStats.averageTimePerDay = Number((yearStats.totalTimeSpent / yearStats.daysActive).toFixed(1));
      }

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      dailyStats.forEach((stat, index) => {
        if (stat.hadActivity) {
          tempStreak++;
          if (index === dailyStats.length - 1) {
            currentStreak = tempStreak;
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      });
      longestStreak = Math.max(longestStreak, tempStreak);
      
      yearStats.longestStreak = longestStreak;
      yearStats.currentStreak = currentStreak;

      // Previous year comparison
      const prevYearTotals = {
        totalProblems: prevYearStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: prevYearStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalTimeSpent: prevYearStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        daysActive: prevYearStats.filter(s => s.hadActivity).length,
      };

      // Platform analysis
      const platformStats: Record<string, any> = {};
      trackerEntries.forEach(entry => {
        const platform = entry.platform?.name || 'Manual Entry';
        if (!platformStats[platform]) {
          platformStats[platform] = {
            problems: 0,
            commits: 0,
            timeSpent: 0,
            category: entry.platform?.category || 'OTHER',
            entries: 0,
            avgProblemsPerEntry: 0,
          };
        }
        platformStats[platform].problems += entry.problemsSolved;
        platformStats[platform].commits += entry.commits;
        platformStats[platform].timeSpent += entry.timeSpent;
        platformStats[platform].entries += 1;
      });

      // Calculate averages for platforms
      Object.values(platformStats).forEach((stats: any) => {
        if (stats.entries > 0) {
          stats.avgProblemsPerEntry = Number((stats.problems / stats.entries).toFixed(2));
        }
      });

      // Monthly breakdown
      const monthlyBreakdown: any[] = [];
      if (includeMonthlyBreakdown) {
        for (let month = 0; month < 12; month++) {
          const monthStart = new Date(targetYear, month, 1);
          const monthEnd = new Date(targetYear, month + 1, 0, 23, 59, 59, 999);
          
          const monthStats = dailyStats.filter(s => 
            s.date >= monthStart && s.date <= monthEnd
          );

          monthlyBreakdown.push({
            month: month + 1,
            monthName: monthStart.toLocaleDateString('en', { month: 'long' }),
            problems: monthStats.reduce((sum, s) => sum + s.totalProblems, 0),
            commits: monthStats.reduce((sum, s) => sum + s.totalCommits, 0),
            timeSpent: monthStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
            daysActive: monthStats.filter(s => s.hadActivity).length,
            totalDays: monthStats.length,
          });
        }
      }

      // Generate comprehensive insights
      const insights = [];
      
      // Year in Review
      insights.push({
        type: 'summary',
        title: `${targetYear} Year in Review`,
        description: `You solved ${yearStats.totalProblems} problems across ${yearStats.daysActive} active days!`,
        metrics: {
          problems: yearStats.totalProblems,
          daysActive: yearStats.daysActive,
          consistency: Number(((yearStats.daysActive / yearStats.totalDays) * 100).toFixed(1))
        }
      });

      // Consistency Analysis
      const consistencyRate = (yearStats.daysActive / yearStats.totalDays) * 100;
      if (consistencyRate >= 70) {
        insights.push({
          type: 'achievement',
          title: 'Outstanding Consistency!',
          description: `You were active ${consistencyRate.toFixed(1)}% of the year. Incredible dedication!`,
          metric: consistencyRate
        });
      } else if (consistencyRate >= 50) {
        insights.push({
          type: 'good',
          title: 'Good Consistency',
          description: `${consistencyRate.toFixed(1)}% active days. Room to grow even stronger!`,
          metric: consistencyRate
        });
      }

      // Growth Analysis
      if (prevYearTotals.totalProblems > 0) {
        const growth = ((yearStats.totalProblems / prevYearTotals.totalProblems - 1) * 100);
        if (growth > 0) {
          insights.push({
            type: 'growth',
            title: 'Impressive Growth!',
            description: `${growth.toFixed(1)}% more problems solved than ${targetYear - 1}`,
            metric: growth
          });
        }
      }

      // Streak Achievement
      if (yearStats.longestStreak >= 30) {
        insights.push({
          type: 'streak',
          title: 'Streak Master!',
          description: `Your longest streak was ${yearStats.longestStreak} days. Amazing persistence!`,
          metric: yearStats.longestStreak
        });
      }

      // Top Platform
      const topPlatform = Object.entries(platformStats)
        .sort(([,a], [,b]) => (b as any).problems - (a as any).problems)[0];
      
      if (topPlatform) {
        insights.push({
          type: 'platform',
          title: 'Favorite Platform',
          description: `${topPlatform[0]} was your go-to with ${(topPlatform[1] as any).problems} problems solved`,
          platform: topPlatform[0],
          metric: (topPlatform[1] as any).problems
        });
      }

      // Best Month
      if (monthlyBreakdown.length > 0) {
        const bestMonth = monthlyBreakdown.reduce((best, current) => 
          current.problems > best.problems ? current : best
        );
        
        insights.push({
          type: 'month',
          title: 'Peak Performance',
          description: `${bestMonth.monthName} was your best month with ${bestMonth.problems} problems solved!`,
          month: bestMonth.monthName,
          metric: bestMonth.problems
        });
      }

      const yearData = {
        year: targetYear,
        stats: yearStats,
        previousYear: prevYearTotals,
        changes: {
          problems: yearStats.totalProblems - prevYearTotals.totalProblems,
          commits: yearStats.totalCommits - prevYearTotals.totalCommits,
          timeSpent: yearStats.totalTimeSpent - prevYearTotals.totalTimeSpent,
          daysActive: yearStats.daysActive - prevYearTotals.daysActive,
        },
        platformBreakdown: platformStats,
        monthlyBreakdown: includeMonthlyBreakdown ? monthlyBreakdown : undefined,
        goals: goalsData,
        achievements: achievementsData,
        insights,
        consistencyRate,
        generatedAt: new Date().toISOString(),
      };

      const title = `${targetYear} Annual Report`;
      const summary = `${targetYear} in numbers: ${yearStats.totalProblems} problems solved, ${yearStats.daysActive} active days, ${yearStats.longestStreak} day longest streak.`;

      report = await prisma.report.create({
        data: {
          userId: session.user.id,
          type: 'yearly',
          periodStart: yearStart,
          periodEnd: yearEnd,
          title,
          summary,
          data: yearData,
          status: 'generated',
        }
      });

      logger.info('Yearly report generated', {
        requestId,
        userId: session.user.id,
        year: targetYear,
        reportId: report.id,
        duration: Date.now() - startTime
      });
    }

    if (!report) {
      return apiResponse.notFound('Yearly report', requestId);
    }

    return apiResponse.success(report, { 
      meta: { 
        requestId,
        generationTime: Date.now() - startTime 
      } 
    });

  } catch (error) {
    logger.error('GET yearly report failed', { requestId }, error);
    return apiResponse.internalError('Failed to fetch yearly report', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';