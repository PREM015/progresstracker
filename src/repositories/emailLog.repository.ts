// src/repositories/emailLog.repository.ts
// Email delivery log data access

import { prisma } from '@/lib/prisma';

export class EmailLogRepository {
  static async create(data: {
    userId?: string;
    to: string;
    from?: string;
    subject: string;
    templateId?: string;
    status?: string;
    provider?: string;
    providerMessageId?: string;
    metadata?: unknown;
  }) {
    return prisma.emailLog.create({ data: data as any });
  }

  static async findById(id: string) {
    return prisma.emailLog.findUnique({ where: { id } });
  }

  static async findByUserId(userId: string, options?: { status?: string; skip?: number; take?: number }) {
    return prisma.emailLog.findMany({
      where: { userId, ...(options?.status ? { status: options.status as never } : {}) },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 50,
    });
  }

  static async findAll(options: { status?: string; search?: string; skip?: number; take?: number }) {
    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where: {
          ...(options.status ? { status: options.status as never } : {}),
          ...(options.search ? { to: { contains: options.search, mode: 'insensitive' } } : {}),
        },
        skip: options.skip,
        take: options.take ?? 50,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailLog.count({
        where: {
          ...(options.status ? { status: options.status as never } : {}),
          ...(options.search ? { to: { contains: options.search, mode: 'insensitive' } } : {}),
        },
      }),
    ]);
    return { logs, total };
  }

  static async updateStatus(id: string, status: string, data?: { openedAt?: Date; clickedAt?: Date }) {
    return prisma.emailLog.update({ where: { id }, data: { status: status as never, ...data } });
  }

  static async updateByMessageId(providerMessageId: string, data: Record<string, unknown>) {
    return prisma.emailLog.updateMany({ where: { providerId: providerMessageId }, data });
  }
}

export default EmailLogRepository;
