// src/workers/statsWorker.ts
import { Worker, Job } from 'bullmq';
import { connection } from '@/lib/bullmq';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { TrackerService } from '@/services/trackerService';
import { CacheService } from '@/services/cacheService';
import { CacheEnvelope } from '@/lib/withCache';
import { statsQueue } from '@/lib/queues/statsQueue';
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  format,
} from 'date-fns';

interface StatsJobData {
  userId: string;
  date: string; // ISO Date string
}

// ---------------------------------------------------------------------------
// Precompute and cache summary stats so API routes serve from Redis
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Precompute and cache summary stats so API routes serve from Redis
// ---------------------------------------------------------------------------
async function precomputeSummaryCache(userId: string): Promise<void> {
  const now = new Date();

  // 1. Precompute NEW Unified Dashboard Data (AnalyticsService)
  try {
    const { AnalyticsService } = await import('@/services/analyticsService');
    const dashboardData = await AnalyticsService.getDashboardData(userId);

    // Cache for the new /api/analytics/dashboard endpoint
    // Key: analytics:dashboard:{userId}
    // TTL: 5 min fresh, 5 min stale (same as route config)
    const dashboardEnvelope: CacheEnvelope = {
      data: {
        success: true,
        data: dashboardData,
        meta: {
          timestamp: new Date().toISOString(),
          source: 'worker-precompute',
        },
      },
      cachedAt: Date.now(),
      ttlMs: 300 * 1000,
      staleTtlMs: 300 * 1000,
    };

    await CacheService.set(`analytics:dashboard:${userId}`, dashboardEnvelope, 600);
    logger.debug(`Unified dashboard cache precomputed for user ${userId}`);
  } catch (err) {
    logger.error(`Failed to precompute Unified Dashboard for user ${userId}`, {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // 2. Precompute Legacy Stats (for backward compatibility / specific charts)
  // We keep this for now to avoid breaking /api/stats/* routes until they are fully deprecated
  const periodAgg = (gte: Date, lte: Date) =>
    prisma.trackerEntry.aggregate({
      where: { userId, date: { gte, lte } },
      _sum: { problemsSolved: true, commits: true, timeSpent: true },
      _count: true,
    });

  // Use allSettled so one failure doesn't block others
  const results = await Promise.allSettled([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalProblems: true,
        totalPoints: true,
        rank: true,
        lastActivityDate: true,
      },
    }),
    periodAgg(startOfDay(now), endOfDay(now)),
    periodAgg(startOfWeek(now), endOfWeek(now)),
    periodAgg(startOfMonth(now), endOfMonth(now)),
    prisma.userPlatform.count({ where: { userId, isActive: true } }),
    prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
  ]);

  // Extract values with fallbacks for rejected promises
  const val = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback;

  const emptyAgg = { _sum: { problemsSolved: 0, commits: 0, timeSpent: 0 }, _count: 0 };

  const user = val(results[0], null);
  const todayAgg = val(results[1], emptyAgg);
  const weekAgg = val(results[2], emptyAgg);
  const monthAgg = val(results[3], emptyAgg);
  const connectedPlatforms = val(results[4], 0);
  const activeGoals = val(results[5], 0);

  // Log any failures without aborting
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logger.warn(`precomputeSummaryCache query ${i} failed for user ${userId}`, {
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });

  const summary = {
    success: true,
    data: {
      cards: {
        totalProblems: { value: user?.totalProblems ?? 0 },
        currentStreak: { value: user?.currentStreak ?? 0 },
        todayProblems: { value: todayAgg._sum.problemsSolved ?? 0 },
        weeklyProblems: { value: weekAgg._sum.problemsSolved ?? 0 },
        monthlyProblems: { value: monthAgg._sum.problemsSolved ?? 0 },
        totalTime: { value: weekAgg._sum.timeSpent ?? 0 },
      },
      quickStats: {
        connectedPlatforms,
        activeGoals,
        totalPoints: user?.totalPoints ?? 0,
      },
      streakInfo: {
        current: user?.currentStreak ?? 0,
        longest: user?.longestStreak ?? 0,
        isAtRisk: (user?.currentStreak ?? 0) > 0 && todayAgg._count === 0,
        lastActivityDate: user?.lastActivityDate?.toISOString() ?? null,
      },
      todayProgress: {
        problems: todayAgg._sum.problemsSolved ?? 0,
        commits: todayAgg._sum.commits ?? 0,
        timeSpent: todayAgg._sum.timeSpent ?? 0,
        hasActivity: todayAgg._count > 0,
      },
      lastUpdated: now.toISOString(),
    },
  };

  // Cache summary + granular keys (hierarchical caching)
  const todayKey = format(now, 'yyyy-MM-dd');
  const weekKey = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthKey = format(startOfMonth(now), 'yyyy-MM-dd');

  const createEnvelope = (data: unknown) => ({
    data,
    cachedAt: Date.now(),
    ttlMs: 300 * 1000,       // 5 min fresh
    staleTtlMs: 300 * 1000,  // 5 min stale (total 10m persistence)
  });

  const redisTtl = 600; // 5m fresh + 5m stale

  await Promise.all([
    CacheService.set(`stats:dashboard:data:${userId}`, createEnvelope(summary), redisTtl),
    CacheService.set(`stats:daily:${userId}:${todayKey}`, createEnvelope(todayAgg), redisTtl),
    CacheService.set(`stats:weekly:${userId}:${weekKey}`, createEnvelope(weekAgg), redisTtl),
    CacheService.set(`stats:monthly:${userId}:${monthKey}`, createEnvelope(monthAgg), redisTtl),
  ]);
}

// ---------------------------------------------------------------------------
// Job Processor
// ---------------------------------------------------------------------------
const processStatsJob = async (job: Job<StatsJobData>) => {
  const { userId, date } = job.data;

  // Handle scheduler triggers (repeatable jobs)
  if (userId === '__scheduler__') {
    const { scheduleDailyBatch } = await import('./statsScheduler');
    await scheduleDailyBatch();
    return;
  }

  if (userId === '__scheduler_daily__') {
    const { scheduleDailyBatch } = await import('./statsScheduler');
    await scheduleDailyBatch();
    return;
  }

  const startTime = Date.now();

  logger.info(`Processing stats update for user ${userId} on ${date}`, {
    jobId: job.id,
    userId,
    date,
  });

  try {
    // Validate inputs
    if (!userId || !date) {
      throw new Error('Invalid job data: missing userId or date');
    }

    // Step 1: Update daily stats for user
    await TrackerService.processDailyStats(userId, new Date(date));

    // Step 2: Precompute and cache summary data (fire-and-forget-safe)
    try {
      await precomputeSummaryCache(userId);
      logger.debug(`Summary cache precomputed for user ${userId}`);
    } catch (cacheError) {
      // Cache precomputation failure should not fail the job
      logger.warn(`Summary cache precomputation failed for user ${userId}`, {
        error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
      });
    }

    logger.info(`Stats update completed for user ${userId} on ${date}`, {
      jobId: job.id,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error(`Stats update failed for job ${job.id}`, {
      jobId: job.id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
};

// Stats Worker Initialization
export const statsWorker = new Worker<StatsJobData>(
  'stats-precompute',
  processStatsJob,
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// Worker Event Listeners
statsWorker.on('completed', (job) => {
  logger.debug(`Stats job ${job.id} completed`);
});

statsWorker.on('failed', (job, err) => {
  logger.error(`Stats job ${job?.id} failed: ${err.message}`);
});

logger.info('Stats Worker initialized');
