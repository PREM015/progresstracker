import path from 'path'
import { defineConfig } from 'prisma/config'

// Only load dotenv locally, Vercel handles env vars automatically
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv/config') } catch {}
}

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
})
