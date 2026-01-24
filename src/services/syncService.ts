import {prisma} from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ScraperFactory } from './scrapers';
import { nanoid } from 'nanoid';

export class SyncService {
  static async getSyncHistory(userId: string, { platformId, limit }: { platformId: string; limit: number; }) {
    const logs = await prisma.syncLog.findMany({
      where: {
        userId,
        platformId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        platform: {
          select: { name: true, icon: true, slug: true },
        },
      },
    });

    return logs;
  }
  // Sync all platforms for a user
  static async syncAllPlatforms(userId: string) {
    const jobId = nanoid();

    // Get all connected platforms
    const userPlatforms = await prisma.userPlatform.findMany({
      where: { userId },
      include: { platform: true },
    });

    if (userPlatforms.length === 0) {
      throw new Error('No platforms connected');
    }

    // Execute syncs in parallel (limit concurrency)
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

  // Sync specific platform
  static async syncPlatform(userId: string, platformId: string) {
    // Get user platform connection
    const userPlatform = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      include: { platform: true },
    });

    if (!userPlatform) {
      throw new Error('Platform not connected');
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        platformId,
        status: 'running',
        message: 'Sync started',
      },
    });

    try {
      // Get scraper for platform
      const scraper = ScraperFactory.getScraper(userPlatform.platform.slug);

      if (!scraper) {
        throw new Error(`No scraper available for ${userPlatform.platform.name}`);
      }

      // Check if scraper is working
      if (!ScraperFactory.isScraperWorking(userPlatform.platform.slug)) {
        throw new Error(`Auto-sync not available for ${userPlatform.platform.name}`);
      }

      // Fetch data from platform
      let token = '';
      if (userPlatform.credentials) {
        try {
          const creds = typeof userPlatform.credentials === 'string' 
            ? JSON.parse(userPlatform.credentials) 
            : userPlatform.credentials;
          token = creds.access_token || '';
        } catch (e) {
          logger.error('Failed to parse credentials:', e instanceof Error ? e : new Error(String(e)));
        }
      }
      
      const result = await scraper.fetchData({
        username: userPlatform.username || '',
        token: token,
      });

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      // Save entries to database
      let entriesAdded = 0;
      let entriesUpdated = 0;

      if (result.entries && result.entries.length > 0) {
        for (const entry of result.entries) {
          // Check if entry exists
          const existingEntry = await prisma.trackerEntry.findUnique({
            where: {
              userId_date_platformId: {
                userId,
                date: entry.date,
                platformId: userPlatform.platformId || null,
              },
            },
          });

          // Create or update entry
          await prisma.trackerEntry.upsert({
            where: {
              userId_date_platformId: {
                userId,
                date: entry.date,
                platformId: userPlatform.platformId || null,
              },
            },
            update: {
              problemsSolved: entry.problems || 0,
              timeSpent: entry.timeSpent || 0,
              notes: entry.notes,
            },
            create: {
              userId,
              date: entry.date,
              platformId: userPlatform.platformId,
              problemsSolved: entry.problems || 0,
              timeSpent: entry.timeSpent || 0,
              notes: entry.notes,
            },
          });

          if (existingEntry) {
            entriesUpdated++;
          } else {
            entriesAdded++;
          }
        }
      }

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          message: `Synced ${entriesAdded} entries`,
        },
      });

      return {
        platform: userPlatform.platform.name,
        status: 'success',
        entriesAdded,
        entriesUpdated,
      };
    } catch (error: unknown) {
      // Update sync log with error
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          message: errorMessage,
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
      include: {
        platform: {
          select: { name: true, icon: true, slug: true },
        },
      },
    });

    const runningSyncs = recentLogs.filter(
      (log) =>
        log.status === 'running' &&
        new Date().getTime() - log.createdAt.getTime() < 5 * 60 * 1000
    );

    return {
      isRunning: runningSyncs.length > 0,
      activeSyncs: runningSyncs.length,
      lastSync: recentLogs[0]?.createdAt || null,
      recentLogs,
    };
  }
}