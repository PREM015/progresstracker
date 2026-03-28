// src/repositories/ticketReply.repository.ts
// Ticket reply data access

import { prisma } from '@/lib/prisma';

export class TicketReplyRepository {
  static async findByTicketId(ticketId: string, options?: { isInternal?: boolean }) {
    return prisma.ticketReply.findMany({
      where: { ticketId, ...(options?.isInternal !== undefined ? { isInternal: options.isInternal } : {}) },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async findById(id: string) {
    return prisma.ticketReply.findUnique({ where: { id } });
  }

  static async create(data: { ticketId: string; authorId?: string; content: string; isInternal?: boolean }) {
    const { authorId, content, ...rest } = data;
    return prisma.ticketReply.create({ data: { ...rest, userId: authorId, message: content } });
  }

  static async update(id: string, data: { content: string }) {
    return prisma.ticketReply.update({
      where: { id },
      data: { message: data.content },
    });
  }

  static async delete(id: string) {
    return prisma.ticketReply.delete({ where: { id } });
  }
}

export default TicketReplyRepository;
