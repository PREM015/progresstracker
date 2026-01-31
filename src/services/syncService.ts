import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ScraperFactory } from './scrapers';
import { nanoid } from 'nanoid';
import { SyncStatus } from '@prisma/client';

type OAuthCreds = {
  access_token?: string;
  token?: string;
  accessToken?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractToken(credentials: unknown): string {
  if (!credentials) return '';

  try {
    const parsed = typeof credentials === 'string' ? JSON.parse(credentials) : credentials;
    if (!isObject(parsed)) return '';

    const creds = parsed as OAuthCreds;
    return creds.access_token || creds.token || creds.accessToken || '';
  } catch (e) {
    logger.error('Failed to parse credentials:', e instanceof Error ? e : new Error(String(e)));
    return '';
  }
}

export class SyncService {
  // Get sync history
  static async getSyncHistory(
    userId: string,
    { platformId, limit }: { platformId: string; limit: number }
  ) {
    const logs = await prisma.syncLog.findMany({
      where: { userId, platformId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { platform: { select: { name: true, icon: true, slug: true } } },
    });

    return logs;
  }

  // Sync all platforms for a user
  static async syncAllPlatforms(userId: string) {
    const jobId = nanoid();

    const userPlatforms = await prisma.userPlatform.findMany({
      where: { userId },
      include: { platform: true },
    });

    if (userPlatforms.length === 0) {
      throw new Error('No platforms connected');
    }

    const results = await Promise.allSettled(
      userPlatforms.map((up) => this.syncPlatform(userId, up.platformId))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    return {
      jobId,
      platformCount: userPlatforms.length,
      successCount,
      failCount,
    };
  }

  // Sync a specific platform
  static async syncPlatform(userId: string, platformId: string) {
    const userPlatform = await prisma.userPlatform.findUnique({
      where: { userId_platformId: { userId, platformId } },
      include: { platform: true },
    });

    if (!userPlatform) {
      throw new Error('Platform not connected');
    }

    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId,
        status: SyncStatus.IN_PROGRESS,
        errorMessage: null,
      },
    });

    try {
      const scraper = ScraperFactory.getScraper(userPlatform.platform.slug);

      if (!scraper) {
        throw new Error(`No scraper available for ${userPlatform.platform.name}`);
      }

      if (!ScraperFactory.isScraperWorking(userPlatform.platform.slug)) {
        throw new Error(`Auto-sync not available for ${userPlatform.platform.name}`);
      }

      let token = extractToken(userPlatform.credentials);

      // GitHub OAuth fallback
      if (!token && userPlatform.platform.slug === 'github') {
        const githubAccount = await prisma.account.findFirst({
          where: { userId, provider: 'github' },
          select: { access_token: true },
        });
        token = githubAccount?.access_token ?? '';
      }

      const result = await scraper.fetchData({
        username: userPlatform.username ?? '',
        token,
      });

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      let entriesAdded = 0;
      let entriesUpdated = 0;

      if (result.entries && result.entries.length > 0) {
        for (const entry of result.entries) {
          // Find existing entry using composite unique fields
          const existingEntry = await prisma.trackerEntry.findFirst({
            where: {
              userId,
              date: entry.date,
              platformId: userPlatform.platformId,
            },
          });

          if (existingEntry) {
            // Update existing entry
            await prisma.trackerEntry.update({
              where: { id: existingEntry.id },
              data: {
                problemsSolved: entry.problems ?? 0,
                timeSpent: entry.timeSpent ?? 0,
                notes: entry.notes ?? null,
                updatedAt: new Date(),
              },
            });
            entriesUpdated++;
          } else {
            // Create new entry
            await prisma.trackerEntry.create({
              data: {
                userId,
                date: entry.date,
                platformId: userPlatform.platformId,
                problemsSolved: entry.problems ?? 0,
                timeSpent: entry.timeSpent ?? 0,
                notes: entry.notes ?? null,
              },
            });
            entriesAdded++;
          }
        }
      }

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.SUCCESS,
          errorMessage: null,
          duration: new Date().getTime() - syncLog.createdAt.getTime(),
        },
      });

      return {
        platform: userPlatform.platform.name,
        status: 'success',
        entriesAdded,
        entriesUpdated,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          errorMessage,
          duration: new Date().getTime() - syncLog.createdAt.getTime(),
        },
      });

      throw error;
    }
  }

  // Get sync status
  static async getSyncStatus(userId: string) {
    const recentLogs = await prisma.syncLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { platform: { select: { name: true, icon: true, slug: true } } },
    });

    const runningSyncs = recentLogs.filter(
      (log) =>
        log.status === SyncStatus.IN_PROGRESS &&
        new Date().getTime() - log.createdAt.getTime() < 5 * 60 * 1000
    );

    return {
      isRunning: runningSyncs.length > 0,
      activeSyncs: runningSyncs.length,
      lastSync: recentLogs[0]?.createdAt ?? null,
      recentLogs,
    };
  }
}
