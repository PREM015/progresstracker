// src/repositories/coupon.repository.ts
// Coupon data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class CouponRepository {
  static async findByCode(code: string) {
    return prisma.coupon.findUnique({ where: { code } });
  }

  static async findById(id: string) {
    return prisma.coupon.findUnique({ where: { id } });
  }

  static async findAll(options?: { isActive?: boolean }) {
    return prisma.coupon.findMany({
      where: { ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(data: Prisma.CouponCreateInput) {
    return prisma.coupon.create({ data });
  }

  static async update(id: string, data: Prisma.CouponUpdateInput) {
    return prisma.coupon.update({ where: { id }, data });
  }

  static async incrementRedemptions(id: string) {
    return prisma.coupon.update({ where: { id }, data: { currentRedemptions: { increment: 1 } } });
  }

  static async isValid(code: string): Promise<boolean> {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { id: true, maxRedemptions: true, currentRedemptions: true },
    });
    if (!coupon) return false;
    if (coupon.maxRedemptions !== null && coupon.currentRedemptions >= coupon.maxRedemptions) return false;
    return true;
  }
}

export default CouponRepository;
