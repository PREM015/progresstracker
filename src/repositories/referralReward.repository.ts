// src/repositories/referralReward.repository.ts
// Referral reward data access

import { prisma } from '@/lib/prisma';

export class ReferralRewardRepository {
  static async findByUserId(userId: string) {
    return prisma.referralReward.findMany({
      where: { referrerId: userId },
      include: { referred: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findByReferralCode(referralCode: string) {
    return prisma.referralReward.findFirst({ where: { referrer: { referralCode } } });
  }

  static async create(data: {
    referrerId: string;
    referredId: string;
    referralCode: string;
    rewardValue?: number;
    status?: string;
  }) {
    const { referralCode, ...rest } = data;
    return prisma.referralReward.create({ data: { ...rest, rewardValue: data.rewardValue ?? 0, rewardType: 'CREDITS' as any, status: data.status as any } });
  }

  static async updateStatus(id: string, status: string) {
    return prisma.referralReward.update({
      where: { id },
      data: { status: status as any },
    });
  }

  static async countByReferrer(referrerId: string): Promise<number> {
    return prisma.referralReward.count({ where: { referrerId, status: 'EARNED' as any } });
  }
}

export default ReferralRewardRepository;
