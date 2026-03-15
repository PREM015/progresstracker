# 🏅 Leaderboard System

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

The leaderboard ranks active public users by points, streaks, or platform-specific stats.

---

## 📊 Leaderboard Types

| Type | Metric | URL |
|------|--------|-----|
| Global | Total points | `/leaderboard` |
| Streak | Current streak | `/leaderboard?by=streak` |
| LeetCode | Problems solved | `/leaderboard/platform/leetcode` |
| GitHub | Total commits | `/leaderboard/platform/github` |

---

## 🏆 Points System

Users earn points from activities:

| Activity | Points |
|----------|--------|
| Log 1 problem solved | +10 |
| Log 1 commit | +5 |
| Complete goal | +100 |
| 7-day streak | +50 |
| 30-day streak | +200 |
| Earn achievement | +25 |
| Refer a user | +150 |

---

## ⚡ Performance

Leaderboard is **cached in Redis** for 5 minutes:

```typescript
const CACHE_KEY = 'leaderboard:global:page:1';
const CACHE_TTL = 300; // 5 minutes

async function getLeaderboard(page: number) {
  const cached = await redis.get(`leaderboard:global:page:${page}`);
  if (cached) return JSON.parse(cached);
  
  const leaders = await prisma.user.findMany({
    where: { isPublic: true, isActive: true },
    orderBy: { totalPoints: 'desc' },
    take: 50, skip: (page - 1) * 50,
    select: { id: true, username: true, name: true, image: true, totalPoints: true, currentStreak: true }
  });
  
  await redis.setex(`leaderboard:global:page:${page}`, CACHE_TTL, JSON.stringify(leaders));
  return leaders;
}
```

---

## 📎 Related Docs

- [Achievements](04-achievements-gamification.md)
- [Caching Strategy](../performance/02-caching-strategy.md)
