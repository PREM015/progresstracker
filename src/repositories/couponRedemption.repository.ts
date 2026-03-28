// src/repositories/couponRedemption.repository.ts
// Coupon redemption data access

import { prisma } from '@/lib/prisma';

export class CouponRedemptionRepository {
  static async findByUserAndCoupon(userId: string, couponId: string) {
    return prisma.couponRedemption.findFirst({ where: { userId, couponId } });
  }

  static async findByUserId(userId: string) {
    return prisma.couponRedemption.findMany({
      where: { userId },
      include: { coupon: { select: { id: true, code: true, discountType: true, discountValue: true } } },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  static async create(data: { userId: string; couponId: string; subscriptionId?: string; discountAmount: number; currency: string }) {
    return prisma.couponRedemption.create({ data });
  }

  static async countByCoupon(couponId: string): Promise<number> {
    return prisma.couponRedemption.count({ where: { couponId } });
  }

  static async hasUserUsed(userId: string, couponId: string): Promise<boolean> {
    const r = await prisma.couponRedemption.findFirst({
      where: { userId, couponId },
      select: { id: true },
    });
    return !!r;
  }
}

export default CouponRedemptionRepository;
