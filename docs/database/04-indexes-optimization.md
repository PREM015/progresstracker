# ⚡ Indexes & Query Optimization

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker uses strategic database indexes to optimize common query patterns. This document explains the index strategy and performance considerations.

---

## 📊 Index Strategy

### User Model Indexes

```prisma
// Login queries
@@index([email, isActive])
@@index([username, isActive])

// Leaderboard queries
@@index([totalPoints(sort: Desc)])
@@index([isPublic, isActive, totalPoints(sort: Desc)], map: "idx_user_leaderboard")
@@index([longestStreak(sort: Desc)])
@@index([currentStreak])

// Admin dashboard
@@index([isBanned])
@@index([role, isActive])
@@index([onboardingCompleted])
@@index([isVerified])

// Analytics
@@index([signupSource])
@@index([lastLoginAt])
@@index([createdAt])
@@index([referralCode])
@@index([referredBy])
@@index([deletedAt])
```

### TrackerEntry Indexes

```prisma
// Dashboard queries (most common)
@@index([userId, date(sort: Desc)])
@@index([userId, platformId])
@@index([userId, isManual])

// Analytics
@@index([date])
@@index([platformId])
@@index([category])
```

### Goal Indexes

```prisma
// Active goals list
@@index([userId, status])
@@index([status, dueDate])

// Reminders job
@@index([status, dueDate])
```

---

## 🔍 Common Query Patterns

### Dashboard Load

```typescript
// Most frequent query - optimized with compound index
const entries = await prisma.trackerEntry.findMany({
  where: { userId, date: { gte: thirtyDaysAgo } },
  orderBy: { date: 'desc' },
  take: 100,
});
// Uses: @@index([userId, date(sort: Desc)])
```

### Leaderboard

```typescript
// Paginated leaderboard
const leaders = await prisma.user.findMany({
  where: { isPublic: true, isActive: true },
  orderBy: { totalPoints: 'desc' },
  take: 50,
  skip: page * 50,
});
// Uses: @@index([isPublic, isActive, totalPoints(sort: Desc)])
```

### Active Goals

```typescript
const goals = await prisma.goal.findMany({
  where: { userId, status: 'ACTIVE' },
  include: { reminders: true },
});
// Uses: @@index([userId, status])
```

---

## ⚠️ Query Performance Tips

1. **Always filter by userId first** — it's the most selective field
2. **Use `select` instead of `include`** for large models
3. **Paginate with `take` + `skip`** — never fetch unlimited rows
4. **Use Redis cache** for leaderboard and stats (recalculate every 5 min)
5. **Avoid N+1 queries** — always use `include` for relations

```typescript
// ❌ N+1 problem
const users = await prisma.user.findMany();
for (const user of users) {
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });
}

// ✅ Single query
const users = await prisma.user.findMany({
  include: { goals: true }
});
```

---

## 📎 Related Docs

- [Schema Overview](01-schema-overview.md)
- [Migrations Guide](05-migrations-guide.md)
- [Caching Strategy](../performance/02-caching-strategy.md)
