// src/repositories/paymentEvent.repository.ts
// Payment event data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class PaymentEventRepository {
  static async findByUserId(userId: string, options?: { status?: string; skip?: number; take?: number }) {
    return prisma.paymentEvent.findMany({
      where: {
        userId,
        ...(options?.status ? { status: options.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.paymentEvent.findUnique({ where: { id } });
  }

  static async findByStripePaymentIntentId(stripePaymentIntentId: string) {
    return prisma.paymentEvent.findFirst({ where: { stripePaymentIntentId } });
  }

  static async create(data: Prisma.PaymentEventCreateInput) {
    return prisma.paymentEvent.create({ data });
  }

  static async update(id: string, data: Prisma.PaymentEventUpdateInput) {
    return prisma.paymentEvent.update({ where: { id }, data });
  }

  static async sumRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    const result = await prisma.paymentEvent.aggregate({
      where: {
        status: 'SUCCEEDED' as any,
        ...(startDate || endDate ? { createdAt: { gte: startDate, lte: endDate } } : {}),
      },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }
}

export default PaymentEventRepository;
