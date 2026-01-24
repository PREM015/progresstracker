import { prisma } from "./prisma";

export const db = prisma;

/**
 * Future-proof alias.
 * All services should import from `db`, never directly from prisma.
 */
