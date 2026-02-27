// src/services/supportService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

const log = logger.child({ service: 'SupportService' });

export interface CreateTicketInput {
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority?: TicketPriority;
  metadata?: Record<string, unknown>;
  attachments?: string[];
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  resolution?: string;
}

export interface CreateReplyInput {
  ticketId: string;
  userId?: string;
  message: string;
  isStaffReply?: boolean;
  isAutoReply?: boolean;
  isInternal?: boolean;
  attachments?: string[];
}

class SupportService {
  /**
   * Create support ticket
   */
  async createTicket(data: CreateTicketInput) {
    try {
      const ticketNumber = this.generateTicketNumber();

      const ticket = await prisma.supportTicket.create({
        data: {
          userId: data.userId,
          ticketNumber,
          subject: data.subject,
          description: data.description,
          category: data.category,
          priority: data.priority || 'MEDIUM',
          status: 'OPEN',
          metadata: data.metadata as Prisma.InputJsonValue,
          attachments: data.attachments || [],
        },
      });

      log.info('Support ticket created', { 
        id: ticket.id, 
        ticketNumber, 
        userId: data.userId 
      });

      return ticket;
    } catch (error) {
      log.error('Error creating support ticket', { userId: data.userId }, error);
      throw error;
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string, status?: TicketStatus) {
    try {
      const where: Prisma.SupportTicketWhereInput = { userId };

      if (status) {
        where.status = status;
      }

      const tickets = await prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { replies: true },
          },
        },
      });

      log.info('User tickets fetched', { userId, count: tickets.length });

      return tickets;
    } catch (error) {
      log.error('Error fetching user tickets', { userId }, error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getById(id: string, userId?: string) {
    try {
      const where: Prisma.SupportTicketWhereInput = { id };

      if (userId) {
        where.userId = userId;
      }

      const ticket = await prisma.supportTicket.findFirst({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (ticket) {
        log.info('Ticket fetched', { id, userId });
      }

      return ticket;
    } catch (error) {
      log.error('Error fetching ticket', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Get ticket by ticket number
   */
  async getByTicketNumber(ticketNumber: string, userId?: string) {
    try {
      const where: Prisma.SupportTicketWhereInput = { ticketNumber };

      if (userId) {
        where.userId = userId;
      }

      const ticket = await prisma.supportTicket.findFirst({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (ticket) {
        log.info('Ticket fetched by number', { ticketNumber, userId });
      }

      return ticket;
    } catch (error) {
      log.error('Error fetching ticket by number', { ticketNumber }, error);
      throw error;
    }
  }

  /**
   * Update ticket
   */
  async updateTicket(id: string, data: UpdateTicketInput, userId?: string) {
    try {
      const where: Prisma.SupportTicketWhereInput = { id };

      if (userId) {
        where.userId = userId;
      }

      const updateData: Prisma.SupportTicketUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.status === 'RESOLVED' && !data.resolution) {
        updateData.resolvedAt = new Date();
      }

      const ticket = await prisma.supportTicket.updateMany({
        where,
        data: updateData,
      });

      if (ticket.count === 0) {
        throw new Error('Ticket not found or access denied');
      }

      log.info('Ticket updated', { id, userId });

      return await this.getById(id, userId);
    } catch (error) {
      log.error('Error updating ticket', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Add reply to ticket
   */
  async addReply(data: CreateReplyInput) {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: data.ticketId },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const reply = await prisma.ticketReply.create({
        data: {
          ticketId: data.ticketId,
          userId: data.userId,
          message: data.message,
          isStaffReply: data.isStaffReply || false,
          isAutoReply: data.isAutoReply || false,
          isInternal: data.isInternal || false,
          attachments: data.attachments || [],
        },
      });

      // Update ticket status if it was closed
      if (ticket.status === 'CLOSED') {
        await prisma.supportTicket.update({
          where: { id: data.ticketId },
          data: { status: 'OPEN' },
        });
      }

      log.info('Ticket reply added', { 
        replyId: reply.id, 
        ticketId: data.ticketId, 
        userId: data.userId 
      });

      return reply;
    } catch (error) {
      log.error('Error adding ticket reply', { ticketId: data.ticketId }, error);
      throw error;
    }
  }

  /**
   * Close ticket
   */
  async closeTicket(id: string, resolution?: string, userId?: string) {
    try {
      return this.updateTicket(
        id,
        {
          status: 'CLOSED',
          resolution,
        },
        userId
      );
    } catch (error) {
      log.error('Error closing ticket', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Resolve ticket
   */
  async resolveTicket(id: string, resolution: string, userId?: string) {
    try {
      return this.updateTicket(
        id,
        {
          status: 'RESOLVED',
          resolution,
        },
        userId
      );
    } catch (error) {
      log.error('Error resolving ticket', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Rate ticket resolution
   */
  async rateTicket(id: string, userId: string, rating: number, comment?: string) {
    try {
      const ticket = await prisma.supportTicket.updateMany({
        where: { id, userId },
        data: {
          satisfactionRating: rating,
          feedbackComment: comment,
        },
      });

      if (ticket.count === 0) {
        throw new Error('Ticket not found or access denied');
      }

      log.info('Ticket rated', { id, userId, rating });

      return await this.getById(id, userId);
    } catch (error) {
      log.error('Error rating ticket', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Get all tickets (admin)
   */
  async getAllTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        status,
        priority,
        category,
        assignedTo,
        page = 1,
        limit = 20,
      } = filters || {};

      const where: Prisma.SupportTicketWhereInput = {};

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (category) where.category = category;
      if (assignedTo) where.assignedTo = assignedTo;

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: { replies: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.supportTicket.count({ where }),
      ]);

      log.info('All tickets fetched (admin)', { total, page });

      return {
        tickets,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      log.error('Error fetching all tickets', {}, error);
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getStats(userId?: string) {
    try {
      const where: Prisma.SupportTicketWhereInput = userId ? { userId } : {};

      const [total, open, inProgress, resolved, closed, avgRating] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
        prisma.supportTicket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        prisma.supportTicket.count({ where: { ...where, status: 'RESOLVED' } }),
        prisma.supportTicket.count({ where: { ...where, status: 'CLOSED' } }),
        prisma.supportTicket.aggregate({
          where: { ...where, satisfactionRating: { not: null } },
          _avg: { satisfactionRating: true },
        }),
      ]);

      log.info('Ticket stats fetched', { userId });

      return {
        total,
        open,
        inProgress,
        resolved,
        closed,
        avgRating: avgRating._avg.satisfactionRating || 0,
      };
    } catch (error) {
      log.error('Error fetching ticket stats', { userId }, error);
      throw error;
    }
  }

  /**
   * Generate ticket number
   */
  private generateTicketNumber(): string {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = nanoid(4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}

export const supportService = new SupportService();
export default supportService;