// =============================================================================
// cron/streak-freeze/route.ts — Apply streak freezes
// SECURITY: Protected by withCronAuth (Bearer token + optional IP allowlist)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { withCronAuth } from '@/lib/server/cron-auth';
import { subDays, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function _cronHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const result = { usersChecked: 0, freezesApplied: 0, freezesFailed: 0, notificationsSent: 0 };

  try {
    const yesterday = startOfDay(subDays(new Date(), 1));
    const today = startOfDay(new Date());

    // Get users who have streak freeze available and haven't been active yesterday
    const usersWithFreeze = await prisma.user.findMany({
      where: {
        isActive: true,
        streakFreezeCount: { gt: 0 },
        currentStreak: { gt: 0 },
        AND: [
          {
            // Either no activity yesterday or last activity before yesterday
            OR: [
              { lastActivityDate: null },
              { lastActivityDate: { lt: yesterday } },
            ],
          },
          {
            // Only process if streak freeze wasn't already used today
            OR: [
              { streakFreezeUsedAt: null },
              { streakFreezeUsedAt: { lt: today } },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        currentStreak: true,
        streakFreezeCount: true,
        lastActivityDate: true,
        streakFreezeUsedAt: true,
      },
      take: 500, // Process in batches
    });

    result.usersChecked = usersWithFreeze.length;

    for (const user of usersWithFreeze) {
      try {
        // Check if user had activity yesterday (if so, no freeze needed)
        const yesterdayActivity = await prisma.trackerEntry.findFirst({
          where: {
            userId: user.id,
            date: { gte: yesterday, lt: today },
          },
        });

        if (yesterdayActivity) continue; // Already active, no freeze needed

        // Apply streak freeze
        await prisma.user.update({
          where: { id: user.id },
          data: {
            streakFreezeCount: { decrement: 1 },
            streakFreezeUsedAt: new Date(),
            // Keep streak alive – do not reset currentStreak
          },
        });

        // Create a synthetic tracker entry to preserve streak
        const platform = await prisma.platform.findFirst({ where: { slug: 'general' } });
        if (platform) {
          await prisma.trackerEntry.upsert({
            where: { userId_platformId_date: { userId: user.id, platformId: platform.id, date: yesterday } },
            create: { userId: user.id, platformId: platform.id, date: yesterday, notes: 'Streak freeze applied automatically' },
            update: {},
          });
        }

        result.freezesApplied++;

        // Send notification
        try {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'STREAK_MILESTONE',
              title: '🧊 Streak Freeze Used!',
              message: `Your ${user.currentStreak}-day streak was saved by a streak freeze. You have ${user.streakFreezeCount - 1} freeze(s) remaining.`,
              channel: 'IN_APP',
              priority: 'NORMAL',
            },
          });
          result.notificationsSent++;
        } catch (notifErr) {
          logger.warn('Failed to create streak freeze notification', { userId: user.id, error: String(notifErr) });
        }

        logger.info('Streak freeze applied', { userId: user.id, streak: user.currentStreak });
      } catch (userErr) {
        result.freezesFailed++;
        logger.error('Failed to apply streak freeze for user', { userId: user.id }, userErr);
      }
    }

    logger.info('Streak freeze cron completed', { ...result, duration: Date.now() - startTime });

    return NextResponse.json({
      success: true,
      data: { ...result, duration: Date.now() - startTime, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('Streak freeze cron failed', {}, error);
    return NextResponse.json({ error: 'Streak freeze job failed' }, { status: 500 });
  }
}

export const GET = withCronAuth(_cronHandler);
export const POST = withCronAuth(_cronHandler);
