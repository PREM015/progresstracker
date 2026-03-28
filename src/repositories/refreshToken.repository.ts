// src/repositories/refreshToken.repository.ts
// JWT refresh token data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class RefreshTokenRepository {
  static async create(data: {
    userId: string;
    familyId?: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const familyId = data.familyId ?? crypto.randomUUID();

    const record = await prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: tokenHash,
        family: familyId,
        expiresAt: data.expiresAt,
      },
    });

    return { plain: token, record };
  }

  static async findByTokenHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { token: tokenHash } });
  }

  static async findValidByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: {
        token: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  static async revokeById(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: { family: familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static async deleteExpired() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export default RefreshTokenRepository;
