// src/repositories/report.repository.ts
// Report data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class ReportRepository {
  static async findByUserId(userId: string, options?: { type?: string; skip?: number; take?: number }) {
    return prisma.report.findMany({
      where: {
        userId,
        ...(options?.type ? { type: options.type as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  }

  static async create(data: Prisma.ReportCreateInput) {
    return prisma.report.create({ data });
  }

  static async delete(id: string) {
    return prisma.report.delete({ where: { id } });
  }
}

export default ReportRepository;
