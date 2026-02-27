// ===== FILE: src/lib/database.ts =====
// Database connection utilities and helpers for production use
// This file provides a centralized database access layer with:
// - Connection management
// - Health checks
// - Transaction helpers
// - Error handling
// - Query utilities
// - Logging and monitoring

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Database health check result
 */
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  timestamp: Date;
  details?: {
    connectionPool?: {
      active: number;
      idle: number;
      total: number;
    };
    version?: string;
    database?: string;
  };
  error?: string;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Database error types for better error handling
 */
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom database error class
 */
export class DatabaseError extends Error {
  public readonly type: DatabaseErrorType;
  public readonly originalError?: Error;
  public readonly code?: string;
  public readonly meta?: Record<string, unknown>;

  constructor(
    message: string,
    type: DatabaseErrorType,
    originalError?: Error,
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.type = type;
    this.originalError = originalError;
    this.meta = meta;

    if (originalError && 'code' in originalError) {
      this.code = (originalError as { code: string }).code;
    }

    Error.captureStackTrace(this, DatabaseError);
  }
}

// =============================================================================
// DATABASE CLIENT EXPORTS
// =============================================================================

/**
 * Primary database client export
 * Use `db` for all database operations throughout the application
 *
 * @example
 * import { db } from '@/lib/database';
 * const users = await db.user.findMany();
 */
export const db = prisma;

/**
 * Re-export prisma for backward compatibility
 * Prefer using `db` in new code
 */
export { prisma };

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Explicitly connect to the database
 * Usually not needed as Prisma connects lazily on first query
 */
export async function connectDB(): Promise<void> {
  const startTime = Date.now();

  try {
    await db.$connect();
    const latency = Date.now() - startTime;
    console.log(`✅ Database connected successfully (${latency}ms)`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw new DatabaseError(
      'Failed to connect to database',
      DatabaseErrorType.CONNECTION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Gracefully disconnect from the database
 * Call this during application shutdown
 */
export async function disconnectDB(): Promise<void> {
  try {
    await db.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
    throw new DatabaseError(
      'Failed to disconnect from database',
      DatabaseErrorType.CONNECTION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

/**
 * Perform a database health check
 * Use for monitoring, load balancers, and kubernetes probes
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const result = await db.$queryRaw<[{ version: string; current_database: string }]>`
      SELECT version(), current_database()
    `;

    const latency = Date.now() - startTime;

    let status: DatabaseHealthCheck['status'] = 'healthy';
    if (latency > 1000) {
      status = 'degraded';
    }

    return {
      status,
      latency,
      timestamp,
      details: {
        version: result[0]?.version?.split(' ')[0] || 'unknown',
        database: result[0]?.current_database || 'unknown',
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      status: 'unhealthy',
      latency,
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simple ping to check if database is reachable
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// TRANSACTION HELPERS
// =============================================================================

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
  maxWait: 5000,
  timeout: 10000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
};

/**
 * Execute operations within a transaction
 * Automatically handles commit/rollback
 */
export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const opts = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

  try {
    return await db.$transaction(fn, {
      maxWait: opts.maxWait,
      timeout: opts.timeout,
      isolationLevel: opts.isolationLevel,
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

/**
 * Execute multiple operations in a batch transaction
 */
export async function batchTransaction<T extends Prisma.PrismaPromise<unknown>[]>(
  operations: [...T]
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  try {
    return (await db.$transaction(operations)) as { [K in keyof T]: Awaited<T[K]> };
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

export function calculateOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

export function createPaginatedResult<T>(
  data: T[],
  options: PaginationOptions,
  total: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNext: options.page < totalPages,
      hasPrev: options.page > 1,
    },
  };
}

export async function paginate<T, A>(
  model: {
    findMany: (args?: A) => Promise<T[]>;
    count: (args?: { where?: unknown }) => Promise<number>;
  },
  options: PaginationOptions,
  args?: A & { where?: unknown }
): Promise<PaginatedResult<T>> {
  const skip = calculateOffset(options.page, options.limit);
  const take = options.limit;

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take } as A),
    model.count({ where: (args as { where?: unknown })?.where }),
  ]);

  return createPaginatedResult(data, options, total);
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

const PRISMA_ERROR_MAP: Record<string, DatabaseErrorType> = {
  P1001: DatabaseErrorType.CONNECTION_ERROR,
  P1002: DatabaseErrorType.TIMEOUT,
  P1003: DatabaseErrorType.NOT_FOUND,
  P1008: DatabaseErrorType.TIMEOUT,
  P1017: DatabaseErrorType.CONNECTION_ERROR,
  P2000: DatabaseErrorType.CONSTRAINT_VIOLATION,
  P2001: DatabaseErrorType.NOT_FOUND,
  P2002: DatabaseErrorType.CONSTRAINT_VIOLATION,
  P2003: DatabaseErrorType.CONSTRAINT_VIOLATION,
  P2025: DatabaseErrorType.NOT_FOUND,
  P2028: DatabaseErrorType.TRANSACTION_ERROR,
};

export function handleDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorType = PRISMA_ERROR_MAP[error.code] || DatabaseErrorType.QUERY_ERROR;

    let message = error.message;
    switch (error.code) {
      case 'P2002':
        const fields = (error.meta?.target as string[])?.join(', ') || 'field';
        message = `A record with this ${fields} already exists`;
        break;
      case 'P2003':
        message = 'Referenced record does not exist';
        break;
      case 'P2025':
        message = 'Record not found';
        break;
    }

    return new DatabaseError(message, errorType, error, error.meta as Record<string, unknown>);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError('Invalid data provided', DatabaseErrorType.QUERY_ERROR, error);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError('Database initialization failed', DatabaseErrorType.CONNECTION_ERROR, error);
  }

  if (error instanceof Error) {
    return new DatabaseError(error.message, DatabaseErrorType.UNKNOWN, error);
  }

  return new DatabaseError('An unknown database error occurred', DatabaseErrorType.UNKNOWN);
}

export function isDatabaseError(error: unknown, type?: DatabaseErrorType): error is DatabaseError {
  if (!(error instanceof DatabaseError)) {
    return false;
  }
  if (type) {
    return error.type === type;
  }
  return true;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return isDatabaseError(error, DatabaseErrorType.CONSTRAINT_VIOLATION) && error.code === 'P2002';
}

export function isNotFoundError(error: unknown): boolean {
  return isDatabaseError(error, DatabaseErrorType.NOT_FOUND);
}

// =============================================================================
// QUERY UTILITIES
// =============================================================================

export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

export async function withRetry<T>(
  queryFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    shouldRetry = (error) => {
      if (error instanceof DatabaseError) {
        return [DatabaseErrorType.CONNECTION_ERROR, DatabaseErrorType.TIMEOUT].includes(error.type);
      }
      return false;
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;

      const dbError = handleDatabaseError(error);

      if (attempt === maxRetries || !shouldRetry(dbError)) {
        throw dbError;
      }

      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.warn(`Database query failed (attempt ${attempt}/${maxRetries}). Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw handleDatabaseError(lastError);
}

export async function findOrNull<T>(queryFn: () => Promise<T>): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error) {
    const dbError = handleDatabaseError(error);
    if (dbError.type === DatabaseErrorType.NOT_FOUND) {
      return null;
    }
    throw dbError;
  }
}

// =============================================================================
// SOFT DELETE HELPERS (Matches your schema's deletedAt field)
// =============================================================================

/**
 * Soft delete a record by setting deletedAt timestamp
 * Works with User model which has deletedAt field
 */
export async function softDeleteUser(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restore a soft-deleted user
 */
export async function restoreUser(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { deletedAt: null },
  });
}

/**
 * Find users excluding soft-deleted ones
 */
export async function findActiveUsers(options?: {
  where?: Prisma.UserWhereInput;
  take?: number;
  skip?: number;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}) {
  return db.user.findMany({
    where: {
      ...options?.where,
      deletedAt: null,
    },
    take: options?.take,
    skip: options?.skip,
    orderBy: options?.orderBy,
  });
}

// =============================================================================
// MODEL-SPECIFIC HELPERS (Based on your schema)
// =============================================================================

/**
 * User helpers
 */
export const userHelpers = {
  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string) {
    return db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  },

  /**
   * Find user by username
   */
  async findByUsername(username: string) {
    return db.user.findUnique({
      where: { username },
    });
  },

  /**
   * Find user with all relations
   */
  async findWithRelations(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        settings: true,
        notificationPrefs: true,
        platforms: {
          include: {
            platform: true,
          },
        },
        subscription: true,
      },
    });
  },

  /**
   * Update last activity
   */
  async updateLastActivity(userId: string) {
    return db.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  },

  /**
   * Update streak data
   */
  async updateStreak(
    userId: string,
    data: {
      currentStreak?: number;
      longestStreak?: number;
      lastActivityDate?: Date;
      streakStartDate?: Date;
    }
  ) {
    // Ensure longestStreak is always >= currentStreak
    if (data.currentStreak && data.longestStreak === undefined) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { longestStreak: true },
      });
      if (user && data.currentStreak > user.longestStreak) {
        data.longestStreak = data.currentStreak;
      }
    }

    return db.user.update({
      where: { id: userId },
      data,
    });
  },

  /**
   * Increment user stats
   */
  async incrementStats(
    userId: string,
    stats: {
      totalProblems?: number;
      totalCommits?: number;
      totalProjects?: number;
      totalCertifications?: number;
      totalAchievements?: number;
      totalPoints?: number;
    }
  ) {
    return db.user.update({
      where: { id: userId },
      data: {
        totalProblems: stats.totalProblems ? { increment: stats.totalProblems } : undefined,
        totalCommits: stats.totalCommits ? { increment: stats.totalCommits } : undefined,
        totalProjects: stats.totalProjects ? { increment: stats.totalProjects } : undefined,
        totalCertifications: stats.totalCertifications ? { increment: stats.totalCertifications } : undefined,
        totalAchievements: stats.totalAchievements ? { increment: stats.totalAchievements } : undefined,
        totalPoints: stats.totalPoints ? { increment: stats.totalPoints } : undefined,
      },
    });
  },
};

/**
 * Platform helpers
 */
export const platformHelpers = {
  /**
   * Find platform by slug
   */
  async findBySlug(slug: string) {
    return db.platform.findUnique({
      where: { slug },
    });
  },

  /**
   * Get all active platforms
   */
  async getActivePlatforms() {
    return db.platform.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get platforms by category
   */
  async getByCategory(category: Prisma.EnumPlatformCategoryFilter) {
    return db.platform.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get user's connected platforms
   */
  async getUserPlatforms(userId: string) {
    return db.userPlatform.findMany({
      where: { userId, isActive: true },
      include: { platform: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};

/**
 * Tracker entry helpers
 */
export const trackerHelpers = {
  /**
   * Get entries for date range
   */
  async getEntriesForDateRange(userId: string, startDate: Date, endDate: Date) {
    return db.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { platform: true },
      orderBy: { date: 'desc' },
    });
  },

  /**
   * Get today's entries
   */
  async getTodayEntries(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return db.trackerEntry.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { platform: true },
    });
  },

  /**
   * Get aggregated stats for a period
   */
  async getAggregatedStats(userId: string, startDate: Date, endDate: Date) {
    const result = await db.trackerEntry.aggregate({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        problemsSolved: true,
        commits: true,
        pullRequests: true,
        timeSpent: true,
        coursesCompleted: true,
        certificationsEarned: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalProblems: result._sum.problemsSolved || 0,
      totalCommits: result._sum.commits || 0,
      totalPullRequests: result._sum.pullRequests || 0,
      totalTimeSpent: result._sum.timeSpent || 0,
      totalCourses: result._sum.coursesCompleted || 0,
      totalCertifications: result._sum.certificationsEarned || 0,
      entryCount: result._count.id,
    };
  },
};

/**
 * Goal helpers
 */
export const goalHelpers = {
  /**
   * Get active goals for user
   */
  async getActiveGoals(userId: string) {
    return db.goal.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: { platform: true },
      orderBy: { deadline: 'asc' },
    });
  },

  /**
   * Update goal progress
   */
  async updateProgress(goalId: string, progress: number) {
    const goal = await db.goal.findUnique({
      where: { id: goalId },
      select: { target: true },
    });

    if (!goal) {
      throw new DatabaseError('Goal not found', DatabaseErrorType.NOT_FOUND);
    }

    const progressPercentage = Math.min(100, (progress / goal.target) * 100);
    const isCompleted = progress >= goal.target;

    return db.goal.update({
      where: { id: goalId },
      data: {
        progress,
        progressPercentage,
        status: isCompleted ? 'COMPLETED' : undefined,
        completedAt: isCompleted ? new Date() : undefined,
      },
    });
  },

  /**
   * Get goals expiring soon
   */
  async getExpiringGoals(userId: string, withinDays: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return db.goal.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        deadline: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { deadline: 'asc' },
    });
  },
};

/**
 * Sync log helpers
 */
export const syncHelpers = {
  /**
   * Create sync log entry
   */
  async createSyncLog(data: {
    userId: string;
    platformId?: string;
    userPlatformId?: string;
    status: Prisma.EnumSyncStatusFilter;
    triggeredBy?: string;
  }) {
    return db.syncLog.create({
      data: {
        userId: data.userId,
        platformId: data.platformId,
        userPlatformId: data.userPlatformId,
        status: data.status as unknown as 'IDLE' | 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CANCELLED' | 'RATE_LIMITED',
        triggeredBy: data.triggeredBy || 'manual',
        startedAt: new Date(),
      },
    });
  },

  /**
   * Complete sync log
   */
  async completeSyncLog(
    syncLogId: string,
    result: {
      status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      itemsFound?: number;
      itemsCreated?: number;
      itemsUpdated?: number;
      itemsSkipped?: number;
      itemsFailed?: number;
      errorMessage?: string;
    }
  ) {
    const startedLog = await db.syncLog.findUnique({
      where: { id: syncLogId },
      select: { startedAt: true },
    });

    const duration = startedLog ? Date.now() - startedLog.startedAt.getTime() : undefined;

    return db.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: result.status,
        completedAt: new Date(),
        duration,
        itemsFound: result.itemsFound,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
        itemsSkipped: result.itemsSkipped,
        itemsFailed: result.itemsFailed,
        hasError: result.status === 'FAILED',
        errorMessage: result.errorMessage,
      },
    });
  },

  /**
   * Get recent sync logs
   */
  async getRecentLogs(userId: string, limit: number = 10) {
    return db.syncLog.findMany({
      where: { userId },
      include: { platform: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

/**
 * Notification helpers
 */
export const notificationHelpers = {
  /**
   * Create notification
   */
  async create(data: {
    userId: string;
    type: Prisma.EnumNotificationTypeFilter;
    title: string;
    message: string;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  }) {
    return db.notification.create({
      data: {
        userId: data.userId,
        type: data.type as unknown as 'SYSTEM' | 'ACHIEVEMENT_UNLOCKED' | 'GOAL_REMINDER' | 'GOAL_COMPLETED' | 'GOAL_FAILED' | 'STREAK_AT_RISK' | 'STREAK_BROKEN' | 'STREAK_MILESTONE' | 'SYNC_COMPLETE' | 'SYNC_FAILED' | 'WEEKLY_REPORT' | 'MONTHLY_REPORT' | 'NEW_FEATURE' | 'SECURITY_ALERT' | 'BILLING_ALERT' | 'WELCOME' | 'CUSTOM',
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        entityType: data.entityType,
        entityId: data.entityId,
        priority: data.priority || 'NORMAL',
      },
    });
  },

  /**
   * Get unread notifications
   */
  async getUnread(userId: string, limit: number = 20) {
    return db.notification.findMany({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Mark as read
   */
  async markAsRead(notificationId: string) {
    return db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string) {
    return db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    return db.notification.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
    });
  },
};

/**
 * Achievement helpers
 */
export const achievementHelpers = {
  /**
   * Unlock achievement for user
   */
  async unlock(userId: string, achievementId: string) {
    // Check if already unlocked
    const existing = await db.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create unlock record
    const userAchievement = await db.userAchievement.create({
      data: {
        userId,
        achievementId,
        progress: 100,
        progressPercentage: 100,
      },
      include: { achievement: true },
    });

    // Update achievement stats
    await db.achievement.update({
      where: { id: achievementId },
      data: {
        totalUnlocked: { increment: 1 },
      },
    });

    // Update user stats
    await db.user.update({
      where: { id: userId },
      data: {
        totalAchievements: { increment: 1 },
        totalPoints: { increment: userAchievement.achievement.points },
      },
    });

    return userAchievement;
  },

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string) {
    return db.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  },

  /**
   * Update achievement progress
   */
  async updateProgress(userId: string, achievementId: string, progress: number) {
    const achievement = await db.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new DatabaseError('Achievement not found', DatabaseErrorType.NOT_FOUND);
    }

    // Calculate progress percentage based on requirement
    const requirement = achievement.requirement as { value?: number } | null;
    const targetValue = requirement?.value || 100;
    const progressPercentage = Math.min(100, (progress / targetValue) * 100);

    return db.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      update: {
        progress,
        progressPercentage,
      },
      create: {
        userId,
        achievementId,
        progress,
        progressPercentage,
      },
    });
  },
};

// =============================================================================
// QUERY BUILDERS
// =============================================================================

export function buildSearchWhere(
  query: string,
  fields: string[]
): { OR: Record<string, { contains: string; mode: 'insensitive' }>[] } {
  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: query,
        mode: 'insensitive' as const,
      },
    })),
  };
}

export function buildDateRangeWhere(
  field: string,
  startDate?: Date,
  endDate?: Date
): Record<string, { gte?: Date; lte?: Date }> | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    [field]: {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    },
  };
}

// =============================================================================
// LOGGING & MONITORING
// =============================================================================

export async function logSlowQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  options: { threshold?: number } = {}
): Promise<T> {
  const { threshold = 1000 } = options;
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (duration > threshold) {
      console.warn(`⚠️ Slow query detected: ${queryName} took ${duration}ms (threshold: ${threshold}ms)`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Query failed: ${queryName} after ${duration}ms`, error);
    throw error;
  }
}

// =============================================================================
// AUDIT LOG HELPERS
// =============================================================================

export const auditHelpers = {
  /**
   * Create audit log entry
   */
  async log(data: {
    userId?: string;
    action: Prisma.EnumAuditActionFilter;
    category?: string;
    entityType?: string;
    entityId?: string;
    description?: string;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return db.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action as unknown as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' | 'SETTINGS_CHANGE' | 'EXPORT_DATA' | 'IMPORT_DATA' | 'SYNC_TRIGGER' | 'SUBSCRIPTION_CHANGE' | 'API_KEY_CREATE' | 'API_KEY_DELETE' | 'TWO_FACTOR_ENABLE' | 'TWO_FACTOR_DISABLE' | 'ACCOUNT_DELETE' | 'ADMIN_ACTION',
        category: data.category,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  },

  /**
   * Get user audit logs
   */
  async getUserLogs(userId: string, options?: { limit?: number; action?: string }) {
    return db.auditLog.findMany({
      where: {
        userId,
        ...(options?.action && { action: options.action as 'LOGIN' | 'LOGOUT' }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  },
};

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    try {
      await disconnectDB();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await disconnectDB();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    console.error('❌ Unhandled rejection:', reason);
    await disconnectDB();
    process.exit(1);
  });
}

// =============================================================================
// EXPORTS SUMMARY
// =============================================================================

/**
 * This module provides:
 *
 * CLIENTS:
 * - db, prisma: Database clients
 *
 * CONNECTION:
 * - connectDB, disconnectDB, checkDatabaseHealth, pingDatabase
 *
 * TRANSACTIONS:
 * - withTransaction, batchTransaction
 *
 * PAGINATION:
 * - calculateOffset, createPaginatedResult, paginate
 *
 * ERROR HANDLING:
 * - handleDatabaseError, isDatabaseError, isUniqueConstraintError, isNotFoundError
 * - DatabaseError, DatabaseErrorType
 *
 * QUERY UTILITIES:
 * - safeQuery, withRetry, findOrNull
 *
 * SOFT DELETE:
 * - softDeleteUser, restoreUser, findActiveUsers
 *
 * MODEL HELPERS:
 * - userHelpers, platformHelpers, trackerHelpers, goalHelpers
 * - syncHelpers, notificationHelpers, achievementHelpers, auditHelpers
 *
 * QUERY BUILDERS:
 * - buildSearchWhere, buildDateRangeWhere
 *
 * MONITORING:
 * - logSlowQuery
 *
 * LIFECYCLE:
 * - setupGracefulShutdown
 */