import {prisma} from '@/lib/prisma';
import { ScraperFactory } from './scrapers';
import { nanoid } from 'nanoid';

export class SyncService {
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
      const result = await scraper.fetchData({
        username: userPlatform.username || '',
        token: userPlatform.token || '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      // Save entries to database
      let entriesAdded = 0;

      if (result.entries && result.entries.length > 0) {
        for (const entry of result.entries) {
          // Create or update entry
          await prisma.trackerEntry.upsert({
            where: {
              userId_date_platform: {
                userId,
                date: entry.date,
                platform: userPlatform.platform.name,
              },
            },
            update: {
              problems: entry.problems || 0,
              timeSpent: entry.timeSpent || 0,
              notes: entry.notes,
            },
            create: {
              userId,
              date: entry.date,
              platform: userPlatform.platform.name,
              problems: entry.problems || 0,
              timeSpent: entry.timeSpent || 0,
              notes: entry.notes,
            },
          });
          entriesAdded++;
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
      };
    } catch (error: any) {
      // Update sync log with error
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          message: error.message || 'Sync failed',
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