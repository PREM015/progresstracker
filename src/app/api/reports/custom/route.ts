/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// api/reports/custom/route.ts
// =============================================================================
// Description: Generate custom date range reports with flexible options
// Methods: POST, OPTIONS
// Auth Required: Yes
// Rate Limit: 15 requests/minute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';
import { PlatformCategory, AuditAction } from '@prisma/client';

const customReportSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  title: z.string().min(1).max(200).optional(),
  
  // Filters
  platforms: z.array(z.string()).optional(),
  categories: z.array(z.nativeEnum(PlatformCategory)).optional(),
  
  // Report options
  includeCharts: z.boolean().default(true),
  includeComparisons: z.boolean().default(false),
  includeInsights: z.boolean().default(true),
  includePlatformBreakdown: z.boolean().default(true),
  includeTimeAnalysis: z.boolean().default(true),
  includeGoalProgress: z.boolean().default(false),
  
  // Comparison period (optional)
  comparisonPeriodStart: z.string().datetime().optional(),
  comparisonPeriodEnd: z.string().datetime().optional(),
  
  // Grouping options
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  
  // Advanced options
  excludeWeekends: z.boolean().default(false),
  minimumActivityThreshold: z.number().int().min(0).default(0),
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    // Rate limiting
    const rateLimitResult = await checkLimit(
      apiRateLimiter, 
      15, 
      `custom-reports:${session.user.id}`
    );

    if (!rateLimitResult.success) {
      return apiResponse.rateLimited(240, requestId); // 4 min timeout
    }

    // Check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscription: {
          select: { 
            tier: true, 
            exportLimitMonthly: true, 
            currentExportCount: true,
            usageResetAt: true 
          }
        }
      }
    });

    const subscription = user?.subscription;
    
    // Check monthly limits
    if (subscription) {
      const now = new Date();
      if (subscription.usageResetAt && subscription.usageResetAt < now) {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: { 
            currentExportCount: 0,
            usageResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          }
        });
        subscription.currentExportCount = 0;
      }

      if (subscription.currentExportCount >= subscription.exportLimitMonthly) {
        return apiResponse.forbidden('Monthly custom report limit exceeded', requestId);
      }
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = customReportSchema.safeParse(body);

    if (!validation.success) {
      return apiResponse.validationError(
        'Invalid custom report configuration',
        validation.error.errors,
        requestId
      );
    }

    const config = validation.data;
    const periodStart = new Date(config.periodStart);
    const periodEnd = new Date(config.periodEnd);

    // Validate date range
    if (periodEnd <= periodStart) {
      return apiResponse.validationError(
        'End date must be after start date',
        [{ path: ['periodEnd'], message: 'Must be after periodStart' }],
        requestId
      );
    }

    // Check maximum date range (e.g., 2 years for custom reports)
    const maxDays = subscription?.tier === 'FREE' ? 90 : 730; // 3 months for free, 2 years for paid
    const diffDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > maxDays) {
      return apiResponse.validationError(
        `Date range too large. Maximum ${maxDays} days allowed for your subscription`,
        [{ path: ['periodEnd'], message: `Date range exceeds ${maxDays} days` }],
        requestId
      );
    }

    // Validate comparison period if provided
    let comparisonPeriodStart: Date | undefined;
    let comparisonPeriodEnd: Date | undefined;
    
    if (config.comparisonPeriodStart && config.comparisonPeriodEnd) {
      comparisonPeriodStart = new Date(config.comparisonPeriodStart);
      comparisonPeriodEnd = new Date(config.comparisonPeriodEnd);
      
      if (comparisonPeriodEnd <= comparisonPeriodStart) {
        return apiResponse.validationError(
          'Comparison end date must be after start date',
          [{ path: ['comparisonPeriodEnd'], message: 'Must be after comparisonPeriodStart' }],
          requestId
        );
      }
    }

    // Build base query filters
    const baseWhere: any = {
      userId: session.user.id,
      date: { gte: periodStart, lte: periodEnd }
    };

    if (config.platforms && config.platforms.length > 0) {
      baseWhere.platform = { slug: { in: config.platforms } };
    }

    if (config.categories && config.categories.length > 0) {
      baseWhere.category = { in: config.categories };
    }

    if (config.excludeWeekends) {
      // This would require a raw query or post-processing to exclude weekends
      // For now, we'll handle it in post-processing
    }

    // Get main period data
    const [dailyStats, trackerEntries] = await Promise.all([
      prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: periodStart, lte: periodEnd }
        },
        orderBy: { date: 'asc' }
      }),
      
      prisma.trackerEntry.findMany({
        where: baseWhere,
        include: {
          platform: {
            select: { name: true, category: true, slug: true }
          }
        },
        orderBy: { date: 'asc' }
      })
    ]);

    // Apply weekend filtering if requested
    let filteredDailyStats = dailyStats;
    let filteredTrackerEntries = trackerEntries;

    if (config.excludeWeekends) {
      filteredDailyStats = dailyStats.filter(s => {
        const dayOfWeek = s.date.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
      });
      
      filteredTrackerEntries = trackerEntries.filter(e => {
        const dayOfWeek = e.date.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      });
    }

    // Apply minimum activity threshold
    if (config.minimumActivityThreshold > 0) {
      filteredDailyStats = filteredDailyStats.filter(s => 
        s.totalProblems >= config.minimumActivityThreshold
      );
      
      filteredTrackerEntries = filteredTrackerEntries.filter(e => 
        e.problemsSolved >= config.minimumActivityThreshold
      );
    }

    // Calculate main period statistics
    const mainStats = {
      totalProblems: filteredDailyStats.reduce((sum, s) => sum + s.totalProblems, 0),
      totalCommits: filteredDailyStats.reduce((sum, s) => sum + s.totalCommits, 0),
      totalPullRequests: filteredDailyStats.reduce((sum, s) => sum + s.totalPullRequests, 0),
      totalTimeSpent: filteredDailyStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
      totalPoints: filteredDailyStats.reduce((sum, s) => sum + s.totalPoints, 0),
      daysActive: filteredDailyStats.filter(s => s.hadActivity).length,
      totalDays: filteredDailyStats.length,
    };

    // Platform breakdown
    const platformBreakdown: Record<string, any> = {};
    if (config.includePlatformBreakdown) {
      filteredTrackerEntries.forEach(entry => {
        const platform = entry.platform?.name || 'Manual Entry';
        if (!platformBreakdown[platform]) {
          platformBreakdown[platform] = {
            problems: 0,
            commits: 0,
            timeSpent: 0,
            category: entry.platform?.category || 'OTHER',
            entries: 0,
            averageProblems: 0,
            efficiency: 0, // problems per hour
          };
        }
        const pStats = platformBreakdown[platform];
        pStats.problems += entry.problemsSolved;
        pStats.commits += entry.commits;
        pStats.timeSpent += entry.timeSpent;
        pStats.entries += 1;
      });

      // Calculate platform efficiency metrics
      Object.values(platformBreakdown).forEach((stats: any) => {
        if (stats.entries > 0) {
          stats.averageProblems = Number((stats.problems / stats.entries).toFixed(2));
          if (stats.timeSpent > 0) {
            stats.efficiency = Number((stats.problems / (stats.timeSpent / 60)).toFixed(2)); // problems per hour
          }
        }
      });
    }

    // Time analysis
    let timeAnalysis: any = undefined;
    if (config.includeTimeAnalysis) {
      // Group by hour of day to find peak performance times
      const hourlyData: Record<number, { problems: number; entries: number }> = {};
      
      filteredTrackerEntries.forEach(entry => {
        const hour = entry.date.getHours();
        if (!hourlyData[hour]) {
          hourlyData[hour] = { problems: 0, entries: 0 };
        }
        hourlyData[hour].problems += entry.problemsSolved;
        hourlyData[hour].entries += 1;
      });

      // Find peak hours
      const peakHour = Object.entries(hourlyData)
        .sort(([,a], [,b]) => b.problems - a.problems)[0];

      timeAnalysis = {
        totalHours: Math.round(mainStats.totalTimeSpent / 60),
        averageSessionTime: filteredTrackerEntries.length > 0 ? 
          Math.round(mainStats.totalTimeSpent / filteredTrackerEntries.length) : 0,
        peakHour: peakHour ? {
          hour: parseInt(peakHour[0]),
          problems: peakHour[1].problems,
          entries: peakHour[1].entries
        } : null,
        hourlyDistribution: hourlyData,
        efficiency: mainStats.totalTimeSpent > 0 ? 
          Number((mainStats.totalProblems / (mainStats.totalTimeSpent / 60)).toFixed(2)) : 0
      };
    }

    // Grouped data (day/week/month)
    let groupedData: any[] = [];
    if (config.includeCharts) {
      switch (config.groupBy) {
        case 'day':
          groupedData = filteredDailyStats.map(s => ({
            period: s.date.toISOString().split('T')[0],
            problems: s.totalProblems,
            commits: s.totalCommits,
            timeSpent: s.totalTimeSpent,
            hadActivity: s.hadActivity
          }));
          break;
          
        case 'week':
          // Group by weeks
          const weeklyData: Record<string, any> = {};
          filteredDailyStats.forEach(s => {
            const weekStart = new Date(s.date);
            weekStart.setDate(s.date.getDate() - s.date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = {
                period: weekKey,
                problems: 0,
                commits: 0,
                timeSpent: 0,
                daysActive: 0,
                totalDays: 0
              };
            }
            
            weeklyData[weekKey].problems += s.totalProblems;
            weeklyData[weekKey].commits += s.totalCommits;
            weeklyData[weekKey].timeSpent += s.totalTimeSpent;
            weeklyData[weekKey].totalDays += 1;
            if (s.hadActivity) weeklyData[weekKey].daysActive += 1;
          });
          groupedData = Object.values(weeklyData);
          break;
          
        case 'month':
          // Group by months
          const monthlyData: Record<string, any> = {};
          filteredDailyStats.forEach(s => {
            const monthKey = `${s.date.getFullYear()}-${(s.date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                period: monthKey,
                problems: 0,
                commits: 0,
                timeSpent: 0,
                daysActive: 0,
                totalDays: 0
              };
            }
            
            monthlyData[monthKey].problems += s.totalProblems;
            monthlyData[monthKey].commits += s.totalCommits;
            monthlyData[monthKey].timeSpent += s.totalTimeSpent;
            monthlyData[monthKey].totalDays += 1;
            if (s.hadActivity) monthlyData[monthKey].daysActive += 1;
          });
          groupedData = Object.values(monthlyData);
          break;
      }
    }

    // Comparison data
    let comparisonData: any = undefined;
    if (config.includeComparisons && comparisonPeriodStart && comparisonPeriodEnd) {
      const comparisonStats = await prisma.dailyStats.findMany({
        where: {
          userId: session.user.id,
          date: { gte: comparisonPeriodStart, lte: comparisonPeriodEnd }
        }
      });

      const comparisonTotals = {
        totalProblems: comparisonStats.reduce((sum, s) => sum + s.totalProblems, 0),
        totalCommits: comparisonStats.reduce((sum, s) => sum + s.totalCommits, 0),
        totalTimeSpent: comparisonStats.reduce((sum, s) => sum + s.totalTimeSpent, 0),
        daysActive: comparisonStats.filter(s => s.hadActivity).length,
        totalDays: comparisonStats.length,
      };

      comparisonData = {
        period: {
          start: comparisonPeriodStart.toISOString(),
          end: comparisonPeriodEnd.toISOString()
        },
        stats: comparisonTotals,
        changes: {
          problems: mainStats.totalProblems - comparisonTotals.totalProblems,
          commits: mainStats.totalCommits - comparisonTotals.totalCommits,
          timeSpent: mainStats.totalTimeSpent - comparisonTotals.totalTimeSpent,
          daysActive: mainStats.daysActive - comparisonTotals.daysActive,
        }
      };
    }

    // Goal progress
    let goalProgress: any = undefined;
    if (config.includeGoalProgress) {
      const goals = await prisma.goal.findMany({
        where: {
          userId: session.user.id,
          OR: [
            {
              startDate: { lte: periodEnd },
              deadline: { gte: periodStart }
            },
            {
              startDate: { gte: periodStart, lte: periodEnd }
            }
          ]
        }
      });

      goalProgress = goals.map(goal => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        target: goal.target,
        progress: goal.progress,
        progressPercentage: goal.progressPercentage,
        startDate: goal.startDate,
        deadline: goal.deadline,
        completedAt: goal.completedAt,
        category: goal.category
      }));
    }

    // Generate insights
    const insights = [];
    
    if (config.includeInsights) {
      // Activity consistency
      const consistencyRate = mainStats.totalDays > 0 ? 
        (mainStats.daysActive / mainStats.totalDays) * 100 : 0;
      
      insights.push({
        type: 'consistency',
        title: 'Activity Consistency',
        description: `You were active ${consistencyRate.toFixed(1)}% of the time`,
        metric: consistencyRate
      });

      // Peak performance
      if (timeAnalysis?.peakHour) {
        const hour = timeAnalysis.peakHour.hour;
        const timeStr = hour < 12 ? `${hour}:00 AM` : 
                      hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
        insights.push({
          type: 'peak',
          title: 'Peak Performance Time',
          description: `Most productive around ${timeStr}`,
          metric: timeAnalysis.peakHour.problems
        });
      }

      // Top platform
      if (Object.keys(platformBreakdown).length > 0) {
        const topPlatform = Object.entries(platformBreakdown)
          .sort(([,a], [,b]) => (b as any).problems - (a as any).problems)[0];
        
        insights.push({
          type: 'platform',
          title: 'Most Used Platform',
          description: `${topPlatform[0]} - ${(topPlatform[1] as any).problems} problems solved`,
          platform: topPlatform[0],
          metric: (topPlatform[1] as any).problems
        });
      }

      // Efficiency insight
      if (timeAnalysis?.efficiency && timeAnalysis.efficiency > 0) {
        insights.push({
          type: 'efficiency',
          title: 'Problem-Solving Efficiency',
          description: `${timeAnalysis.efficiency} problems solved per hour`,
          metric: timeAnalysis.efficiency
        });
      }
    }

    // Create the report
    const reportData = {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        days: diffDays
      },
      filters: {
        platforms: config.platforms,
        categories: config.categories,
        excludeWeekends: config.excludeWeekends,
        minimumActivityThreshold: config.minimumActivityThreshold
      },
      stats: mainStats,
      platformBreakdown: config.includePlatformBreakdown ? platformBreakdown : undefined,
      timeAnalysis,
      groupedData: config.includeCharts ? groupedData : undefined,
      comparison: comparisonData,
      goalProgress,
      insights: config.includeInsights ? insights : undefined,
      metadata: {
        generatedAt: new Date().toISOString(),
        groupBy: config.groupBy,
        requestId
      }
    };

    const title = config.title || 
      `Custom Report (${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()})`;
    
    const summary = `Custom report: ${mainStats.totalProblems} problems solved over ${diffDays} days, ${mainStats.daysActive} active days (${((mainStats.daysActive / mainStats.totalDays) * 100).toFixed(1)}% consistency).`;

    const report = await prisma.report.create({
      data: {
        userId: session.user.id,
        type: 'custom',
        periodStart,
        periodEnd,
        title,
        summary,
        data: reportData,
        status: 'generated',
      }
    });

    // Update subscription usage
    if (subscription) {
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: { currentExportCount: { increment: 1 } }
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: AuditAction.CREATE,
        category: 'reports',
        entityType: 'report',
        entityId: report.id,
        description: `Generated custom report (${diffDays} days)`,
        newValue: { 
          type: 'custom', 
          periodStart, 
          periodEnd,
          filters: config.platforms || config.categories ? {
            platforms: config.platforms,
            categories: config.categories
          } : undefined
        },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent'),
      }
    });

    logger.info('Custom report generated', {
      requestId,
      userId: session.user.id,
      reportId: report.id,
      periodDays: diffDays,
      duration: Date.now() - startTime
    });

    return apiResponse.created(report, { 
      meta: { 
        requestId,
        generationTime: Date.now() - startTime 
      } 
    });

  } catch (error) {
    logger.error('POST custom report failed', { requestId }, error);
    return apiResponse.internalError('Failed to generate custom report', requestId);
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';