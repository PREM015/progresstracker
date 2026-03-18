// @ts-nocheck
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ScraperFactory, StubScraper } from './scrapers';
import { nanoid } from 'nanoid';
import { Prisma, SyncStatus, NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationService } from './notificationService';
import { CacheService } from './cacheService';
import { StatsService } from './statsService';
import { analyticsAggregationService } from './analyticsAggregationService';
import { scraperTask } from '@/trigger/scraper-task';

// =============================================================================
// TYPES
// =============================================================================

interface SyncOptions {
  platformIds?: string[];
  force?: boolean;
  priority?: 'high' | 'normal' | 'low';
  triggeredBy?: 'manual' | 'scheduled' | 'webhook' | 'system';
}

interface SyncJobResult {
  jobId: string;
  platformCount: number;
  successCount: number;
  failCount: number;
  skippedCount: number;
  results: PlatformSyncResult[];
  duration: number;
}

interface PlatformSyncResult {
  platformId: string;
  platformSlug: string;
  platformName: string;
  success: boolean;
  status: SyncStatus;
  entriesAdded: number;
  entriesUpdated: number;
  entriesSkipped: number;
  duration: number;
  error?: string;
}

interface SyncHistoryOptions {
  platformId?: string;
  status?: SyncStatus;
  limit?: number;
  offset?: number;
}

type OAuthCredentials = {
  access_token?: string;
  token?: string;
  accessToken?: string;
  refresh_token?: string;
  expires_at?: string;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractToken(credentials: unknown): string {
  if (!credentials) return '';

  try {
    const parsed = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
    if (!isObject(parsed)) return '';

    const creds = parsed as OAuthCredentials;
    return creds.access_token || creds.token || creds.accessToken || '';
  } catch {
    return '';
  }
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

// =============================================================================
// SYNC SERVICE CLASS
// =============================================================================

export class SyncService {
  // ===========================================================================
  // MAIN SYNC METHODS
  // ===========================================================================

  /**
   * Sync all platforms for a user
   */
  static async syncAllPlatforms(
    userId: string,
    options: SyncOptions = {}
  ): Promise<SyncJobResult> {
    const jobId = nanoid();
    const startTime = Date.now();
    const {
      platformIds,
      force: forceOption = false,
      triggeredBy = 'manual'
    } = options;
    // Manual syncs always bypass the cooldown to ensure fresh data
    const force = forceOption || triggeredBy === 'manual';

    logger.info(`Starting sync job ${jobId} for user ${userId}`, {
      userId,
      jobId,
      platformIds,
      force
    });

    // Get user's connected platforms
    const whereClause: Prisma.UserPlatformWhereInput = {
      userId,
      isActive: true,
    };

    // Filter by specific platforms if provided
    if (platformIds && platformIds.length > 0) {
      whereClause.platformId = { in: platformIds };
    }

    // Skip recently synced unless force
    if (!force) {
      const recentThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      whereClause.OR = [
        { lastSyncedAt: null },
        { lastSyncedAt: { lt: recentThreshold } },
      ];
    }

    const userPlatforms = await prisma.userPlatform.findMany({
      where: whereClause,
      include: {
        platform: {
          select: {
            id: true,
            slug: true,
            name: true,
            syncInterval: true,
            category: true,
          }
        },
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: [
        { syncPriority: 'desc' },
        { lastSyncedAt: 'asc' },
      ],
    });

    if (userPlatforms.length === 0) {
      logger.info(`No platforms to sync for user ${userId}`);
      return {
        jobId,
        platformCount: 0,
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        results: [],
        duration: Date.now() - startTime,
      };
    }

    const results: PlatformSyncResult[] = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // Process platforms sequentially to avoid rate limiting
    for (const userPlatform of userPlatforms) {
      const platformSlug = userPlatform.platform.slug;

      // Check if scraper is available and working
      if (!ScraperFactory.hasScraper(platformSlug)) {
        logger.debug(`No scraper for platform ${platformSlug}, skipping`);
        skippedCount++;
        results.push({
          platformId: userPlatform.platformId,
          platformSlug,
          platformName: userPlatform.platform.name,
          success: false,
          status: SyncStatus.CANCELLED,
          entriesAdded: 0,
          entriesUpdated: 0,
          entriesSkipped: 0,
          duration: 0,
          error: 'No scraper available for this platform',
        });
        continue;
      }

      if (!ScraperFactory.isScraperWorking(platformSlug)) {
        logger.debug(`Scraper for ${platformSlug} is not working, skipping`);
        skippedCount++;
        results.push({
          platformId: userPlatform.platformId,
          platformSlug,
          platformName: userPlatform.platform.name,
          success: false,
          status: SyncStatus.CANCELLED,
          entriesAdded: 0,
          entriesUpdated: 0,
          entriesSkipped: 0,
          duration: 0,
          error: 'Auto-sync not available for this platform',
        });
        continue;
      }

      // Check for too many consecutive failures
      if (userPlatform.consecutiveFailures >= 5 && !force) {
        logger.debug(`Platform ${platformSlug} has too many failures, skipping`);
        skippedCount++;
        continue;
      }

      try {
        const result = await this.syncPlatform(
          userId,
          userPlatform.platformId,
          { triggeredBy }
        );

        if ('queued' in result) {
          // Handle queued job (mostly for syncAllPlatforms if it ever uses async: true)
          // For now, sequentially we expect PlatformSyncResult
          results.push({
            platformId: userPlatform.platformId,
            platformSlug,
            platformName: userPlatform.platform.name,
            success: true,
            status: SyncStatus.IN_PROGRESS,
            entriesAdded: 0,
            entriesUpdated: 0,
            entriesSkipped: 0,
            duration: 0,
          });
          successCount++;
        } else {
          results.push(result);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        }
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        results.push({
          platformId: userPlatform.platformId,
          platformSlug,
          platformName: userPlatform.platform.name,
          success: false,
          status: SyncStatus.FAILED,
          entriesAdded: 0,
          entriesUpdated: 0,
          entriesSkipped: 0,
          duration: 0,
          error: errorMessage,
        });

        logger.error(`Failed to sync ${platformSlug}`, { userId, platformSlug },
          error instanceof Error ? error : new Error(errorMessage)
        );
      }

      // Small delay between platforms to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Final recalculation of all stats after the entire job is done
    await StatsService.recalculateUserStats(userId).catch(() => { });

    const duration = Date.now() - startTime;

    return {
      jobId,
      platformCount: userPlatforms.length,
      successCount,
      failCount,
      skippedCount,
      results,
      duration,
    };
  }

  /**
   * Sync a specific platform for a user
   */
  static async syncPlatform(
    userId: string,
    platformId: string,
    options: { triggeredBy?: string; async?: boolean } = {}
  ): Promise<PlatformSyncResult | { queued: boolean; jobId: string }> {
    const { triggeredBy = 'manual', async = false } = options;

    if (!async) {
      return this.internalSync(userId, platformId, { triggeredBy });
    }
    // Async execution via Trigger.dev
    try {
      const userPlatform = await prisma.userPlatform.findUnique({
        where: { userId_platformId: { userId, platformId } },
        include: { platform: { select: { slug: true } } },
      });

      if (!userPlatform) throw new Error('Platform not connected');

      const platformSlug = userPlatform.platform.slug;
      const isHeavy = ScraperFactory.isHeavy(platformSlug);

      const handle = await scraperTask.trigger({
        userId,
        platformId,
        userPlatformId: userPlatform.id,
        triggeredBy,
        weight: isHeavy ? 'heavy' : (triggeredBy === 'manual' ? 'priority' : 'light'),
      });

      return { queued: true, jobId: handle.id };
    } catch (error) {
      logger.error('Failed to trigger scraper task', { userId, platformId, error });
      throw error;
    }
  }

  /**
   * Internal core sync logic (Scraping + Processing)
   */
  static async internalSync(
    userId: string,
    platformId: string,
    options: { triggeredBy?: string } = {}
  ): Promise<PlatformSyncResult> {
    const { triggeredBy = 'manual' } = options;
    const startTime = Date.now();

    // Get user platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { platform: true },
    });

    if (!userPlatform) {
      throw new Error('Platform not connected');
    }

    const { platform } = userPlatform;
    const platformSlug = platform.slug;

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId,
        userPlatformId: userPlatform.id,
        status: SyncStatus.IN_PROGRESS,
        triggeredBy,
        startedAt: new Date(),
      },
    });

    // Update user platform status
    await prisma.userPlatform.update({
      where: { userId_platformId: { userId, platformId } },
      data: {
        syncStatus: SyncStatus.IN_PROGRESS,
        syncAttempts: { increment: 1 },
      },
    });

    // Acquire concurrency lock
    if (!ScraperFactory.acquireLock(platformSlug)) {
      logger.warn(`Sync already in progress for ${platformSlug}, user ${userId}. Skipping internal sync.`);
      return {
        platformId,
        platformSlug,
        platformName: platform.name,
        success: false,
        status: SyncStatus.CANCELLED,
        entriesAdded: 0,
        entriesUpdated: 0,
        entriesSkipped: 0,
        duration: 0,
        error: 'Sync already in progress'
      };
    }

    try {
      // Get scraper
      const scraper = await ScraperFactory.getOrLoadScraper(platformSlug);

      if (!scraper) {
        throw new Error(`No scraper available for ${platform.name}`);
      }

      // Check if it's a stub (load failed)
      // We import StubScraper via require/import at top to check instanceof?
      // Or just check a property. BaseScraper probably doesn't have isStub.
      // Dynamic import of StubScraper might be needed if not imported.
      // Assuming StubScraper is imported or we use name check.
      if (scraper instanceof StubScraper) {
        throw new Error(`Scraper module for ${platform.name} could not be loaded`);
      }

      if (!ScraperFactory.isScraperWorking(platformSlug)) {
        throw new Error(`Auto-sync not available for ${platform.name}`);
      }

      // Build credentials
      let token = extractToken(userPlatform.credentials);

      // Try access token if no token in credentials
      if (!token && userPlatform.accessToken) {
        token = userPlatform.accessToken;
      }

      // Fallback to OAuth account for certain platforms
      if (!token && ScraperFactory.requiresOAuth(platformSlug)) {
        const oauthAccount = await prisma.account.findFirst({
          where: { userId, provider: platformSlug },
          select: { access_token: true },
        });
        token = oauthAccount?.access_token ?? '';
      }

      // Validate we have required credentials
      if (ScraperFactory.requiresOAuth(platformSlug) && !token) {
        throw new Error(`OAuth token required for ${platform.name}. Please reconnect your account.`);
      }

      if (!userPlatform.username && !token) {
        throw new Error(`Username or authentication required for ${platform.name}`);
      }

      // Execute scraper
      const scraperResult = await scraper.fetchData({
        username: userPlatform.username || '',
        token,
        accessToken: token,
        apiKey: userPlatform.apiKey || undefined,
      });

      // Update scraper status
      ScraperFactory.updateStatus(platformSlug, scraperResult.success, scraperResult.error);

      if (!scraperResult.success) {
        throw new Error(scraperResult.error || 'Sync failed');
      }

      // Process entries (Directive 4: Batch updates)
      let entriesAdded = 0;
      let entriesUpdated = 0;
      let entriesSkipped = 0;

      const rawEntries = scraperResult.entries || [];

      // Aggregate entries by normalized date to prevent unique constraint violations
      const aggregatedEntriesMap = new Map<number, typeof rawEntries[0]>();

      for (const entry of rawEntries) {
        const normalizedTime = normalizeDate(entry.date).getTime();
        const existing = aggregatedEntriesMap.get(normalizedTime);

        if (existing) {
          existing.problems = (existing.problems || 0) + (entry.problems || 0);
          existing.commits = (existing.commits || 0) + (entry.commits || 0);
          existing.pullRequests = (existing.pullRequests || 0) + (entry.pullRequests || 0);
          existing.issues = (existing.issues || 0) + (entry.issues || 0);
          existing.timeSpent = (existing.timeSpent || 0) + (entry.timeSpent || 0);
          if (entry.rating) existing.rating = entry.rating;
          if (entry.points) existing.points = entry.points;
        } else {
          aggregatedEntriesMap.set(normalizedTime, { ...entry, date: new Date(normalizedTime) });
        }
      }

      const entries = Array.from(aggregatedEntriesMap.values());
      const entryDates = entries.map(e => e.date);

      // Fetch existing entries in one query
      const existingEntries = await prisma.trackerEntry.findMany({
        where: {
          userId,
          platformId,
          date: { in: entryDates }
        }
      });

      const existingEntriesMap = new Map(
        existingEntries.map(e => [e.date.toISOString().split('T')[0], e])
      );

      // Prepare operations
      const updates = [];
      const creates = [];

      for (const entry of entries) {
        const normalizedDate = normalizeDate(entry.date);
        const dateKey = normalizedDate.toISOString().split('T')[0];
        const existingEntry = existingEntriesMap.get(dateKey);

        if (existingEntry) {
          // Check if there's actually new data
          const hasChanges =
            (entry.problems ?? 0) !== (existingEntry as any).problemsSolved ||
            (entry.commits ?? 0) !== (existingEntry as any).commits ||
            (entry.pullRequests ?? 0) !== (existingEntry as any).pullRequests;

          if (!hasChanges) {
            entriesSkipped++;
            continue;
          }

          // Queue update
          updates.push(prisma.trackerEntry.update({
            where: { id: existingEntry.id },
            data: {
              problemsSolved: Math.max(entry.problems ?? 0, (existingEntry as any).problemsSolved ?? 0),
              commits: Math.max(entry.commits ?? 0, (existingEntry as any).commits ?? 0),
              pullRequests: Math.max(entry.pullRequests ?? 0, (existingEntry as any).pullRequests ?? 0),
              pullRequestsMerged: Math.max(entry.pullRequests ?? 0, (existingEntry as any).pullRequestsMerged ?? 0),
              issuesOpened: Math.max(entry.issues ?? 0, (existingEntry as any).issuesOpened ?? 0),
              timeSpent: Math.max(entry.timeSpent ?? 0, existingEntry.timeSpent ?? 0),
              rating: entry.rating ?? (existingEntry as any).rating,
              ratingChange: entry.ratingChange ?? (existingEntry as any).ratingChange,
              rank: entry.rank ?? (existingEntry as any).rank,
              points: entry.points ?? (existingEntry as any).points,
              xpEarned: entry.xp ?? (existingEntry as any).xpEarned,
              notes: entry.notes || existingEntry.notes,
              source: 'sync',
              syncLogId: syncLog.id,
              updatedAt: new Date(),
            },
          }));
          entriesUpdated++;
        } else {
          // Queue create
          creates.push(prisma.trackerEntry.create({
            data: {
              userId,
              date: normalizedDate,
              platformId,
              category: platform.category,
              problemsSolved: entry.problems ?? 0,
              commits: entry.commits ?? 0,
              pullRequests: entry.pullRequests ?? 0,
              issuesOpened: entry.issues ?? 0,
              timeSpent: entry.timeSpent ?? 0,
              rating: entry.rating,
              ratingChange: entry.ratingChange,
              rank: entry.rank,
              points: entry.points,
              xpEarned: entry.xp,
              notes: entry.notes,
              tags: entry.tags ?? [],
              source: 'sync',
              syncLogId: syncLog.id,
              isAutoGenerated: true,
            },
          }));
          entriesAdded++;
        }
      }

      // Execute all db operations using transaction
      if (updates.length > 0 || creates.length > 0) {
        await prisma.$transaction([...updates, ...creates]);
        // Invalidate Redis cache to ensure the UI updates correctly
        await CacheService.invalidateStats(userId, 'entry');
        // Recalculate streak and totals immediately after sync
        const aggregationPromises = entryDates.map(date =>
          analyticsAggregationService.aggregateDailyStats(userId, date).catch(() => { })
        );

        await Promise.all([
          ...aggregationPromises,
          StatsService.calculateStreak(userId),
          StatsService.recalculateUserStats(userId)
        ]).catch(() => {
          // Non-critical — stats will be updated on next page load
        });
      }

      const duration = Date.now() - startTime;

      // Update sync log - success
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date(),
          duration,
          itemsFound: entries.length,
          itemsCreated: entriesAdded,
          itemsUpdated: entriesUpdated,
          itemsSkipped: entriesSkipped,
          hasError: false,
        },
      });

      // Update user platform
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: {
          syncStatus: SyncStatus.SUCCESS,
          lastSyncedAt: new Date(),
          lastSyncError: null,
          lastSyncDuration: duration,
          consecutiveFailures: 0,
          cachedStats: scraperResult.metadata as Prisma.InputJsonValue ?? undefined,
          statsUpdatedAt: new Date(),
          nextSyncAt: new Date(Date.now() + (platform.syncInterval || 1440) * 60 * 1000),
        },
      });

      // Update platform success rate
      await this.updatePlatformStats(platformId, true);

      logger.info(`Platform sync completed`, {
        userId,
        platformSlug,
        entriesAdded,
        entriesUpdated,
        entriesSkipped,
        duration,
      });

      // Send notification if enabled
      if (userPlatform.notifyOnSync) {
        await NotificationService.createNotification(userId, {
          type: NotificationType.SYNC_COMPLETE,
          priority: NotificationPriority.LOW,
          title: `Sync Complete: ${platform.name}`,
          message: `Successfully synced data from ${platform.name}. ${entriesAdded} new, ${entriesUpdated} updated.`,
          shortMessage: `${platform.name} synced`,
          actionUrl: '/tracker',
          actionLabel: 'View Activity',
          entityType: 'platform',
          entityId: platformId,
        });
      }

      // Invalidate stats cache after successful sync
      await CacheService.invalidateStats(userId);

      return {
        platformId,
        platformSlug,
        platformName: platform.name,
        success: true,
        status: SyncStatus.SUCCESS,
        entriesAdded,
        entriesUpdated,
        entriesSkipped,
        duration,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      // Update scraper status
      ScraperFactory.updateStatus(platformSlug, false, errorMessage);

      // Update sync log - failure
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          duration,
          hasError: true,
          errorMessage,
        },
      });

      // Update user platform
      await prisma.userPlatform.update({
        where: { userId_platformId: { userId, platformId } },
        data: {
          syncStatus: SyncStatus.FAILED,
          lastSyncError: errorMessage,
          lastSyncDuration: duration,
          consecutiveFailures: { increment: 1 },
        },
      });

      // Update platform stats
      await this.updatePlatformStats(platformId, false);

      logger.error(`Platform sync failed`, { userId, platformSlug },
        error instanceof Error ? error : new Error(errorMessage)
      );

      // Send notification on error if enabled
      if (userPlatform.notifyOnError) {
        await NotificationService.createNotification(userId, {
          type: NotificationType.SYNC_FAILED,
          priority: NotificationPriority.HIGH,
          title: `Sync Failed: ${platform.name}`,
          message: `Failed to sync data from ${platform.name}. ${errorMessage}`,
          shortMessage: `${platform.name} sync failed`,
          actionUrl: '/platforms',
          actionLabel: 'Check Connection',
          entityType: 'platform',
          entityId: platformId,
          metadata: { error: errorMessage }
        });
      }

      return {
        platformId,
        platformSlug,
        platformName: platform.name,
        success: false,
        status: SyncStatus.FAILED,
        entriesAdded: 0,
        entriesUpdated: 0,
        entriesSkipped: 0,
        duration,
        error: errorMessage,
      };
    } finally {
      // Always release the lock
      ScraperFactory.releaseLock(platformSlug);
    }
  }

  // ===========================================================================
  // SYNC STATUS & HISTORY
  // ===========================================================================

  /**
   * Get sync status for a user
   */
  static async getSyncStatus(userId: string) {
    const [recentLogs, activeSyncs, platforms] = await Promise.all([
      prisma.syncLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          platform: {
            select: { name: true, icon: true, slug: true }
          }
        },
      }),
      prisma.userPlatform.count({
        where: {
          userId,
          syncStatus: SyncStatus.IN_PROGRESS,
        },
      }),
      prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        select: {
          platformId: true,
          syncStatus: true,
          lastSyncedAt: true,
          lastSyncError: true,
          consecutiveFailures: true,
          platform: {
            select: { name: true, slug: true, icon: true }
          }
        },
      }),
    ]);

    const lastSync = recentLogs[0]?.createdAt ?? null;
    const isRunning = activeSyncs > 0;

    // Calculate overall health
    const totalPlatforms = platforms.length;
    const healthyPlatforms = platforms.filter(p =>
      p.syncStatus === SyncStatus.SUCCESS &&
      p.consecutiveFailures === 0
    ).length;
    const failingPlatforms = platforms.filter((p: any) =>
      p.consecutiveFailures >= 3
    ).length;

    return {
      isRunning,
      activeSyncs,
      lastSync,
      recentLogs,
      platforms: platforms.map((p: any) => ({
        platformId: p.platformId,
        name: p.platform.name,
        slug: p.platform.slug,
        icon: p.platform.icon,
        status: p.syncStatus,
        lastSyncedAt: p.lastSyncedAt,
        lastError: p.lastSyncError,
        failures: p.consecutiveFailures,
      })),
      health: {
        total: totalPlatforms,
        healthy: healthyPlatforms,
        failing: failingPlatforms,
        percentage: totalPlatforms > 0
          ? Math.round((healthyPlatforms / totalPlatforms) * 100)
          : 100,
      },
    };
  }

  /**
   * Get sync history
   */
  static async getSyncHistory(
    userId: string,
    options: SyncHistoryOptions = {}
  ) {
    const { platformId, status, limit = 20, offset = 0 } = options;

    const where: Prisma.SyncLogWhereInput = { userId };

    if (platformId) {
      where.platformId = platformId;
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          platform: {
            select: { name: true, icon: true, slug: true }
          }
        },
      }),
      prisma.syncLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  }

  // ===========================================================================
  // PLATFORM STATS
  // ===========================================================================

  /**
   * Update platform-level statistics after sync
   */
  private static async updatePlatformStats(
    platformId: string,
    success: boolean
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert daily stats
    await prisma.platformDailyStats.upsert({
      where: {
        platformId_date: {
          platformId,
          date: today,
        },
      },
      create: {
        platformId,
        date: today,
        totalSyncs: 1,
        successfulSyncs: success ? 1 : 0,
        failedSyncs: success ? 0 : 1,
      },
      update: {
        totalSyncs: { increment: 1 },
        successfulSyncs: success ? { increment: 1 } : undefined,
        failedSyncs: !success ? { increment: 1 } : undefined,
      },
    });

    // Update platform success rate (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await prisma.syncLog.aggregate({
      where: {
        platformId,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    const successStats = await prisma.syncLog.count({
      where: {
        platformId,
        createdAt: { gte: sevenDaysAgo },
        status: SyncStatus.SUCCESS,
      },
    });

    const successRate = stats._count.id > 0
      ? (successStats / stats._count.id) * 100
      : 100;

    await prisma.platform.update({
      where: { id: platformId },
      data: {
        successRate: Math.round(successRate * 100) / 100,
      },
    });
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Retry failed syncs for a user
   */
  static async retryFailedSyncs(userId: string): Promise<SyncJobResult> {
    const failedPlatforms = await prisma.userPlatform.findMany({
      where: {
        userId,
        isActive: true,
        syncStatus: SyncStatus.FAILED,
        consecutiveFailures: { lt: 5 }, // Don't retry if too many failures
      },
      select: { platformId: true },
    });

    if (failedPlatforms.length === 0) {
      return {
        jobId: nanoid(),
        platformCount: 0,
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        results: [],
        duration: 0,
      };
    }

    return this.syncAllPlatforms(userId, {
      platformIds: failedPlatforms.map(p => p.platformId),
      force: true,
      triggeredBy: 'manual',
    });
  }

  /**
   * Get platforms due for sync
   */
  static async getPlatformsDueForSync(options: {
    userId?: string;
    limit?: number;
  } = {}): Promise<Array<{ userId: string; platformId: string; platformSlug: string }>> {
    const { userId, limit = 100 } = options;
    const now = new Date();

    const where: Prisma.UserPlatformWhereInput = {
      isActive: true,
      autoSync: true,
      consecutiveFailures: { lt: 5 },
      OR: [
        { nextSyncAt: null },
        { nextSyncAt: { lte: now } },
      ],
    };

    if (userId) {
      where.userId = userId;
    }

    const platforms = await prisma.userPlatform.findMany({
      where,
      take: limit,
      orderBy: [
        { syncPriority: 'desc' },
        { lastSyncedAt: 'asc' },
      ],
      select: {
        userId: true,
        platformId: true,
        platform: {
          select: { slug: true },
        },
      },
    });

    return platforms.map((p: any) => ({
      userId: p.userId,
      platformId: p.platformId,
      platformSlug: p.platform.slug,
    }));
  }

  /**
   * Cancel running sync for a user
   */
  static async cancelSync(userId: string, platformId?: string): Promise<void> {
    const where: Prisma.UserPlatformWhereInput = {
      userId,
      syncStatus: SyncStatus.IN_PROGRESS,
    };

    if (platformId) {
      where.platformId = platformId;
    }

    await prisma.userPlatform.updateMany({
      where,
      data: {
        syncStatus: SyncStatus.CANCELLED,
      },
    });

    // Also update any pending sync logs
    await prisma.syncLog.updateMany({
      where: {
        userId,
        status: SyncStatus.IN_PROGRESS,
        ...(platformId ? { platformId } : {}),
      },
      data: {
        status: SyncStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }
}

export default SyncService;