// src/services/customPlatformService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PlatformCategory, Prisma } from '@prisma/client';

const log = logger.child({ service: 'CustomPlatformService' });

export interface CreateCustomPlatformInput {
  userId: string;
  name: string;
  displayName?: string;
  description?: string;
  category: PlatformCategory;
  icon?: string;
  color?: string;
  website?: string;
  trackingFields?: Record<string, { type: string; label?: string; required?: boolean }>;
}

export interface UpdateCustomPlatformInput {
  name?: string;
  displayName?: string;
  description?: string;
  category?: PlatformCategory;
  icon?: string;
  color?: string;
  website?: string;
  trackingFields?: Record<string, { type: string; label?: string; required?: boolean }>;
  isActive?: boolean;
}

class CustomPlatformService {
  /**
   * Create custom platform
   */
  async create(data: CreateCustomPlatformInput) {
    try {
      const existing = await prisma.customPlatform.findFirst({
        where: {
          userId: data.userId,
          name: { equals: data.name, mode: 'insensitive' },
        },
      });

      if (existing) {
        throw new Error('Custom platform with this name already exists');
      }

      const platform = await prisma.customPlatform.create({
        data: {
          userId: data.userId,
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          category: data.category,
          icon: data.icon,
          color: data.color,
          website: data.website,
          trackingFields: data.trackingFields as Prisma.InputJsonValue,
          isActive: true,
        },
      });

      log.info('Custom platform created', { id: platform.id, userId: data.userId });

      return platform;
    } catch (error) {
      log.error('Error creating custom platform', { userId: data.userId }, error);
      throw error;
    }
  }

  /**
   * Get all custom platforms for user
   */
  async getAll(userId: string, activeOnly: boolean = true) {
    try {
      const where: Prisma.CustomPlatformWhereInput = { userId };

      if (activeOnly) {
        where.isActive = true;
      }

      const platforms = await prisma.customPlatform.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      log.info('Custom platforms fetched', { userId, count: platforms.length });

      return platforms;
    } catch (error) {
      log.error('Error fetching custom platforms', { userId }, error);
      throw error;
    }
  }

  /**
   * Get custom platform by ID
   */
  async getById(id: string, userId: string) {
    try {
      const platform = await prisma.customPlatform.findFirst({
        where: { id, userId },
      });

      if (platform) {
        log.info('Custom platform fetched', { id, userId });
      }

      return platform;
    } catch (error) {
      log.error('Error fetching custom platform', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Update custom platform
   */
  async update(id: string, userId: string, data: UpdateCustomPlatformInput) {
    try {
      const existing = await prisma.customPlatform.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new Error('Custom platform not found');
      }

      const updateData: Prisma.CustomPlatformUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.trackingFields) {
        updateData.trackingFields = data.trackingFields as Prisma.InputJsonValue;
      }

      const platform = await prisma.customPlatform.update({
        where: { id },
        data: updateData,
      });

      log.info('Custom platform updated', { id, userId });

      return platform;
    } catch (error) {
      log.error('Error updating custom platform', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Delete custom platform
   */
  async delete(id: string, userId: string) {
    try {
      const existing = await prisma.customPlatform.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        throw new Error('Custom platform not found');
      }

      const entriesCount = await prisma.trackerEntry.count({
        where: { customPlatformId: id },
      });

      if (entriesCount > 0) {
        await prisma.customPlatform.update({
          where: { id },
          data: { isActive: false },
        });

        log.info('Custom platform deactivated (has entries)', { id, userId, entriesCount });

        return { deleted: false, deactivated: true, entriesCount };
      }

      await prisma.customPlatform.delete({
        where: { id },
      });

      log.info('Custom platform deleted', { id, userId });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting custom platform', { id, userId }, error);
      throw error;
    }
  }

  /**
   * Get custom platform statistics
   */
  async getStats(id: string, userId: string) {
    try {
      const [platform, entriesCount, totalProblems, totalTime] = await Promise.all([
        prisma.customPlatform.findFirst({
          where: { id, userId },
        }),
        prisma.trackerEntry.count({
          where: { customPlatformId: id },
        }),
        prisma.trackerEntry.aggregate({
          where: { customPlatformId: id },
          _sum: { problemsSolved: true },
        }),
        prisma.trackerEntry.aggregate({
          where: { customPlatformId: id },
          _sum: { timeSpent: true },
        }),
      ]);

      if (!platform) {
        throw new Error('Custom platform not found');
      }

      log.info('Custom platform stats fetched', { id, userId });

      return {
        platform,
        totalEntries: entriesCount,
        totalProblems: totalProblems._sum.problemsSolved || 0,
        totalTime: totalTime._sum.timeSpent || 0,
      };
    } catch (error) {
      log.error('Error fetching custom platform stats', { id, userId }, error);
      throw error;
    }
  }
}

export const customPlatformService = new CustomPlatformService();
export default customPlatformService;