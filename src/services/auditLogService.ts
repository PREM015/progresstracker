// src/services/auditLogService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AuditAction, Prisma } from '@prisma/client';

export interface CreateAuditLogInput {
  userId?: string;
  action: AuditAction;
  category?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  requestId?: string;
  requestPath?: string;
  requestMethod?: string;
  status?: string;
  errorMessage?: string;
  performedBy?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  category?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

class AuditLogService {
  private readonly log = logger.child({ service: 'AuditLogService' });

  /**
   * Create audit log entry
   */
  async create(data: CreateAuditLogInput) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          category: data.category,
          entityType: data.entityType,
          entityId: data.entityId,
          description: data.description,
          oldValue: data.oldValue as Prisma.InputJsonValue,
          newValue: data.newValue as Prisma.InputJsonValue,
          changes: data.changes as Prisma.InputJsonValue,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          country: data.country,
          city: data.city,
          requestId: data.requestId,
          requestPath: data.requestPath,
          requestMethod: data.requestMethod,
          status: data.status || 'success',
          errorMessage: data.errorMessage,
          performedBy: data.performedBy,
        },
      });

      this.log.info('Audit log created', { id: auditLog.id, action: data.action });

      return auditLog;
    } catch (error) {
      this.log.error('Error creating audit log', { action: data.action }, error);
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: AuditLogFilters = {}) {
    try {
      const {
        userId,
        action,
        category,
        entityType,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = filters;

      const where: Prisma.AuditLogWhereInput = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (category) where.category = category;
      if (entityType) where.entityType = entityType;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      this.log.info('Audit logs fetched', { total, page });

      return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.log.error('Error fetching audit logs', {}, error);
      throw error;
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(userId: string, limit: number = 20) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      this.log.info('User activity fetched', { userId, count: logs.length });

      return logs;
    } catch (error) {
      this.log.error('Error fetching user activity', { userId }, error);
      throw error;
    }
  }

  /**
   * Log user action
   */
  async logUserAction(
    userId: string,
    action: AuditAction,
    description: string,
    context?: {
      entityType?: string;
      entityId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    return this.create({
      userId,
      action,
      description,
      category: 'user',
      ...context,
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    adminId: string,
    action: AuditAction,
    description: string,
    context?: {
      userId?: string;
      entityType?: string;
      entityId?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    }
  ) {
    return this.create({
      ...context,
      action,
      description,
      category: 'admin',
      performedBy: adminId,
    });
  }

  /**
   * Delete old logs (cleanup)
   */
  async deleteOldLogs(daysOld: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      this.log.info('Old audit logs deleted', { count: result.count, daysOld });

      return { deleted: result.count };
    } catch (error) {
      this.log.error('Error deleting old audit logs', { daysOld }, error);
      throw error;
    }
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;