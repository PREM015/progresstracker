// src/services/goalReminderService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { NotificationChannel, Prisma } from '@prisma/client';

const log = logger.child({ service: 'GoalReminderService' });

export interface CreateGoalReminderInput {
  goalId: string;
  userId: string;
  frequency: 'daily' | 'weekdays' | 'weekly' | 'custom';
  time: string;
  timezone?: string;
  days?: number[];
  channel?: NotificationChannel;
}

export interface UpdateGoalReminderInput {
  frequency?: 'daily' | 'weekdays' | 'weekly' | 'custom';
  time?: string;
  timezone?: string;
  days?: number[];
  channel?: NotificationChannel;
  isActive?: boolean;
}

class GoalReminderService {
  /**
   * Create goal reminder
   */
  async create(data: CreateGoalReminderInput) {
    try {
      const goal = await prisma.goal.findUnique({
        where: { id: data.goalId },
      });

      if (!goal) {
        throw new Error('Goal not found');
      }

      if (goal.userId !== data.userId) {
        throw new Error('Unauthorized');
      }

      const nextSendAt = this.calculateNextSendTime(
        data.frequency,
        data.time,
        data.days || [],
        data.timezone || 'UTC'
      );

      const reminder = await prisma.goalReminder.create({
        data: {
          goalId: data.goalId,
          userId: data.userId,
          frequency: data.frequency,
          time: data.time,
          timezone: data.timezone || 'UTC',
          days: data.days || [],
          channel: data.channel || 'IN_APP',
          isActive: true,
          nextSendAt,
        },
      });

      log.info('Goal reminder created', { id: reminder.id, goalId: data.goalId });

      return reminder;
    } catch (error) {
      log.error('Error creating goal reminder', { goalId: data.goalId }, error);
      throw error;
    }
  }

  /**
   * Get reminders for goal
   */
  async getByGoal(goalId: string, userId: string) {
    try {
      const reminders = await prisma.goalReminder.findMany({
        where: {
          goalId,
          userId,
        },
        orderBy: { createdAt: 'desc' },
      });

      log.info('Goal reminders fetched', { goalId, count: reminders.length });

      return reminders;
    } catch (error) {
      log.error('Error fetching goal reminders', { goalId }, error);
      throw error;
    }
  }

  /**
   * Get all reminders for user
   */
  async getByUser(userId: string, activeOnly: boolean = true) {
    try {
      const where: Prisma.GoalReminderWhereInput = { userId };

      if (activeOnly) {
        where.isActive = true;
      }

      const reminders = await prisma.goalReminder.findMany({
        where,
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { nextSendAt: 'asc' },
      });

      log.info('User reminders fetched', { userId, count: reminders.length });

      return reminders;
    } catch (error) {
      log.error('Error fetching user reminders', { userId }, error);
      throw error;
    }
  }

  /**
   * Get reminders due now
   */
  async getDueReminders() {
    try {
      const now = new Date();

      const reminders = await prisma.goalReminder.findMany({
        where: {
          isActive: true,
          nextSendAt: {
            lte: now,
          },
        },
        include: {
          goal: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      log.info('Due reminders fetched', { count: reminders.length });

      return reminders;
    } catch (error) {
      log.error('Error fetching due reminders', {}, error);
      throw error;
    }
  }

  /**
   * Update reminder
   */
  async update(id: string, userId: string, data: UpdateGoalReminderInput) {
    try {
      const existing = await prisma.goalReminder.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new Error('Reminder not found');
      }

      const updateData: Prisma.GoalReminderUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.frequency || data.time || data.days || data.timezone) {
        updateData.nextSendAt = this.calculateNextSendTime(
          data.frequency || existing.frequency,
          data.time || existing.time,
          data.days || existing.days,
          data.timezone || existing.timezone
        );
      }

      const reminder = await prisma.goalReminder.update({
        where: { id },
        data: updateData,
      });

      log.info('Goal reminder updated', { id, userId });

      return reminder;
    } catch (error) {
      log.error('Error updating goal reminder', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Delete reminder
   */
  async delete(id: string, userId: string) {
    try {
      const existing = await prisma.goalReminder.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new Error('Reminder not found');
      }

      await prisma.goalReminder.delete({
        where: { id },
      });

      log.info('Goal reminder deleted', { id, userId });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting goal reminder', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Mark reminder as sent
   */
  async markAsSent(id: string) {
    try {
      const reminder = await prisma.goalReminder.findUnique({
        where: { id },
      });

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      const nextSendAt = this.calculateNextSendTime(
        reminder.frequency,
        reminder.time,
        reminder.days,
        reminder.timezone
      );

      await prisma.goalReminder.update({
        where: { id },
        data: {
          lastSentAt: new Date(),
          nextSendAt,
          sendCount: { increment: 1 },
        },
      });

      log.info('Reminder marked as sent', { id });
    } catch (error) {
      log.error('Error marking reminder as sent', { id }, error);
      throw error;
    }
  }

  /**
   * Calculate next send time
   */
  private calculateNextSendTime(
    frequency: string,
    time: string,
    days: number[],
    timezone: string
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const timeman =  timezone.split('/')[1] || 'UTC';
    console.log('timeman', timeman);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case 'daily':
        break;
      case 'weekdays':
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'weekly':
        if (days.length > 0) {
          const targetDay = days[0];
          while (next.getDay() !== targetDay) {
            next.setDate(next.getDate() + 1);
          }
        }
        break;
      case 'custom':
        if (days.length > 0) {
          while (!days.includes(next.getDay())) {
            next.setDate(next.getDate() + 1);
          }
        }
        break;
    }

    return next;
  }
}

export const goalReminderService = new GoalReminderService();
export default goalReminderService;