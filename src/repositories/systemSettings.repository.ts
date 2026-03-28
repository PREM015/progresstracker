// src/repositories/systemSettings.repository.ts
// System settings data access

import { prisma } from '@/lib/prisma';

export class SystemSettingsRepository {
  static async findAll(options?: { category?: string; isPublic?: boolean }) {
    return prisma.systemSettings.findMany({
      where: {
        ...(options?.category ? { category: options.category } : {}),
        ...(options?.isPublic !== undefined ? { isPublic: options.isPublic } : {}),
      },
      orderBy: { key: 'asc' },
    });
  }

  static async findByKey(key: string) {
    return prisma.systemSettings.findUnique({ where: { key } });
  }

  static async getValue(key: string): Promise<any | null> {
    const setting = await prisma.systemSettings.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  }

  static async setValue(key: string, value: string, description?: string) {
    return prisma.systemSettings.upsert({
      where: { key },
      create: { key, value, description },
      update: { value, updatedAt: new Date() },
    });
  }

  static async setMany(settings: { key: string; value: string }[]) {
    return Promise.all(settings.map((s) => this.setValue(s.key, s.value)));
  }

  static async delete(key: string) {
    return prisma.systemSettings.delete({ where: { key } });
  }

  static async getAllAsMap(): Promise<Record<string, any>> {
    const settings = await prisma.systemSettings.findMany({ select: { key: true, value: true } });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }
}

export default SystemSettingsRepository;
