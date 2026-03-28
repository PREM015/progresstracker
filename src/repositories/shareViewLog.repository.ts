// src/repositories/shareViewLog.repository.ts
// Share view log data access

import { prisma } from '@/lib/prisma';

export class ShareViewLogRepository {
  static async create(data: {
    shareLinkId: string;
    viewerUserId?: string;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
    country?: string;
    city?: string;
  }) {
    return prisma.shareViewLog.create({ data });
  }

  static async findByLinkId(shareLinkId: string, options?: { skip?: number; take?: number }) {
    return prisma.shareViewLog.findMany({
      where: { shareLinkId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 50,
    });
  }

  static async countByLinkId(shareLinkId: string): Promise<number> {
    return prisma.shareViewLog.count({ where: { shareLinkId } });
  }

  static async getAnalytics(shareLinkId: string) {
    const [total, countries, referrers] = await Promise.all([
      prisma.shareViewLog.count({ where: { shareLinkId } }),
      prisma.shareViewLog.groupBy({
        by: ['country'],
        where: { shareLinkId },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      prisma.shareViewLog.groupBy({
        by: ['referrer'],
        where: { shareLinkId },
        _count: true,
        orderBy: { _count: { referrer: 'desc' } },
        take: 10,
      }),
    ]);

    return { total, countries, referrers };
  }
}

export default ShareViewLogRepository;
