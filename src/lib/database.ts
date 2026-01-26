import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

// Export as both `db` and `prisma` for flexibility
export const db = prisma;
export { prisma };

/**
 * Database connection utilities
 */
export async function connectDB() {
  try {
    await db.$connect();
    console.log('✓ Database connected');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDB() {
  await db.$disconnect();
}

/**
 * Future-proof alias.
 * All services should import from `db`, never directly from prisma.
 */
