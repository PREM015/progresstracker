# 🌱 Test Data Seeding

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

The seed script populates the database with test data for development and testing.

---

## ▶️ Running the Seeder

```bash
# Reset DB and seed
npm run prisma:seed

# Or (same thing)
npx ts-node prisma/seed.ts
```

---

## 📦 What Gets Seeded

### Platforms

All supported platforms:
```typescript
const platforms = [
  { name: 'GitHub', slug: 'github', category: 'GIT', authType: 'OAUTH' },
  { name: 'LeetCode', slug: 'leetcode', category: 'DSA', authType: 'SCRAPING' },
  { name: 'HackerRank', slug: 'hackerrank', category: 'COMPANY', authType: 'API_KEY' },
  { name: 'Codeforces', slug: 'codeforces', category: 'DSA', authType: 'SCRAPING' },
  // ... 50+ more
];
```

### Test Users

```typescript
// Test user created by seed
const testUser = await prisma.user.create({
  data: {
    email: 'test@progresstracker.app',
    name: 'Test User',
    password: await bcrypt.hash('TestPass123!', 12),
    isVerified: true,
    isActive: true,
  }
});
```

### Achievements

All 50+ achievement definitions are seeded:
```typescript
const achievements = [
  { slug: 'first-flame', name: '🔥 First Flame', condition: { streak: 3 } },
  { slug: 'week-warrior', name: '⚡ Week Warrior', condition: { streak: 7 } },
  // ...
];
```

### Subscription Tiers

```typescript
const tiers = [
  { name: 'FREE', platformLimit: 3, goalLimit: 1 },
  { name: 'STARTER', platformLimit: 10, goalLimit: 5 },
  { name: 'PRO', platformLimit: -1, goalLimit: -1 }, // -1 = unlimited
  // ...
];
```

---

## 🧪 Demo Data for Development

```bash
# Create demo entries for testing dashboard
npx ts-node scripts/createDemoData.ts --userId <your-user-id>
```

This creates:
- 90 days of tracker entries
- 5 active goals (various states)
- 10 earned achievements
- Connected platforms (GitHub, LeetCode)

---

## 📎 Related Docs

- [Local Setup](../deployment/01-local-setup.md)
- [Testing Strategy](01-testing-strategy.md)
