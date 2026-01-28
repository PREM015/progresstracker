// Postgres connection pool create karne ke liye (multiple queries handle efficiently)
import { Pool } from "pg";

// Prisma ko Postgres pool ke sath connect karne wala adapter
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma client (ORM) jo DB queries run karega
import { PrismaClient } from "@prisma/client";

// globalThis me prisma store karne ke liye type define
// (taaki dev mode me hot reload ke time new PrismaClient baar baar create na ho)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PrismaClient create karne ka function
function createPrismaClient() {
  // Postgres connection pool ban raha hai
  // pool ka matlab: limited connections reuse honge (har request pe new connection nahi)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // .env se DB url lega
  });

  // PrismaPg adapter pool ko Prisma ke compatible banata hai
  const adapter = new PrismaPg(pool);

  // PrismaClient return ho raha hai with adapter
  // ab prisma queries pool ke through DB ko hit karengi
  return new PrismaClient({ adapter });
}

// Singleton Prisma instance:
// Agar global me already prisma hai toh wahi use karo,
// warna new create karo
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Dev mode me (production nahi) global variable me prisma store kar do
// taaki Next.js hot reload pe multiple PrismaClients create na ho
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
