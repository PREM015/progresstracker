import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { performanceTracking } from "./performanceTracking";

// =============================================================================
// PRISMA CLIENT CONFIGURATION
// =============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Create a new Prisma client with PostgreSQL adapter
 */
function createPrismaClient(): PrismaClient {
  // Connection pool configuration
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Fail after 10 seconds if can't connect
    allowExitOnIdle: true,
    // Kill any single query after 5s to prevent runaway queries
    statement_timeout: 5000,
  });

  // Handle pool errors
  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });

  // Store pool reference for cleanup
  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : [
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ],
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "minimal",
  });

  // Note: Prisma with driver adapters (PrismaPg) does not support $on('query') events.
  // For slow query tracking in production, use Prisma's $extends middleware:
  // https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions/query
  // Or use pg pool's 'query' event for raw SQL timing.
  if (process.env.NODE_ENV === "production" && globalForPrisma.pool) {
    const pool = globalForPrisma.pool;
    pool.on('connect', (client) => {
      const originalQuery = client.query.bind(client);
      // @ts-expect-error - wrapping pg client query for timing
      client.query = (...args: unknown[]) => {
        const start = Date.now();
        // @ts-expect-error - spread args to original query
        const result = originalQuery(...args);
        // pg query returns a Submittable which is promise-like at runtime
        Promise.resolve(result).then(() => {
          const duration = Date.now() - start;
          if (duration > 500) {
            console.warn(`[SLOW QUERY] ${duration}ms`, {
              query: typeof args[0] === 'string' ? args[0].substring(0, 200) : 'prepared',
              duration,
            });
          }
        }).catch(() => { /* query error handled elsewhere */ });
        return result;
      };
    });
  }

  // Add performance tracking extension
  const extendedPrisma = prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        try {
          return await query(args);
        } finally {
          const duration = performance.now() - start;
          // Use dynamic import or optional call to avoid circular dependency issues if any
          // (Though here we import at top level, assuming safe)
          if (model) {
            performanceTracking.trackDbQuery(operation, model, duration);
          }
        }
      },
    },
  });

  return extendedPrisma as unknown as PrismaClient;
}

// Create or reuse Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// =============================================================================
// DATABASE UTILITIES
// =============================================================================

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Graceful shutdown handler
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    if (globalForPrisma.pool) {
      await globalForPrisma.pool.end();
    }
    console.log("Database disconnected gracefully");
  } catch (error) {
    console.error("Error disconnecting database:", error);
    throw error;
  }
}

/**
 * Transaction helper with automatic retry
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>,
  options?: {
    maxRetries?: number;
    timeout?: number;
  }
): Promise<T> {
  const { maxRetries = 3, timeout = 10000 } = options ?? {};
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        timeout,
        maxWait: 5000,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors
      if (lastError.message.includes("Unique constraint") ||
        lastError.message.includes("Foreign key constraint")) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  throw lastError;
}

/**
 * Soft delete helper - adds deletedAt timestamp
 */
export function softDeleteFilter(
  includeDeleted = false
): { deletedAt: null } | object {
  return includeDeleted ? {} : { deletedAt: null };
}

/**
 * Pagination helper
 */
export function paginationArgs(page = 1, limit = 20): { skip: number; take: number } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Cursor-based pagination helper (efficient for large tables)
 */
export function cursorPaginationArgs(limit = 20, cursor?: string) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return {
    take: safeLimit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

/**
 * Build pagination response
 */
export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default prisma;