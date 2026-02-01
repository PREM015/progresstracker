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
    mrr: number;
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
  private readonly log = logger.child({ service: 'AdminService' });

  // ==========================================================================
  // DASHBOARD STATS
  // ==========================================================================

  async getStats(): Promise<AdminStats> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfMonth = new Date(now);
      startOfMonth.setDate(1);

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
          if (sub.billingInterval === 'YEARLY') {
            mrr += Math.round(sub.priceAmount / 12);
          } else {
            mrr += sub.priceAmount;
          }
        }
      });

      const [trackerEntriesToday, goalsCreatedToday, achievementsUnlockedToday] =
        await Promise.all([
          prisma.trackerEntry.count({ where: { createdAt: { gte: startOfDay } } }),
          prisma.goal.count({ where: { createdAt: { gte: startOfDay } } }),
          prisma.userAchievement.count({ where: { unlockedAt: { gte: startOfDay } } }),
        ]);

      this.log.info('Admin stats fetched successfully');

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
      this.log.error('Error getting admin stats', {}, error);
      throw error;
    }
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

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

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      if (isBanned !== undefined) {
        where.isBanned = isBanned;
      }

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

      this.log.info('Users fetched', { total, page });

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
      this.log.error('Error getting users', {}, error);
      throw error;
    }
  }

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

      const recentActivity = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      this.log.info('User details fetched', { userId });

      return {
        ...user,
        recentActivity,
      };
    } catch (error) {
      this.log.error('Error getting user details', { userId }, error);
      throw error;
    }
  }

  async banUser(userId: string, reason: string, adminId: string): Promise<void> {
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

      await prisma.activeSession.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: 'User banned' },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ADMIN_ACTION',
          category: 'admin',
          description: `User banned: ${reason}`,
          performedBy: adminId,
        },
      });

      this.log.info('User banned', { userId, adminId, reason });
    } catch (error) {
      this.log.error('Error banning user', { userId }, error);
      throw error;
    }
  }

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

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ADMIN_ACTION',
          category: 'admin',
          description: 'User unbanned',
          performedBy: adminId,
        },
      });

      this.log.info('User unbanned', { userId, adminId });
    } catch (error) {
      this.log.error('Error unbanning user', { userId }, error);
      throw error;
    }
  }

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
          role: role as Role,
          isAdmin,
        },
      });

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

      this.log.info('User role updated', { userId, role, adminId });
    } catch (error) {
      this.log.error('Error updating user role', { userId }, error);
      throw error;
    }
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          email: null,
          name: 'Deleted User',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETE',
          category: 'admin',
          description: 'User account deleted by admin',
          performedBy: adminId,
        },
      });

      this.log.info('User deleted', { userId, adminId });
    } catch (error) {
      this.log.error('Error deleting user', { userId }, error);
      throw error;
    }
  }

  // ==========================================================================
  // PLATFORM MANAGEMENT
  // ==========================================================================

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

      this.log.info('Platforms fetched', { count: platforms.length });

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
      this.log.error('Error getting platforms', {}, error);
      throw error;
    }
  }

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

      this.log.info('Platform status updated', { platformId, isActive, adminId });
    } catch (error) {
      this.log.error('Error updating platform status', { platformId }, error);
      throw error;
    }
  }

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

      this.log.info('Platform maintenance mode set', { platformId, maintenanceMode });
    } catch (error) {
      this.log.error('Error setting platform maintenance', { platformId }, error);
      throw error;
    }
  }

  // ==========================================================================
  // SYNC MANAGEMENT
  // ==========================================================================

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

      this.log.info('Sync queue fetched', { count: syncs.length });

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
      this.log.error('Error getting sync queue', {}, error);
      throw error;
    }
  }

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

      this.log.info('Recent syncs fetched', { count: syncs.length });

      return syncs;
    } catch (error) {
      this.log.error('Error getting recent syncs', {}, error);
      throw error;
    }
  }

  async triggerPlatformSync(platformId: string, adminId: string): Promise<number> {
    try {
      const connections = await prisma.userPlatform.findMany({
        where: {
          platformId,
          isActive: true,
        },
        select: { id: true },
      });

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

      this.log.info('Platform sync triggered', { platformId, count: connections.length });
      return connections.length;
    } catch (error) {
      this.log.error('Error triggering platform sync', { platformId }, error);
      throw error;
    }
  }

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

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

      this.log.info('Audit logs fetched', { total, page });

      return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.log.error('Error getting audit logs', {}, error);
      throw error;
    }
  }

  // ==========================================================================
  // SYSTEM SETTINGS
  // ==========================================================================

  async getSystemSettings(): Promise<Record<string, any>> {
    try {
      const settings = await prisma.systemSettings.findMany();

      const result: Record<string, any> = {};
      settings.forEach((s) => {
        result[s.key] = s.value;
      });

      this.log.info('System settings fetched', { count: settings.length });

      return result;
    } catch (error) {
      this.log.error('Error getting system settings', {}, error);
      throw error;
    }
  }

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

      this.log.info('System setting updated', { key, adminId });
    } catch (error) {
      this.log.error('Error updating system setting', { key }, error);
      throw error;
    }
  }

  // ==========================================================================
  // FEATURE FLAGS
  // ==========================================================================

  async getFeatureFlags(): Promise<any[]> {
    try {
      const flags = await prisma.featureFlag.findMany({
        orderBy: { key: 'asc' },
      });

      this.log.info('Feature flags fetched', { count: flags.length });

      return flags;
    } catch (error) {
      this.log.error('Error getting feature flags', {}, error);
      throw error;
    }
  }

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

      this.log.info('Feature flag updated', { key, adminId });
    } catch (error) {
      this.log.error('Error updating feature flag', { key }, error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;