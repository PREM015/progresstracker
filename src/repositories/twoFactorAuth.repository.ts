// src/repositories/twoFactorAuth.repository.ts
// Two-factor auth configuration data access

import { prisma } from '@/lib/prisma';

export class TwoFactorAuthRepository {
  static async findByUserId(userId: string) {
    return prisma.twoFactorAuth.findUnique({ where: { userId } });
  }

  static async upsert(userId: string, data: {
    secret: string;
    isEnabled?: boolean;
    isPending?: boolean;
  }) {
    return prisma.twoFactorAuth.upsert({
      where: { userId },
      create: { userId, secret: data.secret, isEnabled: data.isEnabled ?? false, isPending: data.isPending ?? true },
      update: { secret: data.secret, isEnabled: data.isEnabled, isPending: data.isPending },
    });
  }

  static async enable(userId: string, secret: string) {
    return prisma.twoFactorAuth.upsert({
      where: { userId },
      create: { userId, isEnabled: true, isPending: false, secret, verifiedAt: new Date() },
      update: { isEnabled: true, isPending: false, secret, verifiedAt: new Date() },
    });
  }

  static async disable(userId: string) {
    return prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: false },
    });
  }

  static async updateLastVerified(userId: string) {
    return prisma.twoFactorAuth.update({
      where: { userId },
      data: { verifiedAt: new Date() },
    });
  }

  static async isEnabled(userId: string): Promise<boolean> {
    const record = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });
    return record?.isEnabled ?? false;
  }
}

export default TwoFactorAuthRepository;
