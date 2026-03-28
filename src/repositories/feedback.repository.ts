// src/repositories/feedback.repository.ts
// User feedback data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class FeedbackRepository {
  static async findAll(options?: { type?: string; status?: string; skip?: number; take?: number }) {
    return prisma.feedback.findMany({
      where: {
        ...(options?.type ? { type: options.type as never } : {}),
        ...(options?.status ? { status: options.status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 50,
    });
  }

  static async findById(id: string) {
    return prisma.feedback.findUnique({ where: { id } });
  }

  static async findByUserId(userId: string) {
    return prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(data: Prisma.FeedbackCreateInput) {
    return prisma.feedback.create({ data });
  }

  static async updateStatus(id: string, status: string, adminNote?: string) {
    return prisma.feedback.update({
      where: { id },
      data: { status: status as never, response: adminNote, respondedAt: new Date() },
    });
  }

  static async delete(id: string) {
    return prisma.feedback.delete({ where: { id } });
  }

  static async countByType() {
    return prisma.feedback.groupBy({
      by: ['type'],
      _count: true,
    });
  }
}

export default FeedbackRepository;
