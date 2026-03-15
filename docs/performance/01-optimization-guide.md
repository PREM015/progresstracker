# ⚡ Performance Optimization Guide

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Performance Goals

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.5s | Vercel Analytics |
| Largest Contentful Paint | < 2.5s | Core Web Vitals |
| API Response Time (p95) | < 300ms | Sentry Performance |
| Dashboard Load | < 2s | Browser DevTools |

---

## 🏗️ Architecture Optimizations

### React Server Components (RSC)

Use RSC wherever possible to reduce client-side JavaScript:

```typescript
// Server Component - no JS sent to client!
async function StatsWidget({ userId }: { userId: string }) {
  const stats = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalProblems: true, currentStreak: true }
  });
  return <div>{stats.totalProblems}</div>; // Rendered server-side
}
```

### Database Query Optimization

```typescript
// ❌ N+1 query - one query per goal
const goals = await prisma.goal.findMany({ where: { userId } });
for (const goal of goals) {
  const platform = await prisma.platform.findUnique({ where: { id: goal.platformId } });
}

// ✅ Single query with join
const goals = await prisma.goal.findMany({
  where: { userId },
  include: { platform: true } // JOIN in one query
});
```

### `select` over `include`

```typescript
// ❌ Fetches entire User model (many columns)
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { name: true, email: true, currentStreak: true }
});
```

---

## 📦 Bundle Optimization

```typescript
// next.config.ts
const config: NextConfig = {
  // Analyze bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Dynamic imports for heavy libraries
      config.optimization.splitChunks = { chunks: 'all' };
    }
    return config;
  }
};
```

### Dynamic Imports for Heavy Components

```typescript
// Load charts only when needed
const ActivityHeatmap = dynamic(() => import('./ActivityHeatmap'), {
  loading: () => <Skeleton className="h-40" />,
  ssr: false, // Charts need window object
});
```

---

## 🖼️ Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={user.image}
  width={40}
  height={40}
  alt={user.name}
  // Automatically:
  // - WebP format
  // - Lazy loading
  // - Appropriate srcset
/>
```

---

## 📎 Related Docs

- [Caching Strategy](02-caching-strategy.md)
- [Load Testing](03-load-testing.md)
- [Database Indexes](../database/04-indexes-optimization.md)
