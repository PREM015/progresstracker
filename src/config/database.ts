// src/config/database.ts

export const DATABASE_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  poolMin: 2,
  poolMax: 10,
  ssl: process.env.NODE_ENV === 'production',
};

export const PRISMA_CONFIG = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
} as const;