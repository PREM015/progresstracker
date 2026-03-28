// src/repositories/newsletterSubscriber.repository.ts
// Newsletter subscriber data access

import { prisma } from '@/lib/prisma';

export class NewsletterSubscriberRepository {
  static async findByEmail(email: string) {
    return prisma.newsletterSubscriber.findUnique({ where: { email } });
  }

  static async findAll(options?: { isActive?: boolean; skip?: number; take?: number }) {
    return prisma.newsletterSubscriber.findMany({
      where: { ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}) },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 100,
    });
  }

  static async create(data: {
    email: string;
    name?: string;
    source?: string;
    preferences?: unknown;
  }) {
    return prisma.newsletterSubscriber.upsert({
      where: { email: data.email },
      create: { ...data, isActive: true },
      update: { isActive: true, updatedAt: new Date() },
    });
  }

  static async unsubscribe(email: string) {
    return prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }

  static async updateStatus(email: string, isActive: boolean) {
    return prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive },
    });
  }

  static async countActive(): Promise<number> {
    return prisma.newsletterSubscriber.count({ where: { isActive: true } });
  }
}

export default NewsletterSubscriberRepository;
