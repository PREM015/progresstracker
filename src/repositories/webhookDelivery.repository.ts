// src/repositories/webhookDelivery.repository.ts
// Webhook delivery log data access

import { prisma } from '@/lib/prisma';

export class WebhookDeliveryRepository {
  static async findByWebhookId(webhookId: string, options?: { status?: string; skip?: number; take?: number }) {
    return prisma.webhookDelivery.findMany({
      where: { webhookId, ...(options?.status ? { status: options.status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.webhookDelivery.findUnique({ where: { id } });
  }

  static async create(data: {
    webhookId: string;
    event: string;
    requestUrl: string;
    status?: string;
    payload?: unknown;
    responseStatus?: number;
    responseBody?: string;
    duration?: number;
    errorMessage?: string;
    attempt?: number;
  }) {
    const { event, status, payload, ...rest } = data;
    return prisma.webhookDelivery.create({ 
      data: { ...rest, payload: payload as any, event: event as any, ...(status ? { status: status as any } : {}) } 
    });
  }

  static async update(id: string, data: {
    status?: string;
    responseStatus?: number;
    responseBody?: string;
    duration?: number;
    errorMessage?: string;
    nextRetryAt?: Date;
  }) {
    const { status, ...rest } = data;
    return prisma.webhookDelivery.update({ 
      where: { id }, 
      data: { ...rest, ...(status ? { status: status as any } : {}) } 
    });
  }

  static async findPendingRetries() {
    return prisma.webhookDelivery.findMany({
      where: {
        status: 'RETRYING' as any,
        nextRetryAt: { lte: new Date() },
      },
      include: { webhook: true },
    });
  }

  static async countByWebhook(webhookId: string) {
    return prisma.webhookDelivery.groupBy({
      by: ['status'],
      where: { webhookId },
      _count: true,
    });
  }
}

export default WebhookDeliveryRepository;
