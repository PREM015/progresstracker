/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/adminService.ts

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {

  PlatformCategory,
  SyncStatus,
  SubscriptionTier,
  Role,
  AuditAction,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  platforms: {
    total: number;
    active: number;
    connections: number;
    syncsPending: number;
    syncsToday: number;
  };
  subscriptions: {
    free: number;
    starter: number;
    pro: number;
    team: number;
    enterprise: number;
    mrr: number; // Monthly Recurring Revenue in cents
  };
  activity: {
    trackerEntriesToday: number;
    goalsCreatedToday: number;
    achievementsUnlockedToday: number;
  };
}

export interface UserListFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  isBanned?: boolean;
  tier?: SubscriptionTier;
  sortBy?: 'createdAt' | 'lastActiveAt' | 'totalPoints' | 'currentStreak';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UserListItem {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
  isActive: boolean;
  isBanned: boolean;
  isAdmin: boolean;
  role: string;
  currentStreak: number;
  totalPoints: number;
  tier: SubscriptionTier | null;
  lastActiveAt: Date | null;
  createdAt: Date;
}

export interface PlatformStats {
  id: string;
  name: string;
  slug: string;
  category: PlatformCategory;
  totalUsers: number;
  activeConnections: number;
  successRate: number;
  avgSyncDuration: number | null;
  lastHealthCheck: Date | null;
  healthStatus: string | null;
  isActive: boolean;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  userName: string | null;
  platformName: string;
  status: SyncStatus;
  startedAt: Date;
  duration: number | null;
  errorMessage: string | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AdminService {
  // ==========================================================================
  // DASHBOARD STATS
  // ==========================================================================

  /**
   * Get admin dashboard statistics
   */
  async getStats(): Promise<AdminStats> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfMonth = new Date(now);
      startOfMonth.setDate(1);

      // User stats
      const [
        totalUsers,
        activeUsers,
        bannedUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isBanned: true } }),
        prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      ]);

      // Platform stats
      const [
        totalPlatforms,
        activePlatforms,
        totalConnections,
        pendingSyncs,
        syncsToday,
      ] = await Promise.all([
        prisma.platform.count(),
        prisma.platform.count({ where: { isActive: true } }),
        prisma.userPlatform.count({ where: { isActive: true } }),
        prisma.userPlatform.count({ where: { syncStatus: 'PENDING' } }),
        prisma.syncLog.count({ where: { startedAt: { gte: startOfDay } } }),
      ]);

      // Subscription stats
      const subscriptionCounts = await prisma.subscription.groupBy({
        by: ['tier'],
        _count: { tier: true },
      });

      const subscriptionMap: Record<string, number> = {
        FREE: 0,
        STARTER: 0,
        PRO: 0,
        TEAM: 0,
        ENTERPRISE: 0,
      };

      subscriptionCounts.forEach((s) => {
        subscriptionMap[s.tier] = s._count.tier;
      });

      // Calculate MRR (simplified)
      const paidSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          tier: { not: 'FREE' },
        },
        select: { priceAmount: true, billingInterval: true },
      });

      let mrr = 0;
      paidSubscriptions.forEach((sub) => {
        if (sub.priceAmount) {
          // Convert yearly to monthly
          if (sub.billingInterval === 'YEARLY') {
            mrr += Math.round(sub.priceAmount / 12);
          } else {
            mrr += sub.priceAmount;
          }
        }
      });

      // Activity stats
      const [trackerEntriesToday, goalsCreatedToday, achievementsUnlockedToday] =
        await Promise.all([
          prisma.trackerEntry.count({ where: { createdAt: { gte: startOfDay } } }),
          prisma.goal.count({ where: { createdAt: { gte: startOfDay } } }),
          prisma.userAchievement.count({ where: { unlockedAt: { gte: startOfDay } } }),
        ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
        },
        platforms: {
          total: totalPlatforms,
          active: activePlatforms,
          connections: totalConnections,
          syncsPending: pendingSyncs,
          syncsToday,
        },
        subscriptions: {
          free: subscriptionMap.FREE,
          starter: subscriptionMap.STARTER,
          pro: subscriptionMap.PRO,
          team: subscriptionMap.TEAM,
          enterprise: subscriptionMap.ENTERPRISE,
          mrr,
        },
        activity: {
          trackerEntriesToday,
          goalsCreatedToday,
          achievementsUnlockedToday,
        },
      };
    } catch (error) {
      logger.error('Error getting admin stats:', error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  /**
   * Get paginated user list with filters
   */
  async getUsers(filters: UserListFilters = {}): Promise<{
    users: UserListItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        search,
        role,
        isActive,
        isBanned,
        tier,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = filters;

      const where: any = {};

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Role filter
      if (role) {
        where.role = role;
      }

      // Status filters
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      if (isBanned !== undefined) {
        where.isBanned = isBanned;
      }

      // Tier filter (requires join)
      if (tier) {
        where.subscription = { tier };
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            image: true,
            isActive: true,
            isBanned: true,
            isAdmin: true,
            role: true,
            currentStreak: true,
            totalPoints: true,
            lastActiveAt: true,
            createdAt: true,
            subscription: {
              select: { tier: true },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users: users.map((u) => ({
          ...u,
          tier: u.subscription?.tier || null,
          subscription: undefined,
        })) as UserListItem[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error getting users:', error as Error);
      throw error;
    }
  }

  /**
   * Get user details for admin view
   */
  async getUserDetails(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
          platforms: {
            include: {
              platform: {
                select: { name: true, category: true },
              },
            },
          },
          goals: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          achievements: {
            take: 5,
            include: { achievement: true },
            orderBy: { unlockedAt: 'desc' },
          },
          _count: {
            select: {
              trackerEntries: true,
              goals: true,
              achievements: true,
              notifications: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get recent activity
      const recentActivity = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        ...user,
        recentActivity,
      };
    } catch (error) {
      logger.error('Error getting user details:', error as Error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(
    userId: string,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          isActive: false,
          banReason: reason,
          bannedAt: new Date(),
          bannedBy: adminId,
        },
      });

      // Invalidate all sessions
      await prisma.activeSession.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'User banned' },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ADMIN_ACTION',
          category: 'admin',
          description: `User banned: ${reason}`,
          performedBy: adminId,
        },
      });

      logger.info(`User ${userId} banned by admin ${adminId}`);
    } catch (error) {
      logger.error('Error banning user:', error as Error);
      throw error;
    }
  }

  /**
   * Unban user
   */
  async unbanUser(userId: string, adminId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          isActive: true,
          banReason: null,
          bannedAt: null,
          bannedBy: null,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ADMIN_ACTION',
          category: 'admin',
          description: 'User unbanned',
          performedBy: adminId,
        },
      });

      logger.info(`User ${userId} unbanned by admin ${adminId}`);
    } catch (error) {
      logger.error('Error unbanning user:', error as Error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: string,
    role: string,
    isAdmin: boolean,
    adminId: string
  ): Promise<void> {
    try {
      const oldUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isAdmin: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: role as Role
          , isAdmin
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ADMIN_ACTION',
          category: 'admin',
          description: `Role updated from ${oldUser?.role} to ${role}`,
          oldValue: { role: oldUser?.role, isAdmin: oldUser?.isAdmin },
          newValue: { role, isAdmin },
          performedBy: adminId,
        },
      });

      logger.info(`User ${userId} role updated to ${role} by admin ${adminId}`);
    } catch (error) {
      logger.error('Error updating user role:', error as Error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, adminId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          email: null, // GDPR compliance
          name: 'Deleted User',
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETE',
          category: 'admin',
          description: 'User account deleted by admin',
          performedBy: adminId,
        },
      });

      logger.info(`User ${userId} deleted by admin ${adminId}`);
    } catch (error) {
      logger.error('Error deleting user:', error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // PLATFORM MANAGEMENT
  // ==========================================================================

  /**
   * Get all platforms with stats
   */
  async getPlatforms(): Promise<PlatformStats[]> {
    try {
      const platforms = await prisma.platform.findMany({
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { totalUsers: 'desc' },
      });

      return platforms.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        totalUsers: p.totalUsers,
        activeConnections: p._count.users,
        successRate: p.successRate,
        avgSyncDuration: p.avgSyncDuration,
        lastHealthCheck: p.lastHealthCheck,
        healthStatus: p.healthStatus,
        isActive: p.isActive,
      }));
    } catch (error) {
      logger.error('Error getting platforms:', error as Error);
      throw error;
    }
  }

  /**
   * Update platform status
   */
  async updatePlatformStatus(
    platformId: string,
    isActive: boolean,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.platform.update({
        where: { id: platformId },
        data: { isActive },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_ACTION',
          category: 'admin',
          entityType: 'platform',
          entityId: platformId,
          description: `Platform ${isActive ? 'enabled' : 'disabled'}`,
          performedBy: adminId,
        },
      });

      logger.info(`Platform ${platformId} ${isActive ? 'enabled' : 'disabled'} by admin ${adminId}`);
    } catch (error) {
      logger.error('Error updating platform status:', error as Error);
      throw error;
    }
  }

  /**
   * Set platform maintenance mode
   */
  async setPlatformMaintenance(
    platformId: string,
    maintenanceMode: boolean,
    message?: string,
    adminId?: string
  ): Promise<void> {
    try {
      await prisma.platform.update({
        where: { id: platformId },
        data: {
          maintenanceMode,
          maintenanceMessage: message,
        },
      });

      if (adminId) {
        await prisma.auditLog.create({
          data: {
            action: 'ADMIN_ACTION',
            category: 'admin',
            entityType: 'platform',
            entityId: platformId,
            description: `Platform maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`,
            performedBy: adminId,
          },
        });
      }

      logger.info(`Platform ${platformId} maintenance mode: ${maintenanceMode}`);
    } catch (error) {
      logger.error('Error setting platform maintenance:', error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // SYNC MANAGEMENT
  // ==========================================================================

  /**
   * Get sync queue status
   */
  async getSyncQueue(limit: number = 50): Promise<SyncQueueItem[]> {
    try {
      const syncs = await prisma.syncLog.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          user: { select: { name: true } },
          platform: { select: { name: true } },
        },
        orderBy: { startedAt: 'asc' },
        take: limit,
      });

      return syncs.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.name,
        platformName: s.platform?.name || 'Unknown',
        status: s.status,
        startedAt: s.startedAt,
        duration: s.duration,
        errorMessage: s.errorMessage,
      }));
    } catch (error) {
      logger.error('Error getting sync queue:', error as Error);
      throw error;
    }
  }

  /**
   * Get recent sync logs
   */
  async getRecentSyncs(limit: number = 100): Promise<any[]> {
    try {
      const syncs = await prisma.syncLog.findMany({
        include: {
          user: { select: { name: true, email: true } },
          platform: { select: { name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });

      return syncs;
    } catch (error) {
      logger.error('Error getting recent syncs:', error as Error);
      throw error;
    }
  }

  /**
   * Trigger sync for all users of a platform
   */
  async triggerPlatformSync(platformId: string, adminId: string): Promise<number> {
    try {
      const connections = await prisma.userPlatform.findMany({
        where: {
          platformId,
          isActive: true,
        },
        select: { id: true },
      });

      // Update all to pending
      await prisma.userPlatform.updateMany({
        where: {
          platformId,
          isActive: true,
        },
        data: {
          syncStatus: 'PENDING',
          nextSyncAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_ACTION',
          category: 'admin',
          entityType: 'platform',
          entityId: platformId,
          description: `Triggered sync for ${connections.length} connections`,
          performedBy: adminId,
        },
      });

      logger.info(`Triggered sync for ${connections.length} connections on platform ${platformId}`);
      return connections.length;
    } catch (error) {
      logger.error('Error triggering platform sync:', error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  /**
   * Get audit logs
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: AuditAction;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        userId,
        action,
        category,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = filters;

      const where: any = {};

      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (category) where.category = category;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error getting audit logs:', error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // SYSTEM SETTINGS
  // ==========================================================================

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<Record<string, any>> {
    try {
      const settings = await prisma.systemSettings.findMany();

      const result: Record<string, any> = {};
      settings.forEach((s) => {
        result[s.key] = s.value;
      });

      return result;
    } catch (error) {
      logger.error('Error getting system settings:', error as Error);
      throw error;
    }
  }

  /**
   * Update system setting
   */
  async updateSystemSetting(
    key: string,
    value: any,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.systemSettings.upsert({
        where: { key },
        update: { value, updatedBy: adminId },
        create: { key, value, updatedBy: adminId },
      });

      logger.info(`System setting ${key} updated by admin ${adminId}`);
    } catch (error) {
      logger.error('Error updating system setting:', error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // FEATURE FLAGS
  // ==========================================================================

  /**
   * Get all feature flags
   */
  async getFeatureFlags(): Promise<any[]> {
    try {
      return await prisma.featureFlag.findMany({
        orderBy: { key: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting feature flags:', error as Error);
      throw error;
    }
  }

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    key: string,
    data: {
      isEnabled?: boolean;
      enabledForAll?: boolean;
      enabledUserIds?: string[];
      enabledTiers?: SubscriptionTier[];
      enabledPercentage?: number;
    },
    adminId: string
  ): Promise<void> {
    try {
      await prisma.featureFlag.update({
        where: { key },
        data,
      });

      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_ACTION',
          category: 'admin',
          entityType: 'feature_flag',
          entityId: key,
          description: `Feature flag ${key} updated`,
          newValue: data,
          performedBy: adminId,
        },
      });

      logger.info(`Feature flag ${key} updated by admin ${adminId}`);
    } catch (error) {
      logger.error('Error updating feature flag:', error as Error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;