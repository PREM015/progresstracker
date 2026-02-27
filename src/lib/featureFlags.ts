// src/lib/featureFlags.ts
/**
 * Feature Flags service
 * Synced with Prisma schema: FeatureFlag, SubscriptionTier
 */

import { SubscriptionTier } from '@prisma/client';
import { prisma } from './prisma';
import { cache } from './redis';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  enabledForAll: boolean;
  enabledUserIds: string[];
  enabledTiers: SubscriptionTier[];
  enabledPercentage: number;
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagContext {
  userId?: string;
  tier?: SubscriptionTier;
  email?: string;
  isAdmin?: boolean;
}

// =============================================================================
// FEATURE FLAG SERVICE
// =============================================================================

class FeatureFlagService {
  private readonly CACHE_PREFIX = 'feature_flag:';
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly log = logger.child({ service: 'featureFlags' });

  /**
   * Check if a feature is enabled for a user
   */
  async isEnabled(key: string, context: FeatureFlagContext = {}): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Try cache first
      const cached = await this.getCached(key);
      const flag = cached || await this.fetchFromDb(key);

      if (!flag) {
        this.log.debug('Feature flag not found', { key });
        return false;
      }

      // Check if flag is globally disabled
      if (!flag.isEnabled) {
        return false;
      }

      // Check if enabled for all
      if (flag.enabledForAll) {
        return true;
      }

      // Check specific user
      if (context.userId && flag.enabledUserIds.includes(context.userId)) {
        return true;
      }

      // Check subscription tier
      if (context.tier && flag.enabledTiers.includes(context.tier)) {
        return true;
      }

      // Check percentage rollout
      if (flag.enabledPercentage > 0 && context.userId) {
        const hash = this.hashUserId(context.userId, key);
        if (hash < flag.enabledPercentage) {
          return true;
        }
      }

      // Admin override
      if (context.isAdmin) {
        return true;
      }

      return false;
    } catch (error) {
      this.log.error('Failed to check feature flag', { key }, error);
      return false; // Default to disabled on error
    } finally {
      this.log.debug('Feature flag check', {
        key,
        duration: Date.now() - startTime,
        userId: context.userId,
      });
    }
  }

  /**
   * Get all feature flags
   */
  async getAll(): Promise<FeatureFlagConfig[]> {
    try {
      const flags = await prisma.featureFlag.findMany({
        orderBy: { key: 'asc' },
      });

      return flags.map(this.mapToConfig);
    } catch (error) {
      this.log.error('Failed to fetch all feature flags', {}, error);
      throw error;
    }
  }

  /**
   * Get a single feature flag
   */
  async get(key: string): Promise<FeatureFlagConfig | null> {
    const flag = await this.fetchFromDb(key);
    return flag;
  }

  /**
   * Create or update a feature flag
   */
  async upsert(config: Partial<FeatureFlagConfig> & { key: string }): Promise<FeatureFlagConfig> {
    try {
      const flag = await prisma.featureFlag.upsert({
        where: { key: config.key },
        update: {
          name: config.name,
          description: config.description,
          isEnabled: config.isEnabled,
          enabledForAll: config.enabledForAll,
          enabledUserIds: config.enabledUserIds,
          enabledTiers: config.enabledTiers,
          enabledPercentage: config.enabledPercentage,
          metadata: config.metadata as object,
        },
        create: {
          key: config.key,
          name: config.name || config.key,
          description: config.description,
          isEnabled: config.isEnabled ?? false,
          enabledForAll: config.enabledForAll ?? false,
          enabledUserIds: config.enabledUserIds ?? [],
          enabledTiers: config.enabledTiers ?? [],
          enabledPercentage: config.enabledPercentage ?? 0,
          metadata: config.metadata as object,
        },
      });

      // Invalidate cache
      await this.invalidateCache(config.key);

      this.log.info('Feature flag upserted', { key: config.key });

      return this.mapToConfig(flag);
    } catch (error) {
      this.log.error('Failed to upsert feature flag', { key: config.key }, error);
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  async delete(key: string): Promise<void> {
    try {
      await prisma.featureFlag.delete({
        where: { key },
      });

      await this.invalidateCache(key);

      this.log.info('Feature flag deleted', { key });
    } catch (error) {
      this.log.error('Failed to delete feature flag', { key }, error);
      throw error;
    }
  }

  /**
   * Enable/disable a feature flag
   */
  async toggle(key: string, enabled: boolean): Promise<FeatureFlagConfig> {
    try {
      const flag = await prisma.featureFlag.update({
        where: { key },
        data: { isEnabled: enabled },
      });

      await this.invalidateCache(key);

      this.log.info('Feature flag toggled', { key, enabled });

      return this.mapToConfig(flag);
    } catch (error) {
      this.log.error('Failed to toggle feature flag', { key, enabled }, error);
      throw error;
    }
  }

  /**
   * Get all enabled features for a user
   */
  async getEnabledFeatures(context: FeatureFlagContext): Promise<string[]> {
    const allFlags = await this.getAll();
    const enabledFlags: string[] = [];

    for (const flag of allFlags) {
      if (await this.isEnabled(flag.key, context)) {
        enabledFlags.push(flag.key);
      }
    }

    return enabledFlags;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async fetchFromDb(key: string): Promise<FeatureFlagConfig | null> {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      return null;
    }

    const config = this.mapToConfig(flag);

    // Cache the result
    await this.setCache(key, config);

    return config;
  }

  private async getCached(key: string): Promise<FeatureFlagConfig | null> {
    try {
      const cached = await cache.get<FeatureFlagConfig>(`${this.CACHE_PREFIX}${key}`);
      return cached;
    } catch {
      return null;
    }
  }

  private async setCache(key: string, config: FeatureFlagConfig): Promise<void> {
    try {
      await cache.set(`${this.CACHE_PREFIX}${key}`, config, this.CACHE_TTL);
    } catch {
      // Ignore cache errors
    }
  }

  private async invalidateCache(key: string): Promise<void> {
    try {
      await cache.del(`${this.CACHE_PREFIX}${key}`);
    } catch {
      // Ignore cache errors
    }
  }

  private mapToConfig(flag: {
    key: string;
    name: string;
    description: string | null;
    isEnabled: boolean;
    enabledForAll: boolean;
    enabledUserIds: string[];
    enabledTiers: SubscriptionTier[];
    enabledPercentage: number;
    metadata: unknown;
  }): FeatureFlagConfig {
    return {
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      isEnabled: flag.isEnabled,
      enabledForAll: flag.enabledForAll,
      enabledUserIds: flag.enabledUserIds,
      enabledTiers: flag.enabledTiers,
      enabledPercentage: flag.enabledPercentage,
      metadata: flag.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Hash user ID for percentage rollout
   * Returns a number between 0 and 100
   */
  private hashUserId(userId: string, featureKey: string): number {
    const combined = `${userId}:${featureKey}`;
    let hash = 0;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash) % 100;
  }
}

// =============================================================================
// SINGLETON & CONVENIENCE METHODS
// =============================================================================

export const featureFlags = new FeatureFlagService();

/**
 * Check if a feature is enabled (convenience function)
 */
export async function isFeatureEnabled(
  key: string,
  context?: FeatureFlagContext
): Promise<boolean> {
  return featureFlags.isEnabled(key, context);
}

/**
 * Feature flag keys enum for type safety
 */
export const FeatureFlagKeys = {
  // Core features
  DARK_MODE: 'dark_mode',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_PDF: 'export_pdf',
  CUSTOM_PLATFORMS: 'custom_platforms',
  
  // Beta features
  AI_INSIGHTS: 'ai_insights',
  TEAM_FEATURES: 'team_features',
  WEBHOOKS: 'webhooks',
  API_ACCESS: 'api_access',
  
  // Experimental
  NEW_DASHBOARD: 'new_dashboard',
  REALTIME_SYNC: 'realtime_sync',
  MOBILE_APP: 'mobile_app',
} as const;

export type FeatureFlagKey = typeof FeatureFlagKeys[keyof typeof FeatureFlagKeys];

export default featureFlags;