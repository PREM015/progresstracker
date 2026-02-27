// src/services/platformService.ts
import { prisma, paginationArgs, buildPaginationResponse, withTransaction } from "@/lib/prisma";
import { cache } from "@/lib/redis";
import { Prisma, PlatformCategory, AuthType as PrismaAuthType, SyncStatus } from "@prisma/client";
import { encrypt, encryptJSON } from "@/lib/encryption";
import {
  platforms as staticPlatforms,
  Platform as ConfigPlatform,
  CATEGORY_TO_PRISMA,
  AUTH_TYPE_TO_PRISMA
} from "@/config/platforms";
import { ScraperFactory, StubScraper } from "./scrapers";
import { stripeService } from "@/services/stripeService";
import { ApiError } from "@/lib/apiError";

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
 * Auth type ID (lowercase for API/URL use)
 */
export type ConfigAuthType = "none" | "oauth" | "api" | "api_key" | "scraping" | "manual" | "hybrid";

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
  authType?: ConfigAuthType | string;
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
   * Helper to map config platform to prisma-like object
   */
  private static mapConfigToPrisma(p: ConfigPlatform) {
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || undefined,
      category: p.category,
      authType: p.authType,
      icon: p.icon || undefined,
      logo: p.logo || undefined,
      color: p.color || undefined,
      backgroundColor: p.backgroundColor || undefined,
      website: p.website || undefined,
      profileUrlPattern: p.profileUrlPattern || undefined,
      apiEndpoint: p.apiEndpoint || undefined,
      subcategory: undefined, // Config doesn't have subcategory yet
      setupGuideUrl: p.setupInstructions ? '/docs/setup/' + p.slug : undefined,
      helpArticleUrl: undefined,

      supportsAutoSync: p.supportsAutoSync,
      supportsOAuth: p.supportsOAuth || false,
      supportsApiKey: p.supportsApiKey || false,
      supportsWebhook: p.supportsWebhook || false,
      requiresCredentials: p.requiresCredentials || false,

      syncInterval: p.syncInterval || 1440,
      rateLimit: p.rateLimit || undefined,
      rateLimitWindow: p.rateLimitWindow || undefined,
      avgSyncDuration: undefined,

      isActive: p.isActive ?? true,
      isBeta: p.isBeta || false,
      tags: p.tags || [],
      maintenanceMode: false,
      maintenanceMessage: null,
      healthStatus: "operational",
      successRate: 100,
      totalUsers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Resolve Config ID/Slug to Database UUID
   */
  static async resolveDbId(idOrSlug: string): Promise<string | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) return idOrSlug;

    const cacheKey = `platform:slug:${idOrSlug}`;

    try {
      // Check cache first
      const cachedId = await cache.get<string>(cacheKey);
      if (cachedId) return cachedId;

      // Check DB
      const platform = await prisma.platform.findUnique({
        where: { slug: idOrSlug },
        select: { id: true }
      });

      if (platform) {
        // Cache result for 24 hours (platforms are stable)
        await cache.set(cacheKey, platform.id, 86400);
        return platform.id;
      }
    } catch (error) {
      console.error('[PlatformService] resolveDbId error:', error);
      // Fallback to DB if cache fails
      const platform = await prisma.platform.findUnique({
        where: { slug: idOrSlug },
        select: { id: true }
      });
      return platform ? platform.id : null;
    }

    return null;
  }

  /**
   * Get all platforms with optional filters (Using Static Config)
   */
  /**
   * Get all platforms with filters (Using Static Config)
   */
  static async getAllPlatforms(
    filters: PlatformFilters = {},
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const { page = 1, limit = 100, sortBy = "popularity", sortOrder = "desc" } = options;

    // Generate cache key based on options
    const cacheKey = `platforms:all:${JSON.stringify(filters)}:${JSON.stringify(options)}`;

    // Check cache
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    let allPlatforms = (await this.getAllPlatformsList()).map(p => this.mapConfigToPrisma(p));

    // Filter in memory
    let filtered = allPlatforms.filter(p => p.isActive !== false);

    if (filters.isActive !== undefined) {
      filtered = filtered.filter(p => (p.isActive ?? true) === filters.isActive);
    }

    if (filters.category) {
      // Normalize category filter
      const categoryFilters: string[] = [];
      if (Array.isArray(filters.category)) {
        categoryFilters.push(...filters.category.map(c => String(c).toLowerCase()));
      } else {
        categoryFilters.push(String(filters.category).toLowerCase());
      }

      // Match against mapped category (which is Prisma enum)
      filtered = filtered.filter(p => categoryFilters.includes(String(p.category).toLowerCase()));
    }

    if (filters.authType) {
      filtered = filtered.filter(p => p.authType === filters.authType);
    }

    if (filters.supportsAutoSync !== undefined) {
      filtered = filtered.filter(p => p.supportsAutoSync === filters.supportsAutoSync);
    }

    if (filters.supportsOAuth !== undefined) {
      filtered = filtered.filter(p => (p.supportsOAuth ?? false) === filters.supportsOAuth);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.displayName && p.displayName.toLowerCase().includes(q))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      // Default sort by popularity (simple heuristic if not present)
      const valA = (a as any)[sortBy] ?? (sortBy === 'popularity' ? 0 : '');
      const valB = (b as any)[sortBy] ?? (sortBy === 'popularity' ? 0 : '');

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const result = {
      data: paginated,
      total
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }




  /**
   * Get all platforms list (Using Static Config)
   */
  static async getAllPlatformsList(activeOnly = true) {
    let platforms = staticPlatforms;
    if (activeOnly) {
      platforms = platforms.filter(p => p.isActive !== false);
    }
    return platforms.map(p => this.mapConfigToPrisma(p));
  }

  /**
   * Get cached platform list from DB (for routes that query prisma.platform directly).
   * Returns lightweight platform records with 10-min Redis cache.
   */
  static async getCachedDbPlatforms(options?: { activeOnly?: boolean }) {
    const activeOnly = options?.activeOnly ?? true;
    const cacheKey = `platforms:db:${activeOnly ? 'active' : 'all'}`;

    const cached = await cache.get<Array<{
      id: string; slug: string; name: string; displayName: string | null;
      icon: string | null; color: string | null; category: PlatformCategory;
      supportsAutoSync: boolean; isActive: boolean;
    }>>(cacheKey);
    if (cached) return cached;

    const where = activeOnly ? { isActive: true } : {};
    const platforms = await prisma.platform.findMany({
      where,
      select: {
        id: true, slug: true, name: true, displayName: true,
        icon: true, color: true, category: true,
        supportsAutoSync: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    // Cache for 10 minutes (platforms rarely change)
    await cache.set(cacheKey, platforms, 600);
    return platforms;
  }

  /**
   * Get platforms by category (Using Static Config)
   */
  static async getPlatformsByCategory(category: PlatformCategoryId | PlatformCategory) {
    const normalizedCategory = this.normalizeCategory(category);
    const platforms = staticPlatforms.filter(p =>
      CATEGORY_TO_PRISMA[p.category] === normalizedCategory && p.isActive !== false
    );
    return platforms.map(p => this.mapConfigToPrisma(p));
  }

  /**
   * Get platform by ID
   */
  /**
   * Get platform by ID (Using Static Config)
   */
  static async getPlatformById(id: string) {
    console.log(`[PlatformService] getPlatformById called for id: ${id}. Total platforms in config: ${staticPlatforms.length}`);
    const p = staticPlatforms.find(p => p.id === id || p.slug === id);
    if (!p) console.warn(`[PlatformService] Platform not found in config for id: ${id}`);
    return p ? this.mapConfigToPrisma(p) : null;
  }

  /**
   * Get platform by slug (Using Static Config)
   */
  static async getPlatformBySlug(slug: string) {
    const p = staticPlatforms.find(p => p.slug === slug);
    return p ? this.mapConfigToPrisma(p) : null;
  }

  /**
   * Search platforms
   */
  /**
   * Search platforms (Using Static Config)
   */
  static async searchPlatforms(query: string, limit = 10) {
    const q = query.toLowerCase();
    const platforms = staticPlatforms.filter(p =>
      p.isActive !== false && (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.displayName && p.displayName.toLowerCase().includes(q))
      )
    ).slice(0, limit);

    return platforms.map(p => this.mapConfigToPrisma(p));
  }

  /**
   * Get platforms with user connection status
   */
  /**
   * Get platforms with user connection status (Using Static Config + DB)
   */
  static async getPlatformsWithConnectionStatus(
    userId: string,
    category?: PlatformCategoryId | PlatformCategory
  ): Promise<PlatformWithConnection[]> {
    const allPlatforms = staticPlatforms.filter(p => p.isActive !== false);

    const targetCategory = category ? this.normalizeCategory(category) : undefined;
    const filtered = targetCategory
      ? allPlatforms.filter(p => CATEGORY_TO_PRISMA[p.category] === targetCategory)
      : allPlatforms;

    // Get user connections from DB
    const connections = await prisma.userPlatform.findMany({
      where: { userId },
      include: { platform: true }
    });

    return filtered.map(p => {
      // Match connection by slug (or id if you prefer)
      const conn = connections.find(c => c.platform.slug === p.slug);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        displayName: p.displayName || p.name,
        category: CATEGORY_TO_PRISMA[p.category],
        icon: p.icon || null,
        color: p.color || null,
        supportsAutoSync: p.supportsAutoSync,
        isConnected: !!conn,
        connection: conn ? {
          id: conn.id,
          username: conn.username,
          isActive: conn.isActive,
          isVerified: conn.isVerified,
          syncStatus: conn.syncStatus,
          lastSyncedAt: conn.lastSyncedAt
        } : undefined
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
   * Connect platform to user (Lazy Creation Supported)
   */
  static async connectPlatform(userId: string, platformId: string, username: string | undefined, token: string | undefined, input: ConnectPlatformInput) {
    const { ...data } = input; // userId is in arg list too, careful

    // 1. Find in Config
    const configPlatform = staticPlatforms.find(p => p.id === platformId || p.slug === platformId);
    if (!configPlatform) {
      throw new Error("Platform not found in configuration");
    }

    if (configPlatform.isActive === false) {
      throw new Error("Platform is not active");
    }

    // 2. Ensure Db Record Exists (Lazy Sync)
    const category = CATEGORY_TO_PRISMA[configPlatform.category] || 'OTHER';
    const authType = AUTH_TYPE_TO_PRISMA[configPlatform.authType] || 'NONE';

    const dbPlatform = await prisma.platform.upsert({
      where: { slug: configPlatform.slug },
      update: {},
      create: {
        slug: configPlatform.slug,
        name: configPlatform.name,
        displayName: configPlatform.displayName || configPlatform.name,
        description: configPlatform.description,
        category: category,
        authType: authType,
        isActive: true,
        supportsAutoSync: configPlatform.supportsAutoSync,
        supportsOAuth: configPlatform.supportsOAuth || false,
        supportsApiKey: configPlatform.supportsApiKey || false,
        syncPriority: configPlatform.syncPriority || 0,
        syncInterval: configPlatform.syncInterval || 1440
      }
    });

    // 3. Prepare Connection Data
    let profileUrl = data.profileUrl;
    if (!profileUrl && data.username && configPlatform.profileUrlPattern) {
      profileUrl = configPlatform.profileUrlPattern.replace("{username}", data.username);
    }

    const credentialsValue = data.credentials
      ? (encryptJSON(data.credentials) as unknown as Prisma.InputJsonValue)
      : data.accessToken
        ? (encryptJSON({
          access_token: data.accessToken,
          refresh_token: data.refreshToken ?? "",
          expires_at: data.tokenExpiresAt?.toISOString() ?? null,
        }) as unknown as Prisma.InputJsonValue)
        : undefined;

    const connectionData = {
      username: data.username,
      profileUrl,
      externalUserId: data.externalUserId,

      accessToken: data.accessToken ? encrypt(data.accessToken) : null,
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      apiKey: data.apiKey ? encrypt(data.apiKey) : null,

      ...(credentialsValue !== undefined && { credentials: credentialsValue }),

      isActive: true,
      isVerified: false, // Reset verification on connect/reconnect
      verifiedAt: null,
      connectionStatus: "connected",
      autoSync: data.autoSync && configPlatform.supportsAutoSync,
      connectionError: null,
      lastSyncError: null,
    };

    // 4. Try to find existing connection
    const existing = await prisma.userPlatform.findUnique({
      where: {
        userId_platformId: {
          userId,
          platformId: dbPlatform.id
        }
      }
    });

    let connection;
    if (existing) {
      // Update existing connection
      connection = await prisma.userPlatform.update({
        where: { id: existing.id },
        data: {
          ...connectionData,
          updatedAt: new Date(),
        },
        include: { platform: true },
      });
    } else {
      // Check subscription limits ONLY for new connections
      const canAdd = await stripeService.canAddPlatform(userId);
      if (!canAdd) {
        throw new ApiError(
          'Platform limit reached. Upgrade your plan to connect more platforms.',
          403,
          'PLATFORM_LIMIT_REACHED'
        );
      }

      // Create new connection
      connection = await prisma.userPlatform.create({
        data: {
          userId,
          platformId: dbPlatform.id,
          ...connectionData,
          syncStatus: "IDLE",
        },
        include: { platform: true },
      });

      // Update stats and stripe count only for new connections
      await Promise.all([
        prisma.platform.update({
          where: { id: dbPlatform.id },
          data: { totalUsers: { increment: 1 } }
        }),
        stripeService.incrementPlatformCount(userId)
      ]);
    }

    // Get scraper status
    // Ensure scraper is loaded to check implementation status
    const scraper = await ScraperFactory.getOrLoadScraper(configPlatform.slug);

    const scraperStatus = {
      hasAutoSync: configPlatform.supportsAutoSync && ScraperFactory.isScraperWorking(configPlatform.slug),
      isImplemented: !!scraper && !(scraper instanceof StubScraper),
    };

    return {
      connection,
      scraperStatus
    };
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
        where: { id: connection.platformId },
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
      categoryStats,
      userConnections,
    ] = await Promise.all([
      prisma.platform.count({ where: { isActive: true } }),
      prisma.platform.groupBy({
        by: ["category"],
        where: { isActive: true },
        _count: true,
      }),
      prisma.userPlatform.findMany({
        where: { userId },
        include: {
          platform: {
            select: { category: true },
          },
        },
      }),
    ]);

    const connectedPlatforms = userConnections.length;
    const syncEnabledCount = userConnections.filter((c) => c.autoSync).length;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSyncCount = userConnections.filter(
      (c) => c.lastSyncedAt && c.lastSyncedAt >= oneDayAgo
    ).length;

    const byCategory: Record<string, { total: number; connected: number }> = {};

    for (const stat of categoryStats) {
      const categoryId = CATEGORY_ID_MAP[stat.category];
      if (categoryId) {
        byCategory[categoryId] = {
          total: stat._count,
          connected: 0,
        };
      }
    }

    for (const conn of userConnections) {
      const categoryId = CATEGORY_ID_MAP[conn.platform.category];
      if (categoryId && byCategory[categoryId]) {
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
    authType?: PrismaAuthType;
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
      authType: PrismaAuthType;
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