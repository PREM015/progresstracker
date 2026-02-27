// src/services/loginHistoryService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';


const log = logger.child({ service: 'LoginHistoryService' });

export interface LoginAttemptData {
  userId?: string;
  email: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  twoFactorRequired?: boolean;
  twoFactorPassed?: boolean;
}

class LoginHistoryService {
  /**
   * Record login attempt
   */
  async recordAttempt(data: LoginAttemptData) {
    try {
      const attempt = await prisma.loginAttempt.create({
        data: {
          userId: data.userId,
          email: data.email,
          success: data.success,
          failureReason: data.failureReason,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          country: data.country,
          twoFactorRequired: data.twoFactorRequired || false,
          twoFactorPassed: data.twoFactorPassed || false,
        },
      });

      log.info('Login attempt recorded', {
        userId: data.userId,
        email: data.email,
        success: data.success,
      });

      return attempt;
    } catch (error) {
      log.error('Error recording login attempt', { email: data.email }, error);
      throw error;
    }
  }

  /**
   * Get login history for user
   */
  async getHistory(userId: string, limit: number = 20) {
    try {
      const attempts = await prisma.loginAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      log.info('Login history fetched', { userId, count: attempts.length });

      return attempts;
    } catch (error) {
      log.error('Error fetching login history', { userId }, error);
      throw error;
    }
  }

  /**
   * Get recent login attempts by email
   */
  async getRecentByEmail(email: string, hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const attempts = await prisma.loginAttempt.findMany({
        where: {
          email,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });

      log.info('Recent login attempts fetched', { email, count: attempts.length });

      return attempts;
    } catch (error) {
      log.error('Error fetching recent login attempts', { email }, error);
      throw error;
    }
  }

  /**
   * Get failed login attempts
   */
  async getFailedAttempts(userId: string, hours: number = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const attempts = await prisma.loginAttempt.findMany({
        where: {
          userId,
          success: false,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });

      log.info('Failed login attempts fetched', { userId, count: attempts.length });

      return attempts;
    } catch (error) {
      log.error('Error fetching failed login attempts', { userId }, error);
      throw error;
    }
  }

  /**
   * Check if account is locked due to too many failed attempts
   */
  async isAccountLocked(email: string, maxAttempts: number = 5, windowMinutes: number = 15): Promise<boolean> {
    try {
      const since = new Date(Date.now() - windowMinutes * 60 * 1000);

      const failedCount = await prisma.loginAttempt.count({
        where: {
          email,
          success: false,
          createdAt: { gte: since },
        },
      });

      const isLocked = failedCount >= maxAttempts;

      if (isLocked) {
        log.warn('Account locked due to failed attempts', { email, failedCount });
      }

      return isLocked;
    } catch (error) {
      log.error('Error checking account lock', { email }, error);
      return false;
    }
  }

  /**
   * Get login statistics
   */
  async getStats(userId: string, days: number = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [total, successful, failed, uniqueIPs, uniqueCountries] = await Promise.all([
        prisma.loginAttempt.count({
          where: { userId, createdAt: { gte: since } },
        }),
        prisma.loginAttempt.count({
          where: { userId, success: true, createdAt: { gte: since } },
        }),
        prisma.loginAttempt.count({
          where: { userId, success: false, createdAt: { gte: since } },
        }),
        prisma.loginAttempt.findMany({
          where: { userId, createdAt: { gte: since }, ipAddress: { not: null } },
          select: { ipAddress: true },
          distinct: ['ipAddress'],
        }),
        prisma.loginAttempt.findMany({
          where: { userId, createdAt: { gte: since }, country: { not: null } },
          select: { country: true },
          distinct: ['country'],
        }),
      ]);

      log.info('Login stats fetched', { userId });

      return {
        total,
        successful,
        failed,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        uniqueIPs: uniqueIPs.length,
        uniqueCountries: uniqueCountries.length,
      };
    } catch (error) {
      log.error('Error fetching login stats', { userId }, error);
      throw error;
    }
  }

  /**
   * Delete old login attempts (cleanup)
   */
  async deleteOldAttempts(daysOld: number = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await prisma.loginAttempt.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      log.info('Old login attempts deleted', { count: result.count, daysOld });

      return { deleted: result.count };
    } catch (error) {
      log.error('Error deleting old login attempts', { daysOld }, error);
      throw error;
    }
  }
}

export const loginHistoryService = new LoginHistoryService();
export default loginHistoryService;