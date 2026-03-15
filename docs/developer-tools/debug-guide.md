# 🐛 Debug Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🔍 Debugging API Routes

### Method 1: Console Logs

```typescript
export async function POST(req: Request) {
  console.log('📥 Request received:', new Date().toISOString());
  const body = await req.json();
  console.log('📦 Body:', JSON.stringify(body, null, 2));
  
  // ... rest of handler
}
```

View logs: `npm run dev` terminal output.

### Method 2: VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## 🗄️ Debugging Database Queries

Enable Prisma query logging:

```typescript
// src/lib/database.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});
```

This logs all SQL queries to the terminal.

---

## 🔄 Debugging Sync Issues

```typescript
// Add verbose logging to sync service
async function syncPlatform(userId: string, platform: UserPlatform) {
  console.log(`🔄 Syncing ${platform.platform.name} for user ${userId}`);
  
  try {
    const result = await scraper.scrape(config);
    console.log(`✅ Scraped ${result.length} entries`);
    return result;
  } catch (error) {
    console.error(`❌ Sync failed for ${platform.platform.name}:`, error);
    throw error;
  }
}
```

---

## 🔑 Debugging Auth Issues

```typescript
// Temporary: Log session in API route
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  console.log('Session:', JSON.stringify(session, null, 2));
  // ...
}
```

Or check NextAuth debug mode:
```env
NEXTAUTH_DEBUG=true
```

---

## 📎 Related Docs

- [VS Code Config](vscode-config.md)
- [Troubleshooting](../guides/troubleshooting.md)
