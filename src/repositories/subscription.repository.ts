// src/repositories/subscription.repository.ts
// Subscription data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class SubscriptionRepository {
  static async findByUserId(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findActiveByUserId(userId: string) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE' as any, 'TRIALING' as any] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.subscription.findUnique({ where: { id } });
  }

  static async findByStripeId(stripeSubscriptionId: string) {
    return prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
  }

  static async create(data: Prisma.SubscriptionCreateInput) {
    return prisma.subscription.create({ data });
  }

  static async update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({ where: { id }, data });
  }

  static async updateByStripeId(stripeSubscriptionId: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({ where: { stripeSubscriptionId }, data });
  }

  static async countActiveSubs(): Promise<number> {
    return prisma.subscription.count({
      where: { status: { in: ['ACTIVE' as any, 'TRIALING' as any] } },
    });
  }

  static async groupByPlan() {
    return prisma.subscription.groupBy({
      by: ['tier'],
      where: { status: { in: ['ACTIVE' as any, 'TRIALING' as any] } },
      _count: true,
    });
  }
}

export default SubscriptionRepository;
