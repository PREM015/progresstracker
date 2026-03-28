// src/repositories/loginAttempt.repository.ts
// Login attempt tracking data access

import { prisma } from '@/lib/prisma';

export class LoginAttemptRepository {
  static async create(data: {
    userId?: string;
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
    country?: string;
  }) {
    return prisma.loginAttempt.create({ data });
  }

  static async findByUserId(userId: string, options?: { limit?: number; skip?: number }) {
    return prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 20,
      skip: options?.skip ?? 0,
    });
  }

  static async countRecentFailed(email: string, minutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  static async countRecentFailedByIp(ipAddress: string, minutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return prisma.loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  static async isIpBlocked(ipAddress: string): Promise<boolean> {
    const block = await prisma.loginAttempt.findFirst({
      where: { ipAddress, success: false, failureReason: 'BLOCKED', createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    return !!block;
  }
}

export default LoginAttemptRepository;
