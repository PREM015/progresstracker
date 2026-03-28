// src/repositories/supportTicket.repository.ts
// Support ticket data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class SupportTicketRepository {
  static async findByUserId(userId: string, options?: { status?: string; skip?: number; take?: number }) {
    return prisma.supportTicket.findMany({
      where: { userId, ...(options?.status ? { status: options.status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 20,
    });
  }

  static async findById(id: string) {
    return prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, image: true, role: true } } },
        },
      },
    });
  }

  static async findAll(options: { status?: string; priority?: string; category?: string; search?: string; skip?: number; take?: number }) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(options.status ? { status: options.status as any } : {}),
      ...(options.priority ? { priority: options.priority as any } : {}),
      ...(options.category ? { category: options.category as any } : {}),
      ...(options.search ? { OR: [
        { subject: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        skip: options.skip,
        take: options.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    return { tickets, total };
  }

  static async create(data: Prisma.SupportTicketCreateInput) {
    return prisma.supportTicket.create({ data });
  }

  static async update(id: string, data: Prisma.SupportTicketUpdateInput) {
    return prisma.supportTicket.update({ where: { id }, data });
  }

  static async addReply(ticketId: string, data: { authorId?: string; content: string; isInternal?: boolean; attachments?: string[] }) {
    const { authorId, content, ...rest } = data;
    return prisma.ticketReply.create({ data: { ticketId, userId: authorId, message: content, ...rest } });
  }

  static async countByStatus() {
    return prisma.supportTicket.groupBy({ by: ['status'], _count: true });
  }
}

export default SupportTicketRepository;
