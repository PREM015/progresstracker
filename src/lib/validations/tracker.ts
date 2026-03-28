// src/lib/validations/tracker.ts
// Tracker entry validation schemas

import { z } from 'zod';
import { PlatformCategory } from '@prisma/client';

export const CreateTrackerEntrySchema = z.object({
  userPlatformId: z.string().cuid('Invalid platform ID'),
  date: z.coerce.date(),
  problemsSolved: z.number().int().nonnegative().max(10000).default(0),
  minutesSpent: z.number().int().nonnegative().max(1440).default(0), // Max 24 hours
  xpEarned: z.number().int().nonnegative().max(1000000).default(0),
  category: z.nativeEnum(PlatformCategory).optional(),
  difficulty: z.object({
    easy: z.number().int().nonnegative().optional(),
    medium: z.number().int().nonnegative().optional(),
    hard: z.number().int().nonnegative().optional(),
    expert: z.number().int().nonnegative().optional(),
  }).optional(),
  topics: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  rawData: z.record(z.unknown()).optional(),
});

export const UpdateTrackerEntrySchema = CreateTrackerEntrySchema.partial().omit({ userPlatformId: true, date: true });

export const TrackerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  userPlatformId: z.string().cuid().optional(),
  platformId: z.string().cuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  category: z.nativeEnum(PlatformCategory).optional(),
  sortBy: z.enum(['date', 'problemsSolved', 'minutesSpent', 'xpEarned']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const BulkCreateTrackerSchema = z.object({
  entries: z.array(CreateTrackerEntrySchema).min(1).max(100),
});

export type CreateTrackerEntryInput = z.infer<typeof CreateTrackerEntrySchema>;
export type UpdateTrackerEntryInput = z.infer<typeof UpdateTrackerEntrySchema>;
export type TrackerQueryInput = z.infer<typeof TrackerQuerySchema>;
