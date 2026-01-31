// src/services/platformService.ts
import { prisma, paginationArgs, buildPaginationResponse, withTransaction } from "@/lib/prisma";
import { Prisma, PlatformCategory, AuthType, SyncStatus } from "@prisma/client";
import { encrypt, encryptJSON,  } from "@/lib/encryption";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Platform category ID (lowercase for API/URL use)
 */
export type PlatformCategoryId =
  | "dsa"
  | "job"
  | "git"
  | "learning"
  | "hackathon"
  | "opensource"
  | "company"
  | "design"
  | "data_science"
  | "other";

/**
 * Map from lowercase category ID to Prisma enum
 */
export const CATEGORY_MAP: Record<PlatformCategoryId, PlatformCategory> = {
  dsa: "DSA",
  job: "JOB",
  git: "GIT",
  learning: "LEARNING",
  hackathon: "HACKATHON",
  opensource: "OPENSOURCE",
  company: "COMPANY",
  design: "DESIGN",
  data_science: "DATA_SCIENCE",
  other: "OTHER",
} as const;

/**
 * Reverse map from Prisma enum to lowercase category ID
 */
export const CATEGORY_ID_MAP: Record<PlatformCategory, PlatformCategoryId> = {
  DSA: "dsa",
  JOB: "job",
  GIT: "git",
  LEARNING: "learning",
  HACKATHON: "hackathon",
  OPENSOURCE: "opensource",
  COMPANY: "company",
  DESIGN: "design",
  DATA_SCIENCE: "data_science",
  OTHER: "other",
} as const;

export interface PlatformFilters {
  category?: PlatformCategoryId | PlatformCategory;
  categories?: (PlatformCategoryId | PlatformCategory)[];
  authType?: AuthType;
  isActive?: boolean;
  supportsAutoSync?: boolean;
  supportsOAuth?: boolean;
  search?: string;
  tags?: string[];
}

export interface ConnectPlatformInput {
  userId: string;
  platformId: string;
  username?: string;
  profileUrl?: string;
  externalUserId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  apiKey?: string;
  credentials?: Record<string, unknown>;
  autoSync?: boolean;
}

export interface UpdateConnectionInput {
  username?: string;
  profileUrl?: string;
  externalUserId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  apiKey?: string;
  credentials?: Record<string, unknown>;
  isActive?: boolean;
  autoSync?: boolean;
  syncPriority?: number;
  notifyOnSync?: boolean;
  notifyOnError?: boolean;
}

export interface CustomPlatformInput {
  userId: string;
  name: string;
  displayName?: string;
  description?: string;
  category: PlatformCategoryId | PlatformCategory;
  icon?: string;
  color?: string;
  website?: string;
  trackingFields?: Record<string, { type: string; label?: string; required?: boolean }>;
}

export interface PlatformWithConnection {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  category: PlatformCategory;
  icon: string | null;
  color: string | null;
  supportsAutoSync: boolean;
  isConnected: boolean;
  connection?: {
    id: string;
    username: string | null;
    isActive: boolean;
    isVerified: boolean;
    syncStatus: SyncStatus;
    lastSyncedAt: Date | null;
  };
}

export interface ConnectionStats {
  total: number;
  connected: number;
  remaining: number;
  byCategory: Record<string, { total: number; connected: number }>;
  syncEnabled: number;
  recentlySynced: number;
}

// =============================================================================
// PLATFORM SERVICE CLASS
// =============================================================================

export class PlatformService {
  // ===========================================================================
  // GET PLATFORMS
  // ===========================================================================

  /**
   * Get all platforms with optional filters
   */
  static async getAllPlatforms(
    filters?: PlatformFilters,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const { page = 1, limit = 100, sortBy = "name", sortOrder = "asc" } = options ?? {};

    const where: Prisma.PlatformWhereInput = {
      isActive: true,
    };

    if (filters) {
      // Handle category filter
      if (filters.category) {
        where.category = this.normalizeCategory(filters.category);
      }

      // Handle multiple categories
      if (filters.categories && filters.categories.length > 0) {
        where.category = {
          in: filters.categories.map((c) => this.normalizeCategory(c)),
        };
      }

      // Auth type
      if (filters.authType) {
        where.authType = filters.authType;
      }

      // Active status
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Auto sync support
      if (filters.supportsAutoSync !== undefined) {
        where.supportsAutoSync = filters.supportsAutoSync;
      }

      // OAuth support
      if (filters.supportsOAuth !== undefined) {
        where.supportsOAuth = filters.supportsOAuth;
      }

      // Search
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { displayName: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { slug: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      // Tags
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }
    }

    const [platforms, total] = await Promise.all([
      prisma.platform.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        ...paginationArgs(page, limit),
      }),
      prisma.platform.count({ where }),
    ]);

    return buildPaginationResponse(platforms, total, page, limit);
  }

  /**
   * Get all platforms (no pagination, for dropdowns etc.)
   */
  static async getAllPlatformsList(activeOnly = true) {
    return prisma.platform.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        displayName: true,
        category: true,
        icon: true,
        color: true,
        supportsAutoSync: true,
        supportsOAuth: true,
        authType: true,
      },
    });
  }

  /**
   * Get platforms by category
   */
  static async getPlatformsByCategory(category: PlatformCategoryId | PlatformCategory) {
    const normalizedCategory = this.normalizeCategory(category);

    return prisma.platform.findMany({
      where: {
        category: normalizedCategory,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get platform by ID
   */
  static async getPlatformById(id: string) {
    return prisma.platform.findUnique({
      where: { id },
    });
  }

  /**
   * Get platform by slug
   */
  static async getPlatformBySlug(slug: string) {
    return prisma.platform.findUnique({
      where: { slug },
    });
  }

  /**
   * Search platforms
   */
  static async searchPlatforms(query: string, limit = 10) {
    return prisma.platform.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: [query.toLowerCase()] } },
        ],
      },
      orderBy: [
        { name: "asc" },
      ],
      take: limit,
    });
  }

  /**
   * Get platforms with user connection status
   */
  static async getPlatformsWithConnectionStatus(
    userId: string,
    category?: PlatformCategoryId | PlatformCategory
  ): Promise<PlatformWithConnection[]> {
    const where: Prisma.PlatformWhereInput = {
      isActive: true,
    };

    if (category) {
      where.category = this.normalizeCategory(category);
    }

    const platforms = await prisma.platform.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        users: {
          where: { userId },
          select: {
            id: true,
            username: true,
            isActive: true,
            isVerified: true,
            syncStatus: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    return platforms.map((platform) => {
      const connection = platform.users[0];
      return {
        id: platform.id,
        slug: platform.slug,
        name: platform.name,
        displayName: platform.displayName,
        category: platform.category,
        icon: platform.icon,
        color: platform.color,
        supportsAutoSync: platform.supportsAutoSync,
        isConnected: !!connection,
        connection: connection
          ? {
              id: connection.id,
              username: connection.username,
              isActive: connection.isActive,
              isVerified: connection.isVerified,
              syncStatus: connection.syncStatus,
              lastSyncedAt: connection.lastSyncedAt,
            }
          : undefined,
      };
    });
  }

  // ===========================================================================
  // USER PLATFORM CONNECTIONS
  // ===========================================================================

  /**
   * Get user's connected platforms
   */
  static async getUserConnectedPlatforms(
    userId: string,
    options?: {
      activeOnly?: boolean;
      includeCustom?: boolean;
    }
  ) {
    const { activeOnly = false, includeCustom = true } = options ?? {};

    const where: Prisma.UserPlatformWhereInput = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    const [connections, customPlatforms] = await Promise.all([
      prisma.userPlatform.findMany({
        where,
        include: {
          platform: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      includeCustom
        ? prisma.customPlatform.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: "desc" },
          })
        : [],
    ]);

    return { connections, customPlatforms };
  }

  /**
   * Get single platform connection
   */
  static async getUserPlatformConnection(userId: string, platformId: string) {
    return prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      include: {
        platform: true,
      },
    });
  }

  /**
   * Connect platform to user
   */
  static async connectPlatform(id: string, platformId: string, username: string | undefined, token: string | undefined, input: ConnectPlatformInput) {
    const { userId, ...data } = input;

    // Check if platform exists
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new Error("Platform not found");
    }

    if (!platform.isActive) {
      throw new Error("Platform is not available");
    }

    // Check if already connected
    const existing = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    });

    if (existing) {
      throw new Error("Platform already connected");
    }

    // Build profile URL if pattern exists
    let profileUrl = data.profileUrl;
    if (!profileUrl && data.username && platform.profileUrlPattern) {
      profileUrl = platform.profileUrlPattern.replace("{username}", data.username);
    }

    // Build encrypted credentials JSON if tokens provided
const credentialsValue = data.credentials
  ? (encryptJSON(data.credentials) as unknown as Prisma.InputJsonValue)
  : data.accessToken
    ? (encryptJSON({
        access_token: data.accessToken,
        refresh_token: data.refreshToken ?? "",
        expires_at: data.tokenExpiresAt?.toISOString() ?? null,
      }) as unknown as Prisma.InputJsonValue)
    : undefined;

const connection = await prisma.userPlatform.create({
  data: {
    userId,
    platformId,
    username: data.username,
    profileUrl,
    externalUserId: data.externalUserId,

    accessToken: data.accessToken ? encrypt(data.accessToken) : null,
    refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
    tokenExpiresAt: data.tokenExpiresAt ?? null,
    apiKey: data.apiKey ? encrypt(data.apiKey) : null,

    ...(credentialsValue !== undefined && { credentials: credentialsValue }),

    isActive: true,
    isVerified: false,
    connectionStatus: "connected",
    autoSync: data.autoSync ?? platform.supportsAutoSync,
    syncStatus: "IDLE",
  },
  include: { platform: true },
});

    // Update platform stats
    await prisma.platform.update({
      where: { id: platformId },
      data: {
        totalUsers: { increment: 1 },
      },
    });

    return connection;
  }

  /**
   * Update platform connection
   */
  static async updatePlatformConnection(
    userId: string,
    platformId: string,
    data: UpdateConnectionInput
  ) {
    // Verify connection exists
    const existing = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    });

    if (!existing) {
      throw new Error("Platform not connected");
    }

    // Build update data
    const updateData: Prisma.UserPlatformUpdateInput = {
      updatedAt: new Date(),
    };
if (data.accessToken !== undefined) {
  updateData.accessToken = data.accessToken ? encrypt(data.accessToken) : null;
}

if (data.refreshToken !== undefined) {
  updateData.refreshToken = data.refreshToken ? encrypt(data.refreshToken) : null;
}

if (data.apiKey !== undefined) {
  updateData.apiKey = data.apiKey ? encrypt(data.apiKey) : null;
}

if (data.credentials !== undefined) {
 updateData.credentials = data.credentials
  ? (encryptJSON(data.credentials) as unknown as Prisma.InputJsonValue)
  : Prisma.JsonNull;

}

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.autoSync !== undefined) updateData.autoSync = data.autoSync;
    if (data.syncPriority !== undefined) updateData.syncPriority = data.syncPriority;
    if (data.notifyOnSync !== undefined) updateData.notifyOnSync = data.notifyOnSync;
    if (data.notifyOnError !== undefined) updateData.notifyOnError = data.notifyOnError;

    return prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data: updateData,
      include: {
        platform: true,
      },
    });
  }

  /**
   * Disconnect platform from user
   */
  static async disconnectPlatform(userId: string, platformId: string) {
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
    });

    if (!connection) {
      throw new Error("Platform not connected");
    }

    await withTransaction(async (tx) => {
      // Delete connection
      await tx.userPlatform.delete({
        where: {
          userId_platformId: {
            userId,
            platformId,
          },
        },
      });

      // Update platform stats
      await tx.platform.update({
        where: { id: platformId },
        data: {
          totalUsers: { decrement: 1 },
        },
      });
    });

    return { disconnected: true };
  }

  /**
   * Check if platform is connected
   */
  static async isPlatformConnected(userId: string, platformId: string): Promise<boolean> {
    const connection = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      select: { id: true },
    });

    return !!connection;
  }

  /**
   * Verify platform connection (after OAuth callback)
   */
  static async verifyConnection(userId: string, platformId: string) {
    return prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        connectionStatus: "connected",
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update connection sync status
   */
  static async updateSyncStatus(
    userId: string,
    platformId: string,
    status: SyncStatus,
    error?: string
  ) {
    const updateData: Prisma.UserPlatformUpdateInput = {
      syncStatus: status,
      updatedAt: new Date(),
    };

    if (status === "SUCCESS") {
      updateData.lastSyncedAt = new Date();
      updateData.lastSyncError = null;
      updateData.consecutiveFailures = 0;
    } else if (status === "FAILED") {
      updateData.lastSyncError = error;
      updateData.consecutiveFailures = { increment: 1 };
    }

    return prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data: updateData,
    });
  }

  /**
   * Update cached stats for a connection
   */
  static async updateCachedStats(
    userId: string,
    platformId: string,
    stats: Record<string, unknown>
  ) {
    return prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data: {
        cachedStats: stats as Prisma.InputJsonValue,
        statsUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ===========================================================================
  // CUSTOM PLATFORMS
  // ===========================================================================

  /**
   * Create a custom platform
   */
  static async createCustomPlatform(input: CustomPlatformInput) {
    const { userId, category, ...data } = input;

    // Normalize category
    const normalizedCategory = this.normalizeCategory(category);

    // Check for duplicate name
    const existing = await prisma.customPlatform.findFirst({
      where: {
        userId,
        name: { equals: data.name, mode: "insensitive" },
      },
    });

    if (existing) {
      throw new Error("A custom platform with this name already exists");
    }

    return prisma.customPlatform.create({
      data: {
        userId,
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        category: normalizedCategory,
        icon: data.icon,
        color: data.color,
        website: data.website,
        trackingFields: data.trackingFields as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  /**
   * Update a custom platform
   */
  static async updateCustomPlatform(
    id: string,
    userId: string,
    data: Partial<Omit<CustomPlatformInput, "userId">>
  ) {
    // Verify ownership
    const existing = await prisma.customPlatform.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error("Custom platform not found");
    }

    const updateData: Prisma.CustomPlatformUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) {
      updateData.category = this.normalizeCategory(data.category);
    }
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.trackingFields !== undefined) {
      updateData.trackingFields = data.trackingFields as Prisma.InputJsonValue;
    }

    return prisma.customPlatform.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a custom platform
   */
  static async deleteCustomPlatform(id: string, userId: string) {
    // Verify ownership
    const existing = await prisma.customPlatform.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error("Custom platform not found");
    }

    // Check for associated entries
    const entriesCount = await prisma.trackerEntry.count({
      where: { customPlatformId: id },
    });

    if (entriesCount > 0) {
      // Soft delete - just deactivate
      await prisma.customPlatform.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: false, deactivated: true, entriesCount };
    }

    // Hard delete if no entries
    await prisma.customPlatform.delete({
      where: { id },
    });

    return { deleted: true };
  }

  /**
   * Get user's custom platforms
   */
  static async getUserCustomPlatforms(userId: string, activeOnly = true) {
    return prisma.customPlatform.findMany({
      where: {
        userId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get connection statistics for a user
   */
  static async getConnectionStats(userId: string): Promise<ConnectionStats> {
    const [
      totalPlatforms,
      connectedPlatforms,
      categoryStats,
      syncEnabledCount,
      recentSyncCount,
    ] = await Promise.all([
      prisma.platform.count({ where: { isActive: true } }),
      prisma.userPlatform.count({ where: { userId } }),
      prisma.platform.groupBy({
        by: ["category"],
        where: { isActive: true },
        _count: true,
      }),
      prisma.userPlatform.count({
        where: { userId, autoSync: true },
      }),
      prisma.userPlatform.count({
        where: {
          userId,
          lastSyncedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    // Get connected counts by category
    const userConnections = await prisma.userPlatform.findMany({
      where: { userId },
      include: {
        platform: {
          select: { category: true },
        },
      },
    });

    const byCategory: Record<string, { total: number; connected: number }> = {};

    for (const stat of categoryStats) {
      const categoryId = CATEGORY_ID_MAP[stat.category];
      byCategory[categoryId] = {
        total: stat._count,
        connected: 0,
      };
    }

    for (const conn of userConnections) {
      const categoryId = CATEGORY_ID_MAP[conn.platform.category];
      if (byCategory[categoryId]) {
        byCategory[categoryId].connected++;
      }
    }

    return {
      total: totalPlatforms,
      connected: connectedPlatforms,
      remaining: totalPlatforms - connectedPlatforms,
      byCategory,
      syncEnabled: syncEnabledCount,
      recentlySynced: recentSyncCount,
    };
  }

  /**
   * Get platform usage statistics
   */
  static async getPlatformUsageStats(platformId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalConnections,
      activeConnections,
      syncStats,
            // ... continuing from getPlatformUsageStats
      entryStats,
    ] = await Promise.all([
      prisma.userPlatform.count({
        where: { platformId },
      }),
      prisma.userPlatform.count({
        where: { platformId, isActive: true },
      }),
      prisma.syncLog.aggregate({
        where: {
          platformId,
          createdAt: { gte: startDate },
        },
        _count: true,
        _avg: { duration: true },
      }),
      prisma.trackerEntry.aggregate({
        where: {
          platformId,
          createdAt: { gte: startDate },
        },
        _count: true,
        _sum: {
          problemsSolved: true,
          commits: true,
          timeSpent: true,
        },
      }),
    ]);

    // Get success rate
    const successfulSyncs = await prisma.syncLog.count({
      where: {
        platformId,
        createdAt: { gte: startDate },
        status: "SUCCESS",
      },
    });

    const successRate = syncStats._count > 0 
      ? (successfulSyncs / syncStats._count) * 100 
      : 100;

    return {
      totalConnections,
      activeConnections,
      inactiveConnections: totalConnections - activeConnections,
      syncStats: {
        total: syncStats._count,
        successful: successfulSyncs,
        failed: syncStats._count - successfulSyncs,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: syncStats._avg.duration ?? 0,
      },
      entryStats: {
        totalEntries: entryStats._count,
        totalProblems: entryStats._sum.problemsSolved ?? 0,
        totalCommits: entryStats._sum.commits ?? 0,
        totalTimeSpent: entryStats._sum.timeSpent ?? 0,
      },
    };
  }

  // ===========================================================================
  // SYNC HELPERS
  // ===========================================================================

  /**
   * Get platforms due for sync
   */
  static async getPlatformsDueForSync(userId?: string) {
    const now = new Date();

    const where: Prisma.UserPlatformWhereInput = {
      isActive: true,
      autoSync: true,
      OR: [
        { nextSyncAt: null },
        { nextSyncAt: { lte: now } },
      ],
      // Don't sync if recently failed too many times
      consecutiveFailures: { lt: 5 },
    };

    if (userId) {
      where.userId = userId;
    }

    return prisma.userPlatform.findMany({
      where,
      include: {
        platform: true,
        user: {
          select: {
            id: true,
            email: true,
            timezone: true,
          },
        },
      },
      orderBy: [
        { syncPriority: "desc" },
        { lastSyncedAt: "asc" },
      ],
    });
  }

  /**
   * Schedule next sync for a connection
   */
  static async scheduleNextSync(
    userId: string,
    platformId: string,
    delayMinutes?: number
  ) {
    // Get platform sync interval
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      select: { syncInterval: true },
    });

    const interval = delayMinutes ?? platform?.syncInterval ?? 1440; // Default 24 hours
    const nextSyncAt = new Date(Date.now() + interval * 60 * 1000);

    return prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data: {
        nextSyncAt,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get platforms needing OAuth token refresh
   */
  static async getPlatformsNeedingTokenRefresh(bufferMinutes = 30) {
    const threshold = new Date(Date.now() + bufferMinutes * 60 * 1000);

    return prisma.userPlatform.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: {
          not: null,
          lte: threshold,
        },
        refreshToken: { not: null },
      },
      include: {
        platform: true,
      },
    });
  }

  /**
   * Refresh OAuth tokens for a connection
   */
  static async updateTokens(
    userId: string,
    platformId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
    }
  ) {
    return prisma.userPlatform.update({
      where: {
        userId_platformId: {
          userId,
          platformId,
        },
      },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        credentials: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken ?? "",
          expires_at: tokens.expiresAt?.toISOString() ?? null,
        },
        updatedAt: new Date(),
      },
    });
  }

  // ===========================================================================
  // ADMIN FUNCTIONS
  // ===========================================================================

  /**
   * Create a new platform (admin)
   */
  static async createPlatform(data: {
    slug: string;
    name: string;
    displayName?: string;
    description?: string;
    category: PlatformCategory;
    authType?: AuthType;
    icon?: string;
    logo?: string;
    color?: string;
    website?: string;
    apiEndpoint?: string;
    profileUrlPattern?: string;
    supportsAutoSync?: boolean;
    supportsOAuth?: boolean;
    supportsApiKey?: boolean;
    syncInterval?: number;
    dataPoints?: Record<string, boolean>;
    tags?: string[];
  }) {
    // Check slug uniqueness
    const existing = await prisma.platform.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error("Platform with this slug already exists");
    }

    return prisma.platform.create({
      data: {
        slug: data.slug.toLowerCase(),
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        category: data.category,
        authType: data.authType ?? "NONE",
        icon: data.icon,
        logo: data.logo,
        color: data.color,
        website: data.website,
        apiEndpoint: data.apiEndpoint,
        profileUrlPattern: data.profileUrlPattern,
        supportsAutoSync: data.supportsAutoSync ?? false,
        supportsOAuth: data.supportsOAuth ?? false,
        supportsApiKey: data.supportsApiKey ?? false,
        syncInterval: data.syncInterval ?? 1440,
        dataPoints: data.dataPoints as Prisma.InputJsonValue,
        tags: data.tags ?? [],
        isActive: true,
        isVerified: true,
      },
    });
  }

  /**
   * Update platform (admin)
   */
  static async updatePlatform(
    id: string,
    data: Partial<{
      name: string;
      displayName: string;
      description: string;
      category: PlatformCategory;
      authType: AuthType;
      icon: string;
      logo: string;
      color: string;
      website: string;
      apiEndpoint: string;
      profileUrlPattern: string;
      supportsAutoSync: boolean;
      supportsOAuth: boolean;
      supportsApiKey: boolean;
      syncInterval: number;
      dataPoints: Record<string, boolean>;
      scraperConfig: Record<string, unknown>;
      tags: string[];
      isActive: boolean;
      isBeta: boolean;
      maintenanceMode: boolean;
      maintenanceMessage: string;
    }>
  ) {
    return prisma.platform.update({
      where: { id },
      data: {
        ...data,
        dataPoints: data.dataPoints as Prisma.InputJsonValue,
        scraperConfig: data.scraperConfig as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update platform health status (admin)
   */
  static async updatePlatformHealth(
    id: string,
    health: {
      status: string;
      message?: string;
    }
  ) {
    return prisma.platform.update({
      where: { id },
      data: {
        healthStatus: health.status,
        healthMessage: health.message,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate platform (admin)
   */
  static async deactivatePlatform(id: string, reason?: string) {
    return prisma.platform.update({
      where: { id },
      data: {
        isActive: false,
        maintenanceMode: true,
        maintenanceMessage: reason ?? "Platform is currently unavailable",
        updatedAt: new Date(),
      },
    });
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Normalize category to Prisma enum
   */
  static normalizeCategory(category: PlatformCategoryId | PlatformCategory): PlatformCategory {
    // If it's already a PlatformCategory enum value
    if (Object.values(PlatformCategory).includes(category as PlatformCategory)) {
      return category as PlatformCategory;
    }

    // Convert from lowercase ID
    const normalized = CATEGORY_MAP[category as PlatformCategoryId];
    if (!normalized) {
      throw new Error(`Invalid category: ${category}`);
    }

    return normalized;
  }

  /**
   * Get category display name
   */
  static getCategoryDisplayName(category: PlatformCategory): string {
    const displayNames: Record<PlatformCategory, string> = {
      DSA: "Data Structures & Algorithms",
      JOB: "Job Boards",
      GIT: "Version Control",
      LEARNING: "Learning Platforms",
      HACKATHON: "Hackathons",
      OPENSOURCE: "Open Source",
      COMPANY: "Company Portals",
      DESIGN: "Design",
      DATA_SCIENCE: "Data Science",
      OTHER: "Other",
    };

    return displayNames[category] ?? category;
  }

  /**
   * Get all categories with metadata
   */
  static getAllCategories() {
    return Object.entries(CATEGORY_MAP).map(([id, value]) => ({
      id: id as PlatformCategoryId,
      value,
      displayName: this.getCategoryDisplayName(value),
    }));
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export default PlatformService;