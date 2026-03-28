// src/repositories/pushSubscription.repository.ts
// Web push subscription data access

import { prisma } from '@/lib/prisma';

export class PushSubscriptionRepository {
  static async findByUserId(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findByEndpoint(endpoint: string) {
    return prisma.pushSubscription.findFirst({ where: { endpoint } });
  }

  static async create(data: {
    userId: string;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    userAgent?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
  }) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: { 
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dhKey,
        auth: data.authKey,
        userAgent: data.userAgent,
        deviceName: data.deviceType,
        browser: data.browser,
        os: data.os,
        isActive: true 
      },
      update: {
        userId: data.userId,
        p256dh: data.p256dhKey,
        auth: data.authKey,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  static async revoke(endpoint: string) {
    return prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { isActive: false },
    });
  }

  static async revokeByUserId(userId: string) {
    return prisma.pushSubscription.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  static async updateLastUsed(id: string) {
    return prisma.pushSubscription.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}

export default PushSubscriptionRepository;
