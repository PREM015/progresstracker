// src/repositories/exportJob.repository.ts
// Export job data access

import { prisma } from '@/lib/prisma';

export class ExportJobRepository {
  static async findByUserId(userId: string, options?: { skip?: number; take?: number }) {
    return prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.exportJob.findUnique({ where: { id } });
  }

  static async create(data: {
    userId: string;
    format: string;
    dataTypes: string[];
    filters?: unknown;
  }) {
    return prisma.exportJob.create({ data: { ...data, format: data.format as any, status: 'PENDING' as any } });
  }

  static async updateStatus(id: string, status: string, data?: { fileUrl?: string; error?: string; completedAt?: Date }) {
    return prisma.exportJob.update({
      where: { id },
      data: { status: status as never, ...data },
    });
  }

  static async findStale(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    return prisma.exportJob.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] as never[] },
        createdAt: { lt: cutoff },
      },
    });
  }

  static async deleteExpired() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    return prisma.exportJob.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  }
}

export default ExportJobRepository;
