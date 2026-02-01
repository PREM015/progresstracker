// src/app/api/cron/daily-sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncService } from '@/services/syncService';

// Verify cron secret (Vercel Cron or custom)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting daily sync cron job...');

    // Get all users with auto-sync enabled
    const usersWithAutoSync = await prisma.userSettings.findMany({
      where: { autoSync: true },
      select: { userId: true },
    });

    if (usersWithAutoSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with auto-sync enabled',
        usersProcessed: 0,
      });
    }

    const results: Array<{
      userId: string;
      success: boolean;
      platforms?: number;
      error?: string;
    }> = [];

    // Process users in batches
    const batchSize = 10;
    for (let i = 0; i < usersWithAutoSync.length; i += batchSize) {
      const batch = usersWithAutoSync.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async ({ userId }) => {
          try {
            // Get user's connected platforms
            const connectedPlatforms = await prisma.userPlatform.findMany({
              where: { userId },
              include: { platform: true },
            });

            if (connectedPlatforms.length === 0) {
              results.push({
                userId,
                success: true,
                platforms: 0,
              });
              return;
            }

            // Trigger sync (don't wait for completion)
            const job = await SyncService.syncAllPlatforms(userId);

            results.push({
              userId,
              success: true,
              platforms: job.successCount + job.failCount,
            });
          } catch (error: any) {
            console.error(`Daily sync failed for user ${userId}:`, error);
            results.push({
              userId,
              success: false,
              error: error.message,
            });
          }
        })
      );

      // Rate limiting between batches
      if (i + batchSize < usersWithAutoSync.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`Daily sync completed: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Daily sync completed',
      usersProcessed: usersWithAutoSync.length,
      successCount,
      failCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Daily sync cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Daily sync failed' },
      { status: 500 }
    );
  }
}

// Support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}