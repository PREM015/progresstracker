
import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredRecords, optimizeTables } from '@/lib/cleanup';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleCleanup(request: NextRequest): Promise<NextResponse> {
  // ── Authorization ──────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[CRON] Unauthorized cleanup attempt from:', request.headers.get('x-forwarded-for') ?? 'unknown');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[CRON] Starting database cleanup...');

  try {
    // ── Core auth record cleanup ────────────────────────────
    const authResult = await cleanupExpiredRecords();

    // ── Additional: old notifications (90 days, already read) ─
    let notificationsDeleted = 0;
    try {
      const notifResult = await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: subDays(new Date(), 90) },
          isRead: true,
        },
      });
      notificationsDeleted = notifResult.count;
    } catch (err) {
      console.warn('[CRON] Notification cleanup failed (non-critical):', err);
      authResult.errors.push(`notifications: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── Table statistics refresh (helps query planner) ──────
    try {
      await optimizeTables();
    } catch (err) {
      console.warn('[CRON] Table ANALYZE failed (non-critical):', err);
    }

    const totalCleaned = authResult.totalCleaned + notificationsDeleted;

    console.log('[CRON] Cleanup completed:', {
      totalCleaned,
      duration: `${Date.now() - startTime}ms`,
      errors: authResult.errors.length > 0 ? authResult.errors : 'none',
    });

    return NextResponse.json({
      success: true,
      data: {
        emailVerifications: authResult.emailVerifications,
        passwordResets: authResult.passwordResets,
        refreshTokens: authResult.refreshTokens,
        activeSessions: authResult.activeSessions,
        loginAttempts: authResult.loginAttempts,
        notifications: notificationsDeleted,
        totalCleaned,
        duration: Date.now() - startTime,
        errors: authResult.errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[CRON] Cleanup failed:', err);
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = handleCleanup;
export const POST = handleCleanup;
