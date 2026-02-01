// src/services/maintenanceService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const log = logger.child({ service: 'MaintenanceService' });

export interface CreateMaintenanceWindowInput {
  title: string;
  message: string;
  startTime: Date;
  endTime: Date;
  affectedServices?: string[];
  createdBy?: string;
}

export interface UpdateMaintenanceWindowInput {
  title?: string;
  message?: string;
  startTime?: Date;
  endTime?: Date;
  isActive?: boolean;
  affectedServices?: string[];
}

class MaintenanceService {
  /**
   * Create maintenance window
   */
  async create(data: CreateMaintenanceWindowInput) {
    try {
      const window = await prisma.maintenanceWindow.create({
        data: {
          title: data.title,
          message: data.message,
          startTime: data.startTime,
          endTime: data.endTime,
          affectedServices: data.affectedServices || [],
          isActive: false,
          createdBy: data.createdBy,
        },
      });

      log.info('Maintenance window created', { id: window.id });

      return window;
    } catch (error) {
      log.error('Error creating maintenance window', {}, error);
      throw error;
    }
  }

  /**
   * Get all maintenance windows
   */
  async getAll(includeInactive: boolean = false) {
    try {
      const where: Prisma.MaintenanceWindowWhereInput = {};

      if (!includeInactive) {
        where.isActive = true;
      }

      const windows = await prisma.maintenanceWindow.findMany({
        where,
        orderBy: { startTime: 'desc' },
      });

      log.info('Maintenance windows fetched', { count: windows.length });

      return windows;
    } catch (error) {
      log.error('Error fetching maintenance windows', {}, error);
      throw error;
    }
  }

  /**
   * Get active maintenance window
   */
  async getActive() {
    try {
      const now = new Date();

      const window = await prisma.maintenanceWindow.findFirst({
        where: {
          isActive: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      });

      if (window) {
        log.info('Active maintenance window found', { id: window.id });
      }

      return window;
    } catch (error) {
      log.error('Error fetching active maintenance window', {}, error);
      return null;
    }
  }

  /**
   * Get upcoming maintenance windows
   */
  async getUpcoming(limit: number = 5) {
    try {
      const now = new Date();

      const windows = await prisma.maintenanceWindow.findMany({
        where: {
          startTime: { gt: now },
        },
        orderBy: { startTime: 'asc' },
        take: limit,
      });

      log.info('Upcoming maintenance windows fetched', { count: windows.length });

      return windows;
    } catch (error) {
      log.error('Error fetching upcoming maintenance windows', {}, error);
      throw error;
    }
  }

  /**
   * Update maintenance window
   */
  async update(id: string, data: UpdateMaintenanceWindowInput) {
    try {
      const updateData: Prisma.MaintenanceWindowUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      const window = await prisma.maintenanceWindow.update({
        where: { id },
        data: updateData,
      });

      log.info('Maintenance window updated', { id });

      return window;
    } catch (error) {
      log.error('Error updating maintenance window', { id }, error);
      throw error;
    }
  }

  /**
   * Activate maintenance window
   */
  async activate(id: string) {
    try {
      const window = await prisma.maintenanceWindow.update({
        where: { id },
        data: { isActive: true },
      });

      log.info('Maintenance window activated', { id });

      return window;
    } catch (error) {
      log.error('Error activating maintenance window', { id }, error);
      throw error;
    }
  }

  /**
   * Deactivate maintenance window
   */
  async deactivate(id: string) {
    try {
      const window = await prisma.maintenanceWindow.update({
        where: { id },
        data: { isActive: false },
      });

      log.info('Maintenance window deactivated', { id });

      return window;
    } catch (error) {
      log.error('Error deactivating maintenance window', { id }, error);
      throw error;
    }
  }

  /**
   * Delete maintenance window
   */
  async delete(id: string) {
    try {
      await prisma.maintenanceWindow.delete({
        where: { id },
      });

      log.info('Maintenance window deleted', { id });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting maintenance window', { id }, error);
      throw error;
    }
  }

  /**
   * Check if system is in maintenance mode
   */
  async isInMaintenanceMode(): Promise<boolean> {
    try {
      const active = await this.getActive();
      return !!active;
    } catch (error) {
      log.error('Error checking maintenance mode', {}, error);
      return false;
    }
  }

  /**
   * Auto-deactivate expired maintenance windows
   */
  async deactivateExpired() {
    try {
      const now = new Date();

      const result = await prisma.maintenanceWindow.updateMany({
        where: {
          isActive: true,
          endTime: { lt: now },
        },
        data: {
          isActive: false,
        },
      });

      log.info('Expired maintenance windows deactivated', { count: result.count });

      return { deactivated: result.count };
    } catch (error) {
      log.error('Error deactivating expired windows', {}, error);
      throw error;
    }
  }
}

export const maintenanceService = new MaintenanceService();
export default maintenanceService;