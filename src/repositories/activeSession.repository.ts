// src/repositories/activeSession.repository.ts
// Active session tracking data access

import { prisma } from '@/lib/prisma';

export class ActiveSessionRepository {
  static async findById(id: string) {
    return prisma.activeSession.findUnique({ where: { id } });
  }

  static async findByToken(token: string) {
    return prisma.activeSession.findUnique({ where: { token } });
  }

  static async findByUserId(userId: string, options?: { status?: string; limit?: number }) {
    return prisma.activeSession.findMany({
      where: {
        userId,
        ...(options?.status ? { isValid: options.status === 'ACTIVE' } : {}),
      },
      orderBy: { lastActiveAt: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  static async create(data: {
    userId: string;
    token: string;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    location?: string;
    expiresAt: Date;
  }) {
    return prisma.activeSession.create({ data });
  }

  static async updateLastActive(id: string) {
    return prisma.activeSession.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  static async revoke(id: string) {
    return prisma.activeSession.update({
      where: { id },
      data: { isValid: false, revokedAt: new Date() },
    });
  }

  static async revokeAllExcept(userId: string, exceptId: string) {
    return prisma.activeSession.updateMany({
      where: { userId, id: { not: exceptId }, isValid: true },
      data: { isValid: false, revokedAt: new Date() },
    });
  }

  static async deleteExpired() {
    return prisma.activeSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export default ActiveSessionRepository;
