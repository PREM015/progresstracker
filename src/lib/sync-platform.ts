// src/lib/sync-platform.ts
import { logger } from './logger';
import { prisma } from './prisma';
import { scraperFactory } from '@/services/scrapers/scraperFactory';
import { AuthType } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface SyncResult {
  success: boolean;
  duration: number;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  error: string | null;
  details?: {
    problems?: number;
    commits?: number;
    rating?: number;
    rank?: number;
    streak?: number;
    [key: string]: unknown;
  };
}

interface PlatformCredentials {
  username?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: Record<string, unknown>;
}

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

export async function syncPlatformData(
  userId: string,
  platformId: string,
  userPlatformId: string
): Promise<SyncResult> {
  const startTime = Date.now();

  logger.info('Starting platform sync', { userId, platformId, userPlatformId });

  try {
    // 1. Get platform details
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new Error('Platform not found');
    }

    if (!platform.isActive) {
      throw new Error('Platform is not active');
    }

    if (platform.maintenanceMode) {
      throw new Error(platform.maintenanceMessage || 'Platform is under maintenance');
    }

    // 2. Get user platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { id: userPlatformId },
    });

    if (!userPlatform) {
      throw new Error('User platform connection not found');
    }

    if (!userPlatform.isActive) {
      throw new Error('Platform connection is not active');
    }

    // 3. Get credentials
    const credentials = extractCredentials(userPlatform);

    // 4. Validate credentials
    if (platform.requiresCredentials && !hasValidCredentials(platform.authType, credentials)) {
      throw new Error('Invalid or missing credentials');
    }

    // 5. Get scraper/sync handler
    const scraper = scraperFactory.getScraper(platform.slug);

    if (!scraper) {
      throw new Error(`No scraper available for platform: ${platform.slug}`);
    }

    // 6. Fetch data from platform
    logger.info('Fetching data from platform', { platform: platform.slug, username: credentials.username });

    const scrapedData = await scraper.scrape({
      username: credentials.username || userPlatform.username || '',
      apiKey: credentials.apiKey,
      accessToken: credentials.accessToken,
      credentials: credentials.credentials,
    });

    // 7. Parse and normalize data
    const normalizedData = await scraper.parseData(scrapedData);

    logger.info('Data fetched and parsed', {
      platform: platform.slug,
      dataPoints: Object.keys(normalizedData).length,
    });

    // 8. Update tracker entries
    const { created, updated, skipped } = await updateTrackerEntries(
      userId,
      platformId,
      normalizedData
    );

    // 9. Update user platform stats
    await updateUserPlatformStats(userPlatformId, normalizedData);

    // 10. Update user aggregate stats
    await updateUserStats(userId);

    // 11. Update platform cached stats
    await prisma.userPlatform.update({
      where: { id: userPlatformId },
      data: {
        cachedStats: normalizedData as any,
        statsUpdatedAt: new Date(),
        syncStatus: 'SUCCESS',
        lastSyncedAt: new Date(),
        lastSyncDuration: Date.now() - startTime,
        consecutiveFailures: 0,
      },
    });

    const duration = Date.now() - startTime;

    logger.info('Platform sync completed successfully', {
      userId,
      platform: platform.slug,
      duration,
      created,
      updated,
    });

    return {
      success: true,
      duration,
      itemsFound: created + updated + skipped,
      itemsCreated: created,
      itemsUpdated: updated,
      itemsSkipped: skipped,
      error: null,
      details: normalizedData,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Platform sync failed', { userId, platformId }, error);

    // Update user platform with error
    await prisma.userPlatform.update({
      where: { id: userPlatformId },
      data: {
        syncStatus: 'FAILED',
        lastSyncError: errorMessage,
        lastSyncDuration: duration,
        consecutiveFailures: { increment: 1 },
      },
    }).catch(() => {
      // Ignore update errors
    });

    return {
      success: false,
      duration,
      itemsFound: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      error: errorMessage,
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract credentials from user platform
 */
function extractCredentials(userPlatform: any): PlatformCredentials {
  return {
    username: userPlatform.username,
    apiKey: userPlatform.apiKey,
    accessToken: userPlatform.accessToken,
    refreshToken: userPlatform.refreshToken,
    credentials: userPlatform.credentials as Record<string, unknown>,
  };
}

/**
 * Validate credentials based on auth type
 */
function hasValidCredentials(authType: AuthType, credentials: PlatformCredentials): boolean {
  switch (authType) {
    case 'OAUTH':
      return !!credentials.accessToken;
    case 'API_KEY':
      return !!credentials.apiKey;
    case 'SCRAPING':
      return !!credentials.username;
    case 'MANUAL':
      return true;
    case 'HYBRID':
      return !!credentials.username || !!credentials.apiKey || !!credentials.accessToken;
    case 'NONE':
      return true;
    default:
      return false;
  }
}

/**
 * Update tracker entries from normalized data
 */
async function updateTrackerEntries(
  userId: string,
  platformId: string,
  data: Record<string, unknown>
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Check if entry exists for today
    const existingEntry = await prisma.trackerEntry.findFirst({
      where: {
        userId,
        platformId,
        date: today,
      },
    });

    const entryData = {
      userId,
      platformId,
      date: today,
      problemsSolved: Number(data.problemsSolved) || 0,
      problemsAttempted: Number(data.problemsAttempted) || 0,
      easyProblems: Number(data.easyProblems) || 0,
      mediumProblems: Number(data.mediumProblems) || 0,
      hardProblems: Number(data.hardProblems) || 0,
      commits: Number(data.commits) || 0,
      pullRequests: Number(data.pullRequests) || 0,
      rating: data.rating ? Number(data.rating) : null,
      rank: data.rank ? Number(data.rank) : null,
      streak: data.streak ? Number(data.streak) : null,
      points: data.points ? Number(data.points) : null,
      timeSpent: Number(data.timeSpent) || 0,
      source: 'sync' as const,
      isAutoGenerated: true,
      isVerified: true,
      verifiedAt: new Date(),
    };

    if (existingEntry) {
      // Update existing
      await prisma.trackerEntry.update({
        where: { id: existingEntry.id },
        data: entryData,
      });
      updated++;
    } else {
      // Create new
      await prisma.trackerEntry.create({
        data: entryData,
      });
      created++;
    }
  } catch (error) {
    logger.error('Failed to update tracker entry', { userId, platformId }, error);
    skipped++;
  }

  return { created, updated, skipped };
}

/**
 * Update user platform stats
 */
async function updateUserPlatformStats(
  userPlatformId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.userPlatform.update({
      where: { id: userPlatformId },
      data: {
        platformData: data as any,
        cachedStats: data as any,
        statsUpdatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to update user platform stats', { userPlatformId }, error);
  }
}

/**
 * Update user aggregate stats
 */
async function updateUserStats(userId: string): Promise<void> {
  try {
    // Aggregate stats from all tracker entries
    const stats = await prisma.trackerEntry.aggregate({
      where: { userId },
      _sum: {
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        certificationsEarned: true,
      },
    });

    // Count achievements
    const achievementsCount = await prisma.userAchievement.count({
      where: { userId },
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalProblems: stats._sum.problemsSolved || 0,
        totalCommits: stats._sum.commits || 0,
        totalCertifications: stats._sum.certificationsEarned || 0,
        totalAchievements: achievementsCount,
        lastActiveAt: new Date(),
      },
    });

    logger.info('User stats updated', { userId });
  } catch (error) {
    logger.error('Failed to update user stats', { userId }, error);
  }
}

// =============================================================================
// BATCH SYNC
// =============================================================================

/**
 * Sync multiple platforms for a user
 */
export async function syncAllUserPlatforms(userId: string): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: SyncResult[];
}> {
  logger.info('Starting batch sync for user', { userId });

  const userPlatforms = await prisma.userPlatform.findMany({
    where: {
      userId,
      isActive: true,
      autoSync: true,
    },
    include: {
      platform: true,
    },
  });

  const results: SyncResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const userPlatform of userPlatforms) {
    if (!userPlatform.platform.isActive) {
      continue;
    }

    try {
      const result = await syncPlatformData(
        userId,
        userPlatform.platformId,
        userPlatform.id
      );

      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Add delay between syncs to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error('Batch sync failed for platform', {
        userId,
        platformId: userPlatform.platformId,
      }, error);

      results.push({
        success: false,
        duration: 0,
        itemsFound: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      failed++;
    }
  }

  logger.info('Batch sync completed', { userId, successful, failed });

  return {
    total: userPlatforms.length,
    successful,
    failed,
    results,
  };
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Retry failed sync with exponential backoff
 */
export async function retrySyncWithBackoff(
  userId: string,
  platformId: string,
  userPlatformId: string,
  maxAttempts: number = 3
): Promise<SyncResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logger.info('Retry attempt', { attempt, maxAttempts, userPlatformId });

    const result = await syncPlatformData(userId, platformId, userPlatformId);

    if (result.success) {
      return result;
    }

    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      logger.info('Waiting before retry', { delay, attempt });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    duration: 0,
    itemsFound: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    error: `Failed after ${maxAttempts} attempts`,
  };
}