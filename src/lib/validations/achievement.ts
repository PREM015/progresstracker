// src/lib/validations/achievement.ts
import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const AchievementTierEnum = z.enum([
  'bronze',
  'silver', 
  'gold',
  'platinum',
  'diamond'
]);

export const AchievementRarityEnum = z.enum([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary'
]);

export const AchievementCategoryEnum = z.enum([
  'problems',
  'streak',
  'goals',
  'platforms',
  'consistency',
  'milestone',
  'special'
]);

export const RequirementTypeEnum = z.enum([
  'count',
  'streak',
  'goal',
  'platform',
  'special',
  'milestone',
  'compound'
]);

export const PlatformCategoryEnum = z.nativeEnum(PlatformCategory);

// =============================================================================
// REQUIREMENT SCHEMAS
// =============================================================================

export const AchievementRequirementSchema = z.object({
  type: RequirementTypeEnum,
  metric: z.string().min(1).max(100),
  value: z.number().int().positive(),
  secondaryValue: z.number().int().positive().optional(),
  platform: z.string().optional(),
  category: PlatformCategoryEnum.optional(),
  timeframe: z.enum(['day', 'week', 'month', 'year', 'all']).optional(),
});

export const AchievementThresholdSchema = z.object({
  value: z.number().int().positive(),
  label: z.string().min(1).max(50),
  tier: AchievementTierEnum.optional(),
  pointsBonus: z.number().int().nonnegative().optional(),
});

// =============================================================================
// CREATE ACHIEVEMENT SCHEMA
// =============================================================================

export const CreateAchievementSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  category: PlatformCategoryEnum,
  tier: AchievementTierEnum.default('bronze'),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
  badgeImage: z.string().url().optional(),
  points: z.number().int().min(0).max(10000).default(10),
  xpReward: z.number().int().min(0).max(50000).default(0),
  rarity: AchievementRarityEnum.default('common'),
  requirement: AchievementRequirementSchema,
  requirementText: z.string().max(200).optional(),
  thresholds: z.array(AchievementThresholdSchema).max(10).optional(),
  isHidden: z.boolean().default(false),
  isSecret: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

// =============================================================================
// UPDATE ACHIEVEMENT SCHEMA
// =============================================================================

export const UpdateAchievementSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  badgeImage: z.string().url().optional(),
  points: z.number().int().min(0).max(10000).optional(),
  xpReward: z.number().int().min(0).max(50000).optional(),
  tier: AchievementTierEnum.optional(),
  rarity: AchievementRarityEnum.optional(),
  requirement: AchievementRequirementSchema.optional(),
  requirementText: z.string().max(200).optional(),
  thresholds: z.array(AchievementThresholdSchema).max(10).optional(),
  isHidden: z.boolean().optional(),
  isSecret: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

// =============================================================================
// PARTIAL UPDATE SCHEMA (PATCH)
// =============================================================================

export const PatchAchievementSchema = UpdateAchievementSchema.partial();

// =============================================================================
// UNLOCK ACHIEVEMENT SCHEMA
// =============================================================================

export const UnlockAchievementSchema = z.object({
  achievementId: z.string().cuid('Invalid achievement ID'),
  force: z.boolean().default(false), // Admin only - force unlock without checking requirements
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const AchievementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: PlatformCategoryEnum.optional(),
  tier: AchievementTierEnum.optional(),
  rarity: AchievementRarityEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  isHidden: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['title', 'points', 'rarity', 'tier', 'createdAt', 'sortOrder']).default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
  includeSecret: z.coerce.boolean().default(false), // Admin only
});

export const ProgressQuerySchema = z.object({
  category: PlatformCategoryEnum.optional(),
  includeUnlocked: z.coerce.boolean().default(true),
  includeLocked: z.coerce.boolean().default(true),
});

export const LeaderboardQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  period: z.enum(['all', 'year', 'month', 'week']).default('all'),
});

export const RecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const PinnedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: PlatformCategoryEnum.optional(),
});

// =============================================================================
// BULK OPERATIONS SCHEMA
// =============================================================================

export const BulkUpdateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  data: UpdateAchievementSchema,
});

export const BulkDeleteSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export const BulkActivateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  isActive: z.boolean(),
});

// =============================================================================
// SYNC SCHEMA
// =============================================================================

export const SyncAchievementsSchema = z.object({
  dryRun: z.boolean().default(false),
  overwrite: z.boolean().default(false),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateAchievementInput = z.infer<typeof CreateAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof UpdateAchievementSchema>;
export type PatchAchievementInput = z.infer<typeof PatchAchievementSchema>;
export type UnlockAchievementInput = z.infer<typeof UnlockAchievementSchema>;
export type AchievementQueryInput = z.infer<typeof AchievementQuerySchema>;
export type ProgressQueryInput = z.infer<typeof ProgressQuerySchema>;
export type LeaderboardQueryInput = z.infer<typeof LeaderboardQuerySchema>;
export type RecentQueryInput = z.infer<typeof RecentQuerySchema>;
export type PinnedQueryInput = z.infer<typeof PinnedQuerySchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type BulkUpdateInput = z.infer<typeof BulkUpdateSchema>;
export type BulkDeleteInput = z.infer<typeof BulkDeleteSchema>;
export type BulkActivateInput = z.infer<typeof BulkActivateSchema>;
export type SyncAchievementsInput = z.infer<typeof SyncAchievementsSchema>;
export type AchievementRequirement = z.infer<typeof AchievementRequirementSchema>;
export type AchievementThreshold = z.infer<typeof AchievementThresholdSchema>;