// src/types/goal-template.ts
// Goal template types for pre-defined goal configurations

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type GoalTemplateCategory =
  | 'consistency'
  | 'volume'
  | 'speed'
  | 'difficulty'
  | 'platform_specific'
  | 'streak'
  | 'custom';

export type GoalTemplateDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Goal template record (matches Prisma GoalTemplate model) */
export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: GoalTemplateCategory;
  difficulty: GoalTemplateDifficulty;
  metric: string;
  defaultTarget: number;
  unit?: string | null;
  durationDays?: number | null;
  platformId?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  isPopular: boolean;
  usageCount: number;
  tags: string[];
  config?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Goal template with optional platform info */
export interface GoalTemplateWithPlatform extends GoalTemplate {
  platform?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateGoalFromTemplateInput {
  templateId: string;
  customTarget?: number;
  startDate?: Date;
  endDate?: Date;
  reminderEnabled?: boolean;
}

export interface CreateGoalTemplateInput {
  name: string;
  description?: string;
  category: GoalTemplateCategory;
  difficulty?: GoalTemplateDifficulty;
  metric: string;
  defaultTarget: number;
  unit?: string;
  durationDays?: number;
  platformId?: string;
  icon?: string;
  color?: string;
  tags?: string[];
}

export interface UpdateGoalTemplateInput extends Partial<CreateGoalTemplateInput> {
  isActive?: boolean;
  isPopular?: boolean;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface GoalTemplateQuery {
  category?: GoalTemplateCategory;
  difficulty?: GoalTemplateDifficulty;
  platformId?: string;
  search?: string;
  isActive?: boolean;
  isPopular?: boolean;
  tags?: string[];
  limit?: number;
  page?: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface GoalTemplateListResponse {
  templates: GoalTemplateWithPlatform[];
  total: number;
  featured: GoalTemplateWithPlatform[];
}

export default GoalTemplate;
