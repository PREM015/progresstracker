// src/repositories/waitlist.repository.ts
// Waitlist data access

import { prisma } from '@/lib/prisma';

export class WaitlistRepository {
  static async findByEmail(email: string) {
    return prisma.waitlist.findUnique({ where: { email } });
  }

  static async findById(id: string) {
    return prisma.waitlist.findUnique({ where: { id } });
  }

  static async findAll(options?: { status?: string; skip?: number; take?: number }) {
    return prisma.waitlist.findMany({
      where: { ...(options?.status ? { status: options.status as any } : {}) },
      orderBy: { position: 'asc' },
      skip: options?.skip,
      take: options?.take ?? 100,
    });
  }

  static async create(data: {
    email: string;
    name?: string;
    referralCode?: string;
    source?: string;
    metadata?: unknown;
  }) {
    const count = await prisma.waitlist.count();
    return prisma.waitlist.create({
      data: { ...data, metadata: data.metadata as any, position: count + 1, status: 'PENDING' as any },
    });
  }

  static async approve(id: string) {
    return prisma.waitlist.update({
      where: { id },
      data: { status: 'APPROVED' as any },
    });
  }

  static async markRegistered(id: string) {
    return prisma.waitlist.update({
      where: { id },
      data: { status: 'REGISTERED' as any },
    });
  }

  static async countByStatus() {
    return prisma.waitlist.groupBy({ by: ['status'], _count: true });
  }
}

export default WaitlistRepository;
