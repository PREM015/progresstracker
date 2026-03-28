// src/repositories/paymentMethod.repository.ts
// Payment method data access

import { prisma } from '@/lib/prisma';

export class PaymentMethodRepository {
  static async findByUserId(userId: string) {
    return prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  static async findById(id: string) {
    return prisma.paymentMethod.findUnique({ where: { id } });
  }

  static async findByStripeId(stripePaymentMethodId: string) {
    return prisma.paymentMethod.findFirst({ where: { stripePaymentMethodId } });
  }

  static async findDefault(userId: string) {
    return prisma.paymentMethod.findFirst({
      where: { userId, isDefault: true },
    });
  }

  static async create(data: {
    userId: string;
    stripePaymentMethodId: string;
    type: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    isDefault?: boolean;
  }) {
    return prisma.paymentMethod.create({ data });
  }

  static async setDefault(id: string, userId: string) {
    await prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    return prisma.paymentMethod.update({ where: { id }, data: { isDefault: true } });
  }

  static async delete(id: string) {
    return prisma.paymentMethod.delete({ where: { id } });
  }
}

export default PaymentMethodRepository;
