
import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';

// Common Schemas
export const idSchema = z.string().cuid('Invalid ID format');

// Activity Form Schemas
export const createActivitySchema = z.object({
    date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).transform(val => new Date(val).toISOString()),
    category: z.nativeEnum(PlatformCategory).default(PlatformCategory.OTHER),
    description: z.string().max(2000).optional().nullable(),
    timeSpent: z.number().int().min(0).default(0),
    platformId: z.string().optional().nullable(),
    customPlatformId: z.string().optional().nullable(),

    // Optional specific metrics
    problemsSolved: z.number().int().min(0).optional(),
    linesOfCode: z.number().int().min(0).optional(),
    pagesRead: z.number().int().min(0).optional(), // mapped to customFields or existing fields if reliable

    tags: z.array(z.string()).optional(),
    mood: z.string().optional(),
    productivityRating: z.number().min(1).max(5).optional(),
});

export const updateActivitySchema = createActivitySchema.partial();

// Query Schema
export const queryActivitySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.nativeEnum(PlatformCategory).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['date', 'createdAt', 'timeSpent']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
