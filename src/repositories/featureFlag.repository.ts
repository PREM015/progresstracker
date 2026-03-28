// src/repositories/featureFlag.repository.ts
// Feature flag data access

import { prisma } from '@/lib/prisma';

export class FeatureFlagRepository {
  static async findAll(options?: { isEnabled?: boolean }) {
    return prisma.featureFlag.findMany({
      where: { ...(options?.isEnabled !== undefined ? { isEnabled: options.isEnabled } : {}) },
      orderBy: { key: 'asc' },
    });
  }

  static async findByKey(key: string) {
    return prisma.featureFlag.findUnique({ where: { key } });
  }

  static async findById(id: string) {
    return prisma.featureFlag.findUnique({ where: { id } });
  }

  static async create(data: {
    key: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
    enabledForAll?: boolean;
    enabledUserIds?: string[];
    enabledPercentage?: number;
  }) {
    return prisma.featureFlag.create({ data });
  }

  static async update(id: string, data: Record<string, unknown>) {
    return prisma.featureFlag.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.featureFlag.delete({ where: { id } });
  }

  static async isEnabled(key: string, userId?: string, role?: string): Promise<boolean> {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) return false;
    if (!flag.isEnabled) return false;

    if (userId && Array.isArray(flag.enabledUserIds) && flag.enabledUserIds.includes(userId)) return true;
    if (flag.enabledForAll) return true;
    if (flag.enabledPercentage === 100) return true;
    if (flag.enabledPercentage === 0) return false;

    // Deterministic rollout by user id hash
    if (userId) {
      const hash = parseInt(userId.replace(/\D/g, '').slice(0, 8), 10) || 0;
      return (hash % 100) < (flag.enabledPercentage ?? 0);
    }

    return flag.isEnabled;
  }
}

export default FeatureFlagRepository;
