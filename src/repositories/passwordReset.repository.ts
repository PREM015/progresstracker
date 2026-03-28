// src/repositories/passwordReset.repository.ts
// Password reset token data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class PasswordResetRepository {
  static async create(userId: string, expiryHours: number = 1) {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Invalidate any existing tokens for this user
    await prisma.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return prisma.passwordReset.create({
      data: { userId, token, expiresAt },
    });
  }

  static async findByToken(token: string) {
    return prisma.passwordReset.findUnique({ where: { token } });
  }

  static async findValidByToken(token: string) {
    return prisma.passwordReset.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  static async markUsed(id: string) {
    return prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  static async deleteExpired() {
    return prisma.passwordReset.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export default PasswordResetRepository;
