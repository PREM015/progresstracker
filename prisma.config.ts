import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma", migrations: {
    seed: 'tsx prisma/seed.ts', // Use tsx instead of ts-node
  },


  datasource: {
    url: process.env.DATABASE_URL,
  },
});
