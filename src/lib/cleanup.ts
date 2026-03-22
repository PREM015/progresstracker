// src/lib/cleanup.ts
// Database cleanup logic for expired auth records
// Used by the cron cleanup route at /api/cron/cleanup

import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CleanupResult {
  emailVerifications: number;
  passwordResets: number;
  refreshTokens: number;
  activeSessions: number;
  loginAttempts: number;
  totalCleaned: number;
  duration: number;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────
// Main Cleanup Function
// ─────────────────────────────────────────────────────────────

export async function cleanupExpiredRecords(): Promise<CleanupResult> {
  const startTime = performance.now();
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const errors: string[] = [];

  const [evResult, pwResult, rtResult, asResult, laResult] =
    await Promise.allSettled([
      // 1. Email Verifications — expired unused (7d) or used (30d)
      prisma.emailVerification.deleteMany({
        where: {
          OR: [
            {
              expiresAt: { lt: now },
              verifiedAt: null,
              createdAt: { lt: sevenDaysAgo },
            },
            { verifiedAt: { not: null }, createdAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),

      // 2. Password Resets — expired or used, older than 7 days
      prisma.passwordReset.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now }, createdAt: { lt: sevenDaysAgo } },
            { usedAt: { not: null }, createdAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),

      // 3. Refresh Tokens — expired or revoked (30d)
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isValid: false, createdAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),

      // 4. Active Sessions — expired, revoked, or stale 30d
      prisma.activeSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isValid: false, revokedAt: { lt: thirtyDaysAgo } },
            { lastActiveAt: { lt: thirtyDaysAgo } },
          ],
        },
      }),

      // 5. Login Attempts — older than 90 days
      prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      }),
    ]);

  // Helper to extract count or log error
  function extractCount(
    result: PromiseSettledResult<{ count: number }>,
    name: string
  ): number {
    if (result.status === 'fulfilled') return result.value.count;
    const msg =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    errors.push(`${name}: ${msg}`);
    return 0;
  }

  const emailVerifications = extractCount(evResult, 'emailVerifications');
  const passwordResets = extractCount(pwResult, 'passwordResets');
  const refreshTokens = extractCount(rtResult, 'refreshTokens');
  const activeSessions = extractCount(asResult, 'activeSessions');
  const loginAttempts = extractCount(laResult, 'loginAttempts');

  const totalCleaned =
    emailVerifications +
    passwordResets +
    refreshTokens +
    activeSessions +
    loginAttempts;

  return {
    emailVerifications,
    passwordResets,
    refreshTokens,
    activeSessions,
    loginAttempts,
    totalCleaned,
    duration: Math.round(performance.now() - startTime),
    errors,
  };
}

// ─────────────────────────────────────────────────────────────
// Optional: ANALYZE tables to update query planner stats
// ─────────────────────────────────────────────────────────────

export async function optimizeTables(): Promise<void> {
  const tables = [
    'EmailVerification',
    'PasswordReset',
    'RefreshToken',
    'ActiveSession',
    'LoginAttempt',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
    } catch (err) {
      // Non-fatal: log and continue
      console.warn(`[CLEANUP] Failed to ANALYZE table ${table}:`, err);
    }
  }
}
