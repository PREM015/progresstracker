// src/repositories/session.repository.ts
// NextAuth session data access

import { prisma } from '@/lib/prisma';

export class SessionRepository {
  static async findByToken(sessionToken: string) {
    return prisma.session.findUnique({ where: { sessionToken } });
  }

  static async findByUserId(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { expires: 'desc' },
    });
  }

  static async create(data: {
    sessionToken: string;
    userId: string;
    expires: Date;
  }) {
    return prisma.session.create({ data });
  }

  static async update(sessionToken: string, data: { expires: Date }) {
    return prisma.session.update({ where: { sessionToken }, data });
  }

  static async delete(sessionToken: string) {
    return prisma.session.delete({ where: { sessionToken } });
  }

  static async deleteByUserId(userId: string) {
    return prisma.session.deleteMany({ where: { userId } });
  }

  static async deleteExpired() {
    return prisma.session.deleteMany({
      where: { expires: { lt: new Date() } },
    });
  }

  static async countActive(userId: string): Promise<number> {
    return prisma.session.count({
      where: { userId, expires: { gt: new Date() } },
    });
  }
}

export default SessionRepository;
