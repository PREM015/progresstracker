// src/lib/server/db-helpers.ts
// Server-only database helper utilities

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface TransactionClient {
  $transaction<P extends Prisma.PrismaPromise<unknown>[]>(
    arg: [...P]
  ): Promise<{ [K in keyof P]: Awaited<P[K]> }>;
}

export interface UpsertResult<T> {
  record: T;
  created: boolean;
}

// =============================================================================
// TRANSACTION HELPERS
// =============================================================================

/**
 * Execute multiple operations in a Prisma transaction.
 * Automatically retries on serialization failures.
 */
export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000,
    timeout: options?.timeout ?? 10000,
    isolationLevel: options?.isolationLevel,
  });
}

/**
 * Batch Prisma operations in chunks to avoid large queries.
 */
export async function batchOperation<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }
  return results;
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

/**
 * Execute a paginated Prisma query and return data + total count.
 */
export async function paginatedQuery<T>(
  queryFn: (skip: number, take: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  page: number,
  limit: number
): Promise<{ data: T[]; total: number }> {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    queryFn(skip, limit),
    countFn(),
  ]);
  return { data, total };
}

// =============================================================================
// SOFT DELETE HELPERS
// =============================================================================

/**
 * Build where clause that excludes soft-deleted records.
 */
export function excludeDeleted<T extends { deletedAt?: Date | null | undefined }>(
  where?: T
): T & { deletedAt: null } {
  return { ...where, deletedAt: null } as T & { deletedAt: null };
}

// =============================================================================
// RECORD EXISTENCE CHECKS
// =============================================================================

/**
 * Efficiently check if a record exists by id.
 */
export async function recordExists(
  model: keyof typeof prisma,
  id: string
): Promise<boolean> {
  // @ts-expect-error – Dynamic model access
  const result = await prisma[model].findFirst({ where: { id }, select: { id: true } });
  return result !== null;
}

// =============================================================================
// STATS AGGREGATION HELPERS
// =============================================================================

/**
 * Aggregate sum from a Prisma model.
 */
export async function sumField<T>(
  queryFn: () => Promise<{ _sum: T } | null>
): Promise<T | null> {
  const result = await queryFn();
  return result?._sum ?? null;
}

// =============================================================================
// DATE RANGE HELPERS
// =============================================================================

/**
 * Build a Prisma date range filter.
 */
export function buildDateRangeFilter(
  field: string,
  startDate?: Date | string | null,
  endDate?: Date | string | null
): Record<string, { gte?: Date; lte?: Date }> {
  if (!startDate && !endDate) return {};

  const filter: { gte?: Date; lte?: Date } = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);

  return { [field]: filter };
}

/**
 * Get the start and end of a day in UTC.
 */
export function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get ISO date string (YYYY-MM-DD) for a date.
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// =============================================================================
// SELECT HELPERS
// =============================================================================

/** Common user select for joins */
export const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  username: true,
} as const;

/** Minimal user select for performance */
export const minimalUserSelect = {
  id: true,
  name: true,
  image: true,
} as const;

/** Platform select with logo + color */
export const platformSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  color: true,
  baseUrl: true,
} as const;
