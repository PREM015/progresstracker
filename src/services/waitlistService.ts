// src/services/waitlistService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';

const log = logger.child({ service: 'WaitlistService' });

export interface JoinWaitlistInput {
  email: string;
  name?: string;
  source?: string;
  referralCode?: string;
}

class WaitlistService {
  /**
   * Join waitlist
   */
  async join(data: JoinWaitlistInput) {
    try {
      const existing = await prisma.waitlist.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existing) {
        if (existing.status === 'joined') {
          throw new Error('Email is already registered');
        }

        // Re-add to waitlist if they were invited but didn't join
        const updated = await prisma.waitlist.update({
          where: { email: data.email.toLowerCase() },
          data: {
            status: 'waiting',
            name: data.name || existing.name,
            source: data.source || existing.source,
            referralCode: data.referralCode || existing.referralCode,
          },
        });

        log.info('Waitlist entry updated', { email: data.email });

        return updated;
      }

      // Get current position
      const position = await this.getNextPosition();

      const entry = await prisma.waitlist.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          source: data.source,
          referralCode: data.referralCode,
          status: 'waiting',
          position,
        },
      });

      log.info('Waitlist entry created', { email: data.email, position });

      return entry;
    } catch (error) {
      log.error('Error joining waitlist', { email: data.email }, error);
      throw error;
    }
  }

  /**
   * Get waitlist entry by email
   */
  async getByEmail(email: string) {
    try {
      const entry = await prisma.waitlist.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (entry) {
        log.info('Waitlist entry fetched', { email });
      }

      return entry;
    } catch (error) {
      log.error('Error fetching waitlist entry', { email }, error);
      throw error;
    }
  }

  /**
   * Get all waitlist entries
   */
  async getAll(filters?: {
    status?: 'waiting' | 'invited' | 'joined';
    source?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        status,
        source,
        page = 1,
        limit = 50,
      } = filters || {};

      const where: Prisma.WaitlistWhereInput = {};

      if (status) where.status = status;
      if (source) where.source = source;

      const [entries, total] = await Promise.all([
        prisma.waitlist.findMany({
          where,
          orderBy: { position: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.waitlist.count({ where }),
      ]);

      log.info('Waitlist entries fetched', { total, page });

      return {
        entries,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      log.error('Error fetching waitlist entries', {}, error);
      throw error;
    }
  }

  /**
   * Invite user from waitlist
   */
  async invite(email: string) {
    try {
      const entry = await prisma.waitlist.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!entry) {
        throw new Error('Email not found on waitlist');
      }

      if (entry.status === 'joined') {
        throw new Error('User has already joined');
      }

      const inviteCode = nanoid(16);

      const updated = await prisma.waitlist.update({
        where: { email: email.toLowerCase() },
        data: {
          status: 'invited',
          invitedAt: new Date(),
          inviteCode,
        },
      });

      log.info('Waitlist user invited', { email, inviteCode });

      return updated;
    } catch (error) {
      log.error('Error inviting waitlist user', { email }, error);
      throw error;
    }
  }

  /**
   * Mark as joined
   */
  async markAsJoined(email: string) {
    try {
      const updated = await prisma.waitlist.update({
        where: { email: email.toLowerCase() },
        data: {
          status: 'joined',
          joinedAt: new Date(),
        },
      });

      log.info('Waitlist user marked as joined', { email });

      return updated;
    } catch (error) {
      log.error('Error marking user as joined', { email }, error);
      throw error;
    }
  }

  /**
   * Get waitlist statistics
   */
  async getStats() {
    try {
      const [total, waiting, invited, joined, bySource] = await Promise.all([
        prisma.waitlist.count(),
        prisma.waitlist.count({ where: { status: 'waiting' } }),
        prisma.waitlist.count({ where: { status: 'invited' } }),
        prisma.waitlist.count({ where: { status: 'joined' } }),
        prisma.waitlist.groupBy({
          by: ['source'],
          _count: true,
          where: { source: { not: null } },
        }),
      ]);

      const sourceMap: Record<string, number> = {};
      bySource.forEach((s) => {
        if (s.source) {
          sourceMap[s.source] = s._count;
        }
      });

      log.info('Waitlist stats fetched');

      return {
        total,
        waiting,
        invited,
        joined,
        bySource: sourceMap,
      };
    } catch (error) {
      log.error('Error fetching waitlist stats', {}, error);
      throw error;
    }
  }

  /**
   * Get next position
   */
  private async getNextPosition(): Promise<number> {
    try {
      const highest = await prisma.waitlist.findFirst({
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      return (highest?.position || 0) + 1;
    } catch (error) {
      log.error('Error getting next position', {}, error);
      return 1;
    }
  }

  /**
   * Bulk invite
   */
  async bulkInvite(count: number) {
    try {
      const waiting = await prisma.waitlist.findMany({
        where: { status: 'waiting' },
        orderBy: { position: 'asc' },
        take: count,
      });

      const invited = await Promise.all(
        waiting.map((entry) => this.invite(entry.email))
      );

      log.info('Bulk waitlist invites sent', { count: invited.length });

      return { invited: invited.length };
    } catch (error) {
      log.error('Error bulk inviting', { count }, error);
      throw error;
    }
  }

  /**
   * Remove from waitlist
   */
  async remove(email: string) {
    try {
      await prisma.waitlist.delete({
        where: { email: email.toLowerCase() },
      });

      log.info('Waitlist entry removed', { email });

      return { removed: true };
    } catch (error) {
      log.error('Error removing from waitlist', { email }, error);
      throw error;
    }
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;