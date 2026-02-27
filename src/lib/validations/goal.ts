
import { z } from 'zod';
import { GoalStatus, GoalType, GoalMetric, PlatformCategory } from '@prisma/client';

// Common Schemas
export const idSchema = z.string().cuid('Invalid ID format');

// Goal Form Schemas
export const createGoalSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
    description: z.string().max(2000).optional().nullable(),
    category: z.nativeEnum(PlatformCategory),
    goalType: z.nativeEnum(GoalType).default(GoalType.CUSTOM),
    metric: z.nativeEnum(GoalMetric).default(GoalMetric.PROBLEMS_SOLVED),
    customMetric: z.string().max(100).optional().nullable(),
    target: z.number().int().positive('Target must be positive').max(1000000),
    unit: z.string().max(50).optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    platformId: z.string().cuid().optional().nullable(),
    requiredStreakDays: z.number().int().positive().optional().nullable(),
    reminderEnabled: z.boolean().default(false),
    isPublic: z.boolean().default(false),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    icon: z.string().max(50).optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
    status: z.nativeEnum(GoalStatus).optional(),
    progress: z.number().int().min(0).optional(),
});

export const bulkUpdateSchema = z.object({
    ids: z.array(z.string().cuid()).min(1).max(50),
    data: z.object({
        status: z.nativeEnum(GoalStatus).optional(),
        reminderEnabled: z.boolean().optional(),
        isPublic: z.boolean().optional(),
    }),
});

// Query Schema
export const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(GoalStatus).optional(),
    type: z.nativeEnum(GoalType).optional(),
    category: z.nativeEnum(PlatformCategory).optional(),
    platformId: z.string().cuid().optional(),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'deadline', 'progress', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    includeArchived: z.coerce.boolean().default(false),
});
