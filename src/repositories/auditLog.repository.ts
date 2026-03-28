// src/repositories/auditLog.repository.ts
// Audit log data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class AuditLogRepository {
  static async create(data: {
    userId?: string;
    actorId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    severity?: string;
    before?: unknown;
    after?: unknown;
    ipAddress?: string;
    userAgent?: string;
    metadata?: unknown;
  }) {
    return prisma.auditLog.create({ data: data as Prisma.AuditLogUncheckedCreateInput });
  }

  static async findMany(options: {
    userId?: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    skip?: number;
    take?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(options.userId ? { userId: options.userId } : {}),
      ...(options.actorId ? { actorId: options.actorId } : {}),
      ...(options.action ? { action: options.action as any } : {}),
      ...(options.resourceType ? { resourceType: options.resourceType } : {}),
      ...(options.severity ? { severity: options.severity as never } : {}),
      ...(options.startDate || options.endDate
        ? { createdAt: { gte: options.startDate, lte: options.endDate } }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: options.skip,
        take: options.take ?? 50,
        orderBy: { createdAt: options.sortOrder ?? 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  static async deleteOlderThan(months: number) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }
}

export default AuditLogRepository;
