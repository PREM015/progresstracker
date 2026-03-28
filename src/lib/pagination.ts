// src/lib/pagination.ts
// Pagination utilities for API responses

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage?: number;
  previousPage?: number;
  from: number;
  to: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor: CursorMeta;
}

export interface CursorMeta {
  nextCursor?: string | null;
  previousCursor?: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  total?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Normalize and bound pagination params.
 */
export function normalizePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
  skip: number;
  take: number;
} {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

/**
 * Build pagination metadata from total count.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : undefined,
    previousPage: hasPreviousPage ? page - 1 : undefined,
    from,
    to,
  };
}

/**
 * Wrap data and count in a paginated response.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

/**
 * Get Prisma skip/take from pagination params.
 */
export function getPrismaSkipTake(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

/**
 * Build cursor-based pagination response.
 */
export function createCursorResponse<T extends { id: string }>(
  data: T[],
  limit: number,
  options?: { total?: number }
): CursorPaginatedResponse<T> {
  const hasNextPage = data.length > limit;
  const items = hasNextPage ? data.slice(0, limit) : data;
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

  return {
    data: items,
    cursor: {
      nextCursor,
      previousCursor: null,
      hasNextPage,
      hasPreviousPage: false,
      total: options?.total,
    },
  };
}

/**
 * Parse page info from URL search params.
 */
export function parsePaginationFromUrl(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);

  return {
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? DEFAULT_LIMIT : limit,
  };
}
