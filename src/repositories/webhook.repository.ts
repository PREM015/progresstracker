// src/repositories/webhook.repository.ts
// Webhook configuration data access

import { prisma } from '@/lib/prisma';
import { Prisma, WebhookEventType } from '@prisma/client';

export class WebhookRepository {
  static async findByUserId(userId: string, options?: { status?: string }) {
    return prisma.webhook.findMany({
      where: { userId, ...(options?.status ? { isActive: options.status === 'ACTIVE' } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.webhook.findUnique({
      where: { id },
      include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  static async findAllActive() {
    return prisma.webhook.findMany({ where: { isActive: true } });
  }

  static async findActiveByEvent(event: string) {
    return prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event as WebhookEventType },
      },
    });
  }

  static async create(data: Prisma.WebhookCreateInput) {
    return prisma.webhook.create({ data });
  }

  static async update(id: string, data: Prisma.WebhookUpdateInput) {
    return prisma.webhook.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.webhook.delete({ where: { id } });
  }

  static async updateStatus(id: string, status: string) {
    return prisma.webhook.update({ where: { id }, data: { isActive: status === 'ACTIVE' } });
  }

  static async recordDelivery(data: Prisma.WebhookDeliveryUncheckedCreateInput) {
    return prisma.webhookDelivery.create({ data });
  }

  static async incrementFailureCount(id: string) {
    return prisma.webhook.update({
      where: { id },
      data: { failureCount: { increment: 1 } },
    });
  }

  static async resetFailureCount(id: string) {
    return prisma.webhook.update({ where: { id }, data: { failureCount: 0 } });
  }
}

export default WebhookRepository;
