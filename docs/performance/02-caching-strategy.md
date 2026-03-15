# 🗄️ Caching Strategy

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses **Upstash Redis** for server-side caching and **SWR** for client-side caching.

---

## 🚦 Cache Layers

| Layer | Tool | TTL | Use Case |
|-------|------|-----|----------|
| API response | Upstash Redis | 5 min | Leaderboard, stats |
| User session | NextAuth cache | 30 days | Auth session |
| Client data | SWR | stale-while-revalidate | Dashboard data |
| Static assets | Vercel CDN | 1 year | Images, JS, CSS |

---

## 🔴 Redis Cache Implementation

```typescript
// src/lib/cache.ts
import { redis } from './redis';

export async function cache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Check cache
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached as string);
  
  // Execute function
  const data = await fn();
  
  // Store in cache
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// Usage
const leaderboard = await cache(
  'leaderboard:global:page:1',
  () => prisma.user.findMany({ orderBy: { totalPoints: 'desc' }, take: 50 }),
  300 // 5 minutes
);
```

---

## 🔄 Cache Invalidation

Cache is invalidated on relevant data changes:

```typescript
// After user earns points (achievement unlock, etc.)
async function invalidateLeaderboard() {
  const keys = await redis.keys('leaderboard:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// After user updates profile
async function invalidateUserCache(userId: string) {
  await redis.del(`user:${userId}:stats`);
  await redis.del(`user:${userId}:profile`);
}
```

---

## 📊 What to Cache

| Data | Cache Key | TTL |
|------|-----------|-----|
| Leaderboard | `leaderboard:global:page:{n}` | 5 min |
| User stats | `user:{id}:stats` | 2 min |
| Platform list | `platforms:all` | 1 hour |
| Achievement list | `achievements:all` | 24 hours |

---

## 📎 Related Docs

- [Optimization Guide](01-optimization-guide.md)
- [Rate Limiting](../api/04-rate-limiting.md)
